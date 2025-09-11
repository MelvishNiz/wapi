import { rm } from "node:fs/promises";
import NodeCache from "@cacheable/node-cache";
import type { Boom } from "@hapi/boom";
import makeWASocket, { type CacheStore, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, useMultiFileAuthState, type WAConnectionState } from "baileys";
import { logger } from "./logger";

const savePath = "./credentials/auth_save";
const msgRetryCounterCache = new NodeCache() as CacheStore;
const { state, saveCreds } = await useMultiFileAuthState(savePath);

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

  return {
    sock,
    data,
  };
};

export const { sock, data } = await start();
