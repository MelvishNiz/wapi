import Elysia, { sse, status, t } from "elysia";
import { data, sock } from "../lib/baileys";
import { logger } from "../lib/logger";

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
if (!ACCESS_TOKEN) throw new Error("ACCESS_TOKEN is required");

const getState = () => {
  const user = sock.user || null;
  let state = "NOT_READY";
  if (!user && data.qr) state = "AUTH_REQUIRED";
  else if (user) state = "READY";
  return state as "READY" | "NOT_READY" | "AUTH_REQUIRED";
};

export const StreamController = new Elysia()
  // Stream Status
  .get(
    "/sse",
    async function* ({ query }) {
      const token = query.token;
      if (token !== ACCESS_TOKEN) return status(401, "Unauthorized");

      while (true) {
        const state = getState();
        const user = sock.user || null;

        yield sse({
          event: "message",
          data: {
            state,
            user: {
              id: user?.id || null,
              name: user?.name || null,
              lid: user?.lid || null,
            },
            connection: data.connection || null,
            qr_code: data.qr || "",
          },
        });
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
    {
      query: t.Object({
        token: t.String(),
      }),
    },
  );
