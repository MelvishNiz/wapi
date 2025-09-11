import Elysia, { status, t } from "elysia";
import { data, sock } from "../lib/baileys";
import { AccessTokenPlugin } from "../plugins/access-token";
import { Helper } from "../utils/helper";

const getState = () => {
  const user = sock.user || null;
  let state = "NOT_READY";
  if (!user && data.qr) state = "AUTH_REQUIRED";
  else if (user) state = "READY";
  return state as "READY" | "NOT_READY" | "AUTH_REQUIRED";
};

export const ApiController = new Elysia({ prefix: "/api" })
  // Access Token Plugins
  .use(AccessTokenPlugin())
  // Get Status
  .get(
    "/status",
    async () => {
      const state = getState();
      const user = sock.user || null;

      return {
        state,
        user: {
          id: user?.id || null,
          name: user?.name || null,
          lid: user?.lid || null,
        },
        connection: data.connection || null,
        qr_code: data.qr || "",
      };
    },
    {
      headers: t.Object({
        access_token: t.String(),
      }),
      response: {
        200: t.Object({
          state: t.String(),
          user: t.MaybeEmpty(
            t.Object({
              id: t.MaybeEmpty(t.String()),
              name: t.MaybeEmpty(t.String()),
              lid: t.MaybeEmpty(t.String()),
            }),
          ),
          qr_code: t.Nullable(t.String()),
        }),
      },
    },
  )
  // Send Message
  .post(
    "/send-message",
    async ({ body }) => {
      const state = getState();
      if (state !== "READY") throw status(500, "Not ready");
      await sock.sendMessage(Helper.toJid(body.to), { text: body.message });

      return {
        message: `Message sent to ${body.to}`,
      };
    },
    {
      headers: t.Object({
        access_token: t.String(),
      }),
      body: t.Object({
        to: t.String(),
        message: t.String(),
      }),
      response: {
        200: t.Object({
          message: t.String(),
        }),
      },
    },
  )
  .post(
    "/restart",
    () => {
      setTimeout(() => {
        process.exit();
      }, 300);
      return {
        message: "Restart Success",
      };
    },
    {
      response: t.Object({
        message: t.String(),
      }),
    },
  )
  // Logout
  .post(
    "/logout",
    async () => {
      await sock.logout();

      return {
        message: `Logout Success`,
      };
    },
    {
      headers: t.Object({
        access_token: t.String(),
      }),
      response: {
        200: t.Object({
          message: t.String(),
        }),
      },
    },
  );
