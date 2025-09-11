import staticPlugin from "@elysiajs/static";
// import { file } from "bun";
import Elysia, { file } from "elysia";
import { BasicAuthPlugin } from "../plugins/basic-auth";

export const PanelController = new Elysia()
  // Basic Auth
  .use(BasicAuthPlugin())
  // Panel
  .get("/panel", file("./dist/index.html"))
  // Static Files
  .use(staticPlugin({ prefix: "/assets", assets: "./dist/assets" }));
