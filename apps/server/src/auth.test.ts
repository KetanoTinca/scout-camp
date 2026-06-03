import { describe, it, expect } from "vitest";
import { bearerFromHeader, checkPassword, issueToken, verifyToken } from "./auth.js";

const SECRET = "test-secret";

describe("token issue/verify", () => {
  it("verifies a token it just issued", () => {
    const token = issueToken(SECRET);
    expect(verifyToken(token, SECRET)).toBe(true);
  });

  it("rejects a token signed with a different secret", () => {
    const token = issueToken(SECRET);
    expect(verifyToken(token, "other-secret")).toBe(false);
  });

  it("rejects a tampered token", () => {
    const token = issueToken(SECRET);
    expect(verifyToken(token + "x", SECRET)).toBe(false);
  });

  it("rejects a missing token", () => {
    expect(verifyToken(undefined, SECRET)).toBe(false);
    expect(verifyToken("", SECRET)).toBe(false);
  });

  it("rejects an expired token", () => {
    const issuedLongAgo = Date.now() - 400 * 24 * 60 * 60 * 1000;
    const token = issueToken(SECRET, issuedLongAgo);
    expect(verifyToken(token, SECRET)).toBe(false);
  });
});

describe("checkPassword", () => {
  it("accepts the matching password", () => {
    expect(checkPassword("hunter2", "hunter2")).toBe(true);
  });
  it("rejects a wrong password", () => {
    expect(checkPassword("nope", "hunter2")).toBe(false);
  });
});

describe("bearerFromHeader", () => {
  it("extracts the token from a Bearer header", () => {
    expect(bearerFromHeader("Bearer abc.def")).toBe("abc.def");
  });
  it("ignores a non-bearer scheme", () => {
    expect(bearerFromHeader("Basic abc")).toBeUndefined();
    expect(bearerFromHeader(undefined)).toBeUndefined();
  });
});
