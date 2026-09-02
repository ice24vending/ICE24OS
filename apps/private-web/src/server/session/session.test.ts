import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { sealSession, unsealSession, type BrowserSession } from "./session.js";

const originalSecret = process.env.BFF_SESSION_SECRET;

describe("encrypted BFF sessions", () => {
  beforeEach(() => {
    process.env.BFF_SESSION_SECRET = "phase-three-test-secret-with-more-than-32-characters";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.BFF_SESSION_SECRET;
    else process.env.BFF_SESSION_SECRET = originalSecret;
  });

  it("round-trips tokens without exposing plaintext in the cookie", () => {
    const session: BrowserSession = {
      accessToken: "access-sensitive-value",
      refreshToken: "refresh-sensitive-value",
      expiresAt: Date.now() + 60_000,
      csrfToken: "csrf-value",
    };
    const sealed = sealSession(session);
    expect(sealed).not.toContain(session.accessToken);
    expect(unsealSession(sealed)).toEqual(session);
  });

  it("rejects tampering and expired sessions", () => {
    const sealed = sealSession({
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: Date.now() + 60_000,
      csrfToken: "csrf",
    });
    const parts = sealed.split(".");
    if (parts[2] === undefined) throw new Error("Malformed test fixture");
    parts[2] = `${parts[2].startsWith("A") ? "B" : "A"}${parts[2].slice(1)}`;
    expect(unsealSession(parts.join("."))).toBeUndefined();
    expect(
      unsealSession(
        sealSession({
          accessToken: "access",
          refreshToken: "refresh",
          expiresAt: Date.now() - 1,
          csrfToken: "csrf",
        }),
      ),
    ).toBeUndefined();
  });
});
