import { eq } from "drizzle-orm";
import Elysia, { status, t } from "elysia";
import { db } from "../db";
import { phoneNumbers } from "../db/schema";
import { data, sock } from "../lib/baileys";
import { GoogleContact } from "../lib/google-contact";
import { logger } from "../lib/logger";
import { AccessTokenPlugin } from "../plugins/access-token";
import { Helper } from "../utils/helper";

const getState = () => {
  const user = sock.user || null;
  let state = "NOT_READY";
  if (!user && data.qr) state = "AUTH_REQUIRED";
  else if (user) state = "READY";
  return state as "READY" | "NOT_READY" | "AUTH_REQUIRED";
};
const googleContact = new GoogleContact();

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

      try {
        const name = `(wapi) ${international}`;
        const [alreadyExists] = await db.select().from(phoneNumbers).where(eq(phoneNumbers.name, name)).limit(1);
        if (!alreadyExists) {
          const contact = await googleContact.search(name);
          if (!contact.results?.length || contact.results.length <= 0) {
            logger.info(`Adding ${international} to google contact`);
            await googleContact.create({
              phoneNumber: international,
              name: name,
            });
            await db.insert(phoneNumbers).values({ name });
          } else {
            logger.info(`${international} already exists in google contact, skip added`);
          }
        } else {
          logger.info(`${international} already exists in local db, skip added`);
        }
      } catch (err: any) {
        logger.error(err.message);
      }

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
  );
