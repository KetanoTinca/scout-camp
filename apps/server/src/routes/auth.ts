import { LoginRequestSchema } from "@orions-cookbook/core";
import type { FastifyInstance } from "fastify";
import { checkPassword, issueToken } from "../auth.js";
import type { Env } from "../env.js";

/** Public auth route: exchange the shared password for a signed token. */
export function registerAuthRoutes(app: FastifyInstance, env: Env): void {
  app.post("/auth/login", async (req, reply) => {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request" });
    }
    if (!checkPassword(parsed.data.password, env.APP_PASSWORD)) {
      return reply.code(401).send({ error: "invalid_password" });
    }
    return { token: issueToken(env.APP_SECRET) };
  });
}
