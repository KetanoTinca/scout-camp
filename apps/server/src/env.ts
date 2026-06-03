import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

/**
 * Load the monorepo-root `.env` for local development. In Docker the environment is
 * injected by the container (and no `.env` is copied in), so this is a harmless no-op.
 * Existing process env always wins — dotenv never overrides it.
 */
export function loadDotenv(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const file = resolve(root, ".env");
  if (existsSync(file)) config({ path: file });
}

/**
 * Validated server environment. Fails fast at boot if required secrets are missing,
 * so a misconfigured container never silently starts unauthenticated.
 */
const EnvSchema = z.object({
  APP_SECRET: z.string().min(1, "APP_SECRET is required (signs auth tokens)"),
  APP_PASSWORD: z.string().min(1, "APP_PASSWORD is required (shared login password)"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CURRENCY: z.string().default("RON"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  /** Absolute path to the built web assets to serve. Optional in dev. */
  WEB_DIST: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment:\n${issues.join("\n")}`);
  }
  return parsed.data;
}
