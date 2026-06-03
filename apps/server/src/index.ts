import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import { CURRENCY, UNIT_SYSTEM } from "@orions-cookbook/core";
import Fastify from "fastify";
import { loadDotenv, loadEnv } from "./env.js";
import { RealtimeHub } from "./realtime.js";
import { registerApiRoutes } from "./routes/api.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerWsRoute } from "./routes/ws.js";

const here = dirname(fileURLToPath(import.meta.url));

export async function buildServer() {
  loadDotenv();
  const env = loadEnv();
  const app = Fastify({ logger: true });
  const hub = new RealtimeHub();

  await app.register(fastifyWebsocket);

  // Health/config probe (public) — confirms locale config is wired app-wide.
  app.get("/healthz", async () => ({
    status: "ok",
    currency: CURRENCY,
    unitSystem: UNIT_SYSTEM,
  }));

  registerAuthRoutes(app, env);
  registerApiRoutes(app, env, hub);
  registerWsRoute(app, env, hub);

  // Serve the built PWA. In dev the web app runs under Vite, so this is skipped when the
  // build output isn't present.
  const webDist = env.WEB_DIST ?? resolve(here, "../../web/dist");
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist });
    app.setNotFoundHandler((req, reply) => {
      const isAppRoute =
        req.method === "GET" &&
        !req.url.startsWith("/api") &&
        !req.url.startsWith("/auth") &&
        !req.url.startsWith("/ws") &&
        !req.url.startsWith("/healthz");
      if (isAppRoute) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: "not_found" });
    });
    app.log.info({ webDist }, "serving built web assets");
  } else {
    app.log.warn({ webDist }, "web build not found; static serving disabled (dev mode?)");
  }

  return { app, env };
}

async function main() {
  const { app, env } = await buildServer();
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Run only when executed directly (not when imported by tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
