import Elysia from "elysia";
import { logger } from "../lib/logger";

export const LoggerPlugin = () =>
  new Elysia().onRequest(({ request }) => {
    const method = request.method.padEnd(4);
    const url = new URL(request.url).pathname;
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "-";
    logger.info(`${method} | ${url} | ${ip}`);
  });
