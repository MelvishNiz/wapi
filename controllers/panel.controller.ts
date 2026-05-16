import staticPlugin from "@elysiajs/static";
// import { file } from "bun";
import Elysia, { file, sse, status, t } from "elysia";
import { data, requestWhatsAppPairingCode, sock } from "../lib/baileys";
import { BasicAuthPlugin } from "../plugins/basic-auth";
import { GroupBotService } from "../services/group-bot.service";
import { Helper } from "../utils/helper";

const getState = () => {
  const user = sock.user || null;
  let state = "NOT_READY";
  if (!user && (data.qr || data.pairingCode)) state = "AUTH_REQUIRED";
  else if (user) state = "READY";
  return state as "READY" | "NOT_READY" | "AUTH_REQUIRED";
};
const getPairingStatus = () => ({
  code: data.pairingCode || "",
  phone_number: data.pairingPhoneNumber || "",
  requested_at: data.pairingRequestedAt || null,
});
const getPanelStatus = () => {
  const user = sock.user || null;
  return {
    state: getState(),
    user: {
      id: user?.id || null,
      name: user?.name || null,
      lid: user?.lid || null,
    },
    connection: data.connection || null,
    qr_code: data.qr || "",
    pairing: getPairingStatus(),
  };
};

export const PanelController = new Elysia()
  // Basic Auth
  .use(BasicAuthPlugin())
  // Panel API, protected by Basic Auth. ACCESS_TOKEN stays server-side.
  .get("/panel/api/status", () => getPanelStatus())
  .get("/panel/sse", async function* () {
    while (true) {
      yield sse({ event: "message", data: getPanelStatus() });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  })
  .post(
    "/panel/api/pairing-code",
    async ({ body }) => {
      const state = getState();
      if (state === "READY") throw status(409, "WhatsApp session is already connected");

      const phoneNumber = body.phone_number.replace(/\D/g, "");
      const { isValid } = Helper.validatePhoneNumber(phoneNumber);
      if (!isValid) throw status(422, `Invalid phone number format ${body.phone_number}`);

      const pairing = await requestWhatsAppPairingCode(phoneNumber);
      return {
        message: "Pairing code generated",
        pairing_code: pairing.pairingCode,
        phone_number: pairing.phoneNumber,
      };
    },
    {
      body: t.Object({
        phone_number: t.String({ minLength: 8 }),
      }),
    },
  )
  .post("/panel/api/restart", () => {
    setTimeout(() => {
      process.exit();
    }, 1000);
    return { message: "Restart Success" };
  })
  .post("/panel/api/logout", async () => {
    await sock.logout();
    return { message: "Logout Success" };
  })
  .post(
    "/panel/api/send-message",
    async ({ body }) => {
      const state = getState();
      if (state !== "READY") throw status(500, "Not ready");
      const { isValid, international } = Helper.validatePhoneNumber(body.to);
      if (!isValid || !international) throw status(422, `Invalid phone number format ${body.to}`);

      await sock.sendMessage(Helper.toJid(body.to), { text: body.message });
      return { message: `Message sent to ${body.to}` };
    },
    {
      body: t.Object({
        to: t.String(),
        message: t.String(),
      }),
    },
  )
  .get("/panel/api/group-bot/commands", async () => ({ commands: await GroupBotService.listCommands() }))
  .get("/panel/api/group-bot/settings", async () => ({ settings: await GroupBotService.getSettings() }))
  .put(
    "/panel/api/group-bot/settings",
    async ({ body }) => {
      const settings = await GroupBotService.updateSettings(body);
      return { message: "Settings updated", settings };
    },
    {
      body: t.Object({
        adminWhitelist: t.Array(t.String()),
      }),
    },
  )
  .post(
    "/panel/api/group-bot/commands",
    async ({ body }) => {
      try {
        const command = await GroupBotService.createCommand(body);
        return { message: "Command created", command };
      } catch (err: any) {
        throw status(err?.message?.includes("Maximum") ? 409 : 422, err?.message || "Invalid command");
      }
    },
    {
      body: t.Object({
        trigger: t.String({ minLength: 1, maxLength: 64 }),
        type: t.Optional(t.Union([t.Literal("text"), t.Literal("webhook")])),
        response: t.Optional(t.String({ maxLength: 4000 })),
        description: t.Optional(t.String({ maxLength: 160 })),
        webhookUrl: t.Optional(t.String()),
        webhookMethod: t.Optional(t.Union([t.Literal("GET"), t.Literal("POST")])),
        webhookBody: t.Optional(t.String({ maxLength: 8000 })),
        webhookQuery: t.Optional(t.Array(t.Object({ key: t.String(), value: t.String(), enabled: t.Boolean() }))),
        webhookReply: t.Optional(t.Boolean()),
        enabled: t.Optional(t.Boolean()),
        exactMatch: t.Optional(t.Boolean()),
      }),
    },
  )
  .put(
    "/panel/api/group-bot/commands/:id",
    async ({ params, body }) => {
      try {
        const command = await GroupBotService.updateCommand(params.id, body);
        return { message: "Command updated", command };
      } catch (err: any) {
        throw status(err?.message === "Command not found" ? 404 : 422, err?.message || "Invalid command");
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        trigger: t.String({ minLength: 1, maxLength: 64 }),
        type: t.Optional(t.Union([t.Literal("text"), t.Literal("webhook")])),
        response: t.Optional(t.String({ maxLength: 4000 })),
        description: t.Optional(t.String({ maxLength: 160 })),
        webhookUrl: t.Optional(t.String()),
        webhookMethod: t.Optional(t.Union([t.Literal("GET"), t.Literal("POST")])),
        webhookBody: t.Optional(t.String({ maxLength: 8000 })),
        webhookQuery: t.Optional(t.Array(t.Object({ key: t.String(), value: t.String(), enabled: t.Boolean() }))),
        webhookReply: t.Optional(t.Boolean()),
        enabled: t.Optional(t.Boolean()),
        exactMatch: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete(
    "/panel/api/group-bot/commands/:id",
    async ({ params }) => {
      try {
        await GroupBotService.deleteCommand(params.id);
        return { message: "Command deleted" };
      } catch (err: any) {
        throw status(404, err?.message || "Command not found");
      }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  // Panel
  .get("/panel", file("./dist/index.html"))
  .get("/bot-commands", file("./dist/index.html"))
  .get("/runtime-config.js", file("./dist/runtime-config.js"))
  // Static Files
  .use(staticPlugin({ prefix: "/assets", assets: "./dist/assets" }));
