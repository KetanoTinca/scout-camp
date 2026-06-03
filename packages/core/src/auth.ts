import { z } from "zod";

/** Shared-password login request body (`POST /auth/login`). */
export const LoginRequestSchema = z.object({
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/** Login response: a signed token the device caches for offline-capable auth. */
export const LoginResponseSchema = z.object({
  token: z.string().min(1),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
