import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export interface PendingMfaEnrollment {
  readonly factorId: string;
  readonly challengeId: string;
  readonly secret: string;
  readonly uri: string;
}

export interface BrowserSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly csrfToken: string;
  readonly identitySessionId?: string | undefined;
  readonly contextId?: string | undefined;
  readonly pendingMfa?: PendingMfaEnrollment | undefined;
}

const sessionCookieName =
  process.env.NODE_ENV === "production" ? "__Host-ice24_session" : "ice24_session";
const maxAgeSeconds = 12 * 60 * 60;

const getKey = (): Buffer => {
  const secret = process.env.BFF_SESSION_SECRET;
  if (secret === undefined || secret.length < 32) {
    throw new Error("BFF_SESSION_SECRET must contain at least 32 characters");
  }
  return createHash("sha256").update(secret, "utf8").digest();
};

export const createCsrfToken = (): string => randomBytes(32).toString("base64url");

export const sealSession = (session: BrowserSession): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
};

export const unsealSession = (sealed: string): BrowserSession | undefined => {
  try {
    const parts = sealed.split(".");
    const [encodedIv, encodedTag, encodedCiphertext] = parts;
    if (
      parts.length !== 3 ||
      encodedIv === undefined ||
      encodedTag === undefined ||
      encodedCiphertext === undefined
    ) {
      return undefined;
    }
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(encodedIv, "base64url"));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const session = JSON.parse(plaintext) as BrowserSession;
    if (
      typeof session.accessToken !== "string" ||
      typeof session.refreshToken !== "string" ||
      typeof session.csrfToken !== "string" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now()
    ) {
      return undefined;
    }
    return session;
  } catch {
    return undefined;
  }
};

export const readBrowserSession = async (): Promise<BrowserSession | undefined> => {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(sessionCookieName)?.value;
  return sealed === undefined ? undefined : unsealSession(sealed);
};

export const writeBrowserSession = (response: NextResponse, session: BrowserSession): void => {
  response.cookies.set(sessionCookieName, sealSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(
      maxAgeSeconds,
      Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1_000)),
    ),
  });
};

export const clearBrowserSession = (response: NextResponse): void => {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
};

export const requireValidCsrf = (
  request: Request,
  session: BrowserSession,
  form: FormData,
): void => {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  const token = form.get("csrfToken");
  if (origin !== expectedOrigin || token !== session.csrfToken)
    throw new Error("Invalid CSRF token");
};
