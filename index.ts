import "dotenv/config";
import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { ApiController } from "./controllers/api.controller";
import { PanelController } from "./controllers/panel.controller";
import { StreamController } from "./controllers/stream.controller";
import { logger } from "./lib/logger";
import { LoggerPlugin } from "./plugins/logger";
import { OpenApiPlugin } from "./plugins/openapi";

const app = new Elysia()
  // Plugins
  .use(cors())
  .use(LoggerPlugin())
  .use(OpenApiPlugin())
  // Controllers
  .use(ApiController)
  .use(StreamController)
  .use(PanelController)
  // Listen Port
  .listen(3000);

logger.info(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
