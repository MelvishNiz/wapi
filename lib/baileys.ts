import { rm } from "node:fs/promises";
import NodeCache from "@cacheable/node-cache";
import type { Boom } from "@hapi/boom";
import makeWASocket, { type CacheStore, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, useMultiFileAuthState, type WAConnectionState, type WAMessage } from "baileys";
import { GroupBotService } from "../services/group-bot.service";
import { logger } from "./logger";

const savePath = "./credentials/auth_save";
const msgRetryCounterCache = new NodeCache() as CacheStore;
const processedCommandCache = new NodeCache({ stdTTL: 300 }) as CacheStore;
const { state, saveCreds } = await useMultiFileAuthState(savePath);
const startedAt = Math.floor(Date.now() / 1000);

function getMessageTimestamp(message: WAMessage) {
  const timestamp = message.messageTimestamp;
  if (!timestamp) return 0;
  if (typeof timestamp === "number") return timestamp;
  return Number(timestamp);
}

function isNewMessage(message: WAMessage) {
  const timestamp = getMessageTimestamp(message);
  return !timestamp || timestamp >= startedAt - 30;
}

function hasProcessedCommand(message: WAMessage) {
  const cacheKey = `${message.key.remoteJid || ""}:${message.key.id || ""}`;
  if (!message.key.id) return false;
  if (processedCommandCache.get(cacheKey)) return true;

  processedCommandCache.set(cacheKey, true);
  return false;
}

const start = async () => {
  const data: { connection: WAConnectionState | undefined; qr: string | undefined; pairingCode: string | undefined; pairingPhoneNumber: string | undefined; pairingRequestedAt: number | undefined } = {
    connection: undefined,
    qr: undefined,
    pairingCode: undefined,
    pairingPhoneNumber: undefined,
    pairingRequestedAt: undefined,
  };
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    shouldSyncHistoryMessage: () => false,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    data.qr = qr;
    data.connection = connection;
    logger.info(`Connection Status: ${connection}`);

    if (connection === "close") {
      data.pairingCode = undefined;
      data.pairingPhoneNumber = undefined;
      data.pairingRequestedAt = undefined;
      // reconnect if not logged out
      if ((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
        process.exit();
      } else {
        logger.info("Connection closed. You are logged out.");
        await rm(savePath, { recursive: true, force: true });
        process.exit();
      }
    } else if (connection === "open") {
      data.qr = undefined;
      data.pairingCode = undefined;
      data.pairingPhoneNumber = undefined;
      data.pairingRequestedAt = undefined;
    } else if (!connection && qr) {
      logger.info(`Auth Required scan qrcode`);
    }
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    for (const message of messages) {
      const groupJid = message.key.remoteJid;
      if (!groupJid?.endsWith("@g.us")) continue;
      if (type !== "notify" && !message.key.fromMe) continue;
      if (!isNewMessage(message)) continue;
      if (!GroupBotService.getMessageText(message).startsWith("/")) continue;
      if (hasProcessedCommand(message)) continue;
      if (!(await GroupBotService.isSenderAllowed(message))) continue;

      try {
        const metadata = await sock.groupMetadata(groupJid);
        const reply = await GroupBotService.buildReply(message, groupJid, metadata);
        if (!reply?.text) continue;

        await sock.sendMessage(groupJid, { text: reply.text }, { quoted: message });
      } catch (err: any) {
        logger.error({ err, groupJid }, "Failed to process group bot command");
      }
    }
  });

  return {
    sock,
    data,
  };
};

export const { sock, data } = await start();

export const requestWhatsAppPairingCode = async (phoneNumber: string) => {
  if (sock.authState.creds.registered || sock.user) {
    throw new Error("WhatsApp session is already connected");
  }

  const normalizedPhoneNumber = phoneNumber.replace(/\D/g, "");
  if (!normalizedPhoneNumber) throw new Error("Phone number is required");

  const pairingCode = await sock.requestPairingCode(normalizedPhoneNumber);
  data.pairingCode = pairingCode;
  data.pairingPhoneNumber = normalizedPhoneNumber;
  data.pairingRequestedAt = Date.now();

  return {
    pairingCode,
    phoneNumber: normalizedPhoneNumber,
  };
};
