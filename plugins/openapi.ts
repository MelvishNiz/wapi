import openapi from "@elysiajs/openapi";
import Elysia from "elysia";
import { BasicAuthPlugin } from "./basic-auth";

export const OpenApiPlugin = () =>
  new Elysia()
    // Basic Auth
    .use(BasicAuthPlugin())
    // Openapi
    .use(
      openapi({
        exclude: {
          paths: ["/panel", "/panel/*"],
        },
      }),
    );
