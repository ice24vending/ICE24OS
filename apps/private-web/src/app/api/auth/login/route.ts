import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { createCsrfToken, writeBrowserSession } from "../../../../server/session/session";
import {
  getSupabaseConfiguration,
  parseSupabaseSession,
  readIdentitySubject,
  recordSecurityEvent,
  supabaseHeaders,
} from "../../../../server/session/supabase-auth";

const readIdentitySessionId = (accessToken: string): string | undefined => {
  try {
    const payload = accessToken.split(".")[1];
    if (payload === undefined) return undefined;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      session_id?: unknown;
    };
    return typeof claims.session_id === "string" ? claims.session_id : undefined;
  } catch {
    return undefined;
  }
};

export async function POST(request: Request): Promise<NextResponse> {
  let identifierHash: string | undefined;
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new Error("Invalid origin");
    const form = await request.formData();
    const email = form.get("email");
    const password = form.get("password");
    if (typeof email !== "string" || typeof password !== "string") throw new Error("Invalid login");
    identifierHash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
    const { url } = getSupabaseConfiguration();
    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ email: email.trim(), password }),
      signal: AbortSignal.timeout(8_000),
    });
    const authSession = await parseSupabaseSession(authResponse);
    await recordSecurityEvent({
      eventType: "LOGIN_SUCCEEDED",
      result: "SUCCESS",
      identitySubject: readIdentitySubject(authSession.access_token),
    });
    const identitySessionId = readIdentitySessionId(authSession.access_token);
    const response = NextResponse.redirect(new URL("/access/context", request.url), 303);
    writeBrowserSession(response, {
      accessToken: authSession.access_token,
      refreshToken: authSession.refresh_token,
      expiresAt: Date.now() + Math.min(authSession.expires_in, 12 * 60 * 60) * 1_000,
      csrfToken: createCsrfToken(),
      ...(identitySessionId === undefined ? {} : { identitySessionId }),
    });
    return response;
  } catch {
    try {
      await recordSecurityEvent({
        eventType: "LOGIN_FAILED",
        result: "FAILED",
        reason: "Generic authentication failure",
        ...(identifierHash === undefined ? {} : { metadata: { identifierHash } }),
      });
    } catch {
      // Supabase still records the failed attempt when ICE24 audit is temporarily unavailable.
    }
    return NextResponse.redirect(new URL("/?error=access", request.url), 303);
  }
}
