import Elysia, { status, t } from "elysia";
import { data, requestWhatsAppPairingCode, sock } from "../lib/baileys";
import { AccessTokenPlugin } from "../plugins/access-token";
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
        pairing: getPairingStatus(),
      };
    },
    {
      detail: { description: "Get status WhatsApp Client", security: [{ ACCESS_TOKEN: [] }] },
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
          pairing: t.Object({
            code: t.String(),
            phone_number: t.String(),
            requested_at: t.Nullable(t.Number()),
          }),
        }),
      },
    },
  )
  // Request Pairing Code
  .post(
    "/pairing-code",
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
      detail: { description: "Request WhatsApp pairing code by phone number", security: [{ ACCESS_TOKEN: [] }] },
      body: t.Object({
        phone_number: t.String({ minLength: 8 }),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          pairing_code: t.String(),
          phone_number: t.String(),
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
      const { isValid, international } = Helper.validatePhoneNumber(body.to);
      if (!isValid || !international) throw status(422, `Invalid phone number format ${body.to}`);

      if (body.message) {
        await sock.sendMessage(Helper.toJid(body.to), {
          text: body.message,
        });
      }
      if (body.document) {
        await sock.sendMessage(Helper.toJid(body.to), {
          document: Buffer.from(await body.document.arrayBuffer()),
          mimetype: body.document.type || "application/octet-stream",
          fileName: body.document.name || "file",
        });
      }

      return {
        message: `Message sent to ${body.to}`,
      };
    },
    {
      detail: { description: "Send text message", security: [{ ACCESS_TOKEN: [] }] },
      body: t.Union([
        t.Object({
          to: t.String(),
          message: t.String(),
          document: t.Optional(t.File()),
        }),
        t.Object({
          to: t.String(),
          message: t.Optional(t.String()),
          document: t.File(),
        }),
      ]),
      response: {
        200: t.Object({
          message: t.String(),
        }),
      },
    },
  )
  // Send Group Message
  .post(
    "/send-group-message",
    async ({ body }) => {
      const state = getState();
      if (state !== "READY") throw status(500, "Not ready");
      if (!Helper.validateGroupJid(body.group_id)) throw status(422, `Invalid group id format ${body.group_id}`);

      const groupJid = Helper.toGroupJid(body.group_id);

      if (body.message) {
        await sock.sendMessage(groupJid, {
          text: body.message,
        });
      }
      if (body.document) {
        await sock.sendMessage(groupJid, {
          document: Buffer.from(await body.document.arrayBuffer()),
          mimetype: body.document.type || "application/octet-stream",
          fileName: body.document.name || "file",
        });
      }

      return {
        message: `Message sent to group ${groupJid}`,
      };
    },
    {
      detail: { description: "Send text message to WhatsApp group", security: [{ ACCESS_TOKEN: [] }] },
      body: t.Union([
        t.Object({
          group_id: t.String(),
          message: t.String(),
          document: t.Optional(t.File()),
        }),
        t.Object({
          group_id: t.String(),
          message: t.Optional(t.String()),
          document: t.File(),
        }),
      ]),
      response: {
        200: t.Object({
          message: t.String(),
        }),
      },
    },
  )
  // Restart
  .post(
    "/restart",
    () => {
      setTimeout(() => {
        process.exit();
      }, 1000);
      return {
        message: "Restart Success",
      };
    },
    {
      detail: { description: "Restart WhatsApp Client", security: [{ ACCESS_TOKEN: [] }] },
      response: {
        200: t.Object({
          message: t.String(),
        }),
      },
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
      detail: { description: "Logout WhatsApp Client", security: [{ ACCESS_TOKEN: [] }] },
      response: {
        200: t.Object({
          message: t.String(),
        }),
      },
    },
  )
  // List Group Bot Commands
  .get(
    "/group-bot/commands",
    async () => {
      return {
        commands: await GroupBotService.listCommands(),
      };
    },
    {
      detail: { description: "List dynamic WhatsApp group bot commands", security: [{ ACCESS_TOKEN: [] }] },
    },
  )
  // Get Group Bot Settings
  .get(
    "/group-bot/settings",
    async () => {
      return {
        settings: await GroupBotService.getSettings(),
      };
    },
    {
      detail: { description: "Get dynamic WhatsApp group bot settings", security: [{ ACCESS_TOKEN: [] }] },
    },
  )
  // Update Group Bot Settings
  .put(
    "/group-bot/settings",
    async ({ body }) => {
      const settings = await GroupBotService.updateSettings(body);
      return { message: "Settings updated", settings };
    },
    {
      detail: { description: "Update dynamic WhatsApp group bot settings", security: [{ ACCESS_TOKEN: [] }] },
      body: t.Object({
        adminWhitelist: t.Array(t.String()),
      }),
    },
  )
  // Create Group Bot Command
  .post(
    "/group-bot/commands",
    async ({ body }) => {
      try {
        const command = await GroupBotService.createCommand(body);
        return { message: "Command created", command };
      } catch (err: any) {
        throw status(err?.message?.includes("Maximum") ? 409 : 422, err?.message || "Invalid command");
      }
    },
    {
      detail: { description: "Create a dynamic WhatsApp group bot command", security: [{ ACCESS_TOKEN: [] }] },
      body: t.Object({
        trigger: t.String({ minLength: 1, maxLength: 64 }),
        type: t.Optional(t.Union([t.Literal("text"), t.Literal("webhook")])),
        response: t.Optional(t.String({ maxLength: 4000 })),
        description: t.Optional(t.String({ maxLength: 160 })),
        webhookUrl: t.Optional(t.String()),
        webhookMethod: t.Optional(t.Union([t.Literal("GET"), t.Literal("POST")])),
        webhookBody: t.Optional(t.String({ maxLength: 8000 })),
        webhookQuery: t.Optional(
          t.Array(
            t.Object({
              key: t.String(),
              value: t.String(),
              enabled: t.Boolean(),
            }),
          ),
        ),
        webhookReply: t.Optional(t.Boolean()),
        enabled: t.Optional(t.Boolean()),
        exactMatch: t.Optional(t.Boolean()),
      }),
    },
  )
  // Update Group Bot Command
  .put(
    "/group-bot/commands/:id",
    async ({ params, body }) => {
      try {
        const command = await GroupBotService.updateCommand(params.id, body);
        return { message: "Command updated", command };
      } catch (err: any) {
        throw status(err?.message === "Command not found" ? 404 : 422, err?.message || "Invalid command");
      }
    },
    {
      detail: { description: "Update a dynamic WhatsApp group bot command", security: [{ ACCESS_TOKEN: [] }] },
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        trigger: t.String({ minLength: 1, maxLength: 64 }),
        type: t.Optional(t.Union([t.Literal("text"), t.Literal("webhook")])),
        response: t.Optional(t.String({ maxLength: 4000 })),
        description: t.Optional(t.String({ maxLength: 160 })),
        webhookUrl: t.Optional(t.String()),
        webhookMethod: t.Optional(t.Union([t.Literal("GET"), t.Literal("POST")])),
        webhookBody: t.Optional(t.String({ maxLength: 8000 })),
        webhookQuery: t.Optional(
          t.Array(
            t.Object({
              key: t.String(),
              value: t.String(),
              enabled: t.Boolean(),
            }),
          ),
        ),
        webhookReply: t.Optional(t.Boolean()),
        enabled: t.Optional(t.Boolean()),
        exactMatch: t.Optional(t.Boolean()),
      }),
    },
  )
  // Delete Group Bot Command
  .delete(
    "/group-bot/commands/:id",
    async ({ params }) => {
      try {
        await GroupBotService.deleteCommand(params.id);
        return { message: "Command deleted" };
      } catch (err: any) {
        throw status(404, err?.message || "Command not found");
      }
    },
    {
      detail: { description: "Delete a dynamic WhatsApp group bot command", security: [{ ACCESS_TOKEN: [] }] },
      params: t.Object({
        id: t.String(),
      }),
    },
  );
