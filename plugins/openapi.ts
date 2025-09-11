import openapi from "@elysiajs/openapi";
import Elysia from "elysia";
import pkg from "../package.json";
import { BasicAuthPlugin } from "./basic-auth";

export const OpenApiPlugin = () =>
  new Elysia()
    // Basic Auth
    .use(BasicAuthPlugin())
    // Openapi
    .use(
      openapi({
        exclude: {
          paths: ["/", "/*", "/panel", "/panel/*", "/assets/*"],
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
