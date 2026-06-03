import { LoginResponseSchema } from "@orions-cookbook/core";

/**
 * Client auth. The token is cached in localStorage so the device stays logged in across
 * reloads and — crucially — works offline after the first successful login (PRD story 44).
 */
const TOKEN_KEY = "orions-cookbook.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Exchange the shared password for a token. Throws on a wrong password / network error. */
export async function login(password: string): Promise<string> {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Incorrect password" : `Login failed (${res.status})`);
  }
  const { token } = LoginResponseSchema.parse(await res.json());
  setToken(token);
  return token;
}
