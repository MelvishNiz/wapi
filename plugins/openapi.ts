import openapi from "@elysiajs/openapi";
import Elysia from "elysia";
import pkg from "../package.json";
import { BasicAuthPlugin } from "./basic-auth";

const excludedPaths = [
  "/",
  "/*",
  "/panel",
  "/panel/api/status",
  "/panel/sse",
  "/panel/api/pairing-code",
  "/panel/api/restart",
  "/panel/api/logout",
  "/panel/api/send-message",
  "/panel/api/group-bot/commands",
  "/panel/api/group-bot/commands/:id",
  "/panel/api/group-bot/settings",
  "/bot-commands",
  "/runtime-config.js",
  "/assets/*",
];

export const OpenApiPlugin = () =>
  new Elysia()
    // Basic Auth
    .use(BasicAuthPlugin())
    // Openapi
    .use(
      openapi({
        exclude: {
          paths: excludedPaths,
        },
        documentation: {
          info: {
            title: `${pkg.title} | Documentation`,
            description: pkg.description,
            version: pkg.version,
          },
          components: {
            securitySchemes: {
              ACCESS_TOKEN: {
                type: "apiKey",
                in: "header",
                name: "ACCESS_TOKEN",
              },
            },
          },
          security: [{ ACCESS_TOKEN: [] }],
        },
      }),
    );
