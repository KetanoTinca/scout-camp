import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Shared-secret auth. There are no per-user accounts (PRD: single shared password).
 * A correct password mints a signed token; the token is an HMAC over a small payload
 * so the server can verify it statelessly. The device caches the token and keeps using
 * it offline until it expires.
 */

const TOKEN_VERSION = 1;
/** Tokens are long-lived so a camp phone stays logged in offline for a whole season. */
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  v: number;
  iat: number;
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Mint a signed token after a successful password check. */
export function issueToken(secret: string, now: number = Date.now()): string {
  const payload: TokenPayload = { v: TOKEN_VERSION, iat: now, exp: now + TOKEN_TTL_MS };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

/** Verify a token's signature and expiry. Returns true only for a valid, unexpired token. */
export function verifyToken(token: string | undefined, secret: string, now: number = Date.now()): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body, secret);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (payload.v !== TOKEN_VERSION) return false;
    if (typeof payload.exp !== "number" || payload.exp < now) return false;
    return true;
  } catch {
    return false;
  }
}

/** Constant-time check of a submitted password against the configured one. */
export function checkPassword(submitted: string, expected: string): boolean {
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Extract a bearer token from an Authorization header value. */
export function bearerFromHeader(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return undefined;
  return value;
}
