import { rm } from "node:fs/promises";
import NodeCache from "@cacheable/node-cache";
import type { Boom } from "@hapi/boom";
import makeWASocket, {
  type CacheStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  normalizeMessageContent,
  useMultiFileAuthState,
  type WAConnectionState,
  type WAMessage,
} from "baileys";
import { logger } from "./logger";

const savePath = "./credentials/auth_save";
const msgRetryCounterCache = new NodeCache() as CacheStore;
const { state, saveCreds } = await useMultiFileAuthState(savePath);
const adminWhitelist = new Set(
  (process.env.ADMIN_WHITELIST || process.env.WHITELIST_ADMINS || process.env.WHATSAPP_ADMIN_WHITELIST || "")
    .split(",")
    .map((admin) => normalizeAdminJid(admin))
    .filter((admin) => admin.length > 0),
);

function normalizeAdminJid(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.includes("@")) return jidNormalizedUser(normalized);

  const phone = normalized.replace(/\D/g, "");
  return phone ? `${phone}@s.whatsapp.net` : "";
}

function getMessageText(message: WAMessage) {
  const content = normalizeMessageContent(message.message);

  return (content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || content?.documentMessage?.caption || "").trim();
}

function getSenderJids(message: WAMessage) {
  const senderJids = [message.key.participant, message.key.participantAlt, message.key.participantUsername].filter(Boolean) as string[];

  return senderJids.map((jid) => jidNormalizedUser(jid));
}

function isWhitelistedAdmin(message: WAMessage) {
  if (adminWhitelist.size === 0) return false;
  return getSenderJids(message).some((jid) => adminWhitelist.has(jid));
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.TZ || "Asia/Jakarta",
  }).format(new Date(timestamp * 1000));
}

const start = async () => {
  const data: { connection: WAConnectionState | undefined; qr: string | undefined } = {
    connection: undefined,
    qr: undefined,
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
      // reconnect if not logged out
      if ((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
        process.exit();
      } else {
        logger.info("Connection closed. You are logged out.");
        await rm(savePath, { recursive: true, force: true });
        process.exit();
      }
    } else if (!connection && qr) {
      logger.info(`Auth Required scan qrcode`);
    }
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const message of messages) {
      const groupJid = message.key.remoteJid;
      if (!groupJid?.endsWith("@g.us") || message.key.fromMe) continue;
      if (getMessageText(message).toLowerCase() !== "/info") continue;
      if (!isWhitelistedAdmin(message)) continue;

      try {
        const metadata = await sock.groupMetadata(groupJid);
        const participantCount = metadata.participants?.length || metadata.size || 0;
        const adminCount = metadata.participants?.filter((participant) => participant.admin || participant.isAdmin || participant.isSuperAdmin).length || 0;
        const description = metadata.desc?.trim() || "-";
        const text = [
          "Info Group",
          `Nama: ${metadata.subject || "-"}`,
          `Group ID: ${metadata.id || groupJid}`,
          `Owner: ${metadata.owner || metadata.ownerPn || "-"}`,
          `Dibuat: ${formatDate(metadata.creation)}`,
          `Peserta: ${participantCount}`,
          `Admin: ${adminCount}`,
          `Mode kirim pesan: ${metadata.announce ? "Hanya admin" : "Semua peserta"}`,
          `Mode edit info: ${metadata.restrict ? "Hanya admin" : "Semua peserta"}`,
          `Deskripsi: ${description}`,
        ].join("\n");

        await sock.sendMessage(groupJid, { text }, { quoted: message });
      } catch (err: any) {
        logger.error({ err, groupJid }, "Failed to reply group info");
      }
    }
  });

  return {
    sock,
    data,
  };
};

export const { sock, data } = await start();
