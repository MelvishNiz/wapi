import { Elysia } from "elysia";

export const BasicAuthPlugin = () =>
  new Elysia({ name: "basic-auth" }).derive({ as: "scoped" }, ({ request }) => {
    const header = request.headers.get("authorization");

    if (!header || !header.startsWith("Basic ")) {
      throw new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
      });
    }

    const base64Credentials = header.replace("Basic ", "");
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
    const [user, pass] = credentials.split(":");

    const envUser = process.env.BASIC_AUTH_USER;
    const envPass = process.env.BASIC_AUTH_PASS;

    if (user !== envUser || pass !== envPass) {
      throw new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
      });
    }

    return { user };
  });
