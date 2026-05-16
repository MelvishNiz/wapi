import "dotenv/config";
import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import Long from "long";
import { logger } from "./lib/logger";
import { LoggerPlugin } from "./plugins/logger";
import { OpenApiPlugin } from "./plugins/openapi";

(globalThis as typeof globalThis & { Long: typeof Long }).Long = Long;

const [{ ApiController }, { PanelController }] = await Promise.all([import("./controllers/api.controller"), import("./controllers/panel.controller")]);

const app = new Elysia()
  // Plugins
  .use(cors())
  .use(LoggerPlugin())
  .use(OpenApiPlugin())
  // Controllers
  .use(ApiController)
  .use(PanelController)
  // Listen Port
  .listen(3000);

logger.info(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
