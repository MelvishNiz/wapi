import { Elysia } from "elysia";

export const AccessTokenPlugin = () =>
  new Elysia({ name: "access-token" }).derive({ as: "scoped" }, ({ request }) => {
    const token = request.headers.get("access_token");

    if (!token) {
      throw new Response("Unauthorized", { status: 401 });
    }

    const envToken = process.env.ACCESS_TOKEN;

    if (token !== envToken) {
      throw new Response("Forbidden", { status: 403 });
    }

    return { token };
  });
