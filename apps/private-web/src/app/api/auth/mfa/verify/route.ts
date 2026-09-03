import { NextResponse } from "next/server";

import {
  readBrowserSession,
  requireValidCsrf,
  writeBrowserSession,
} from "../../../../../server/session/session";
import {
  getSupabaseConfiguration,
  parseSupabaseSession,
  readIdentitySubject,
  recordSecurityEvent,
  supabaseHeaders,
} from "../../../../../server/session/supabase-auth";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await readBrowserSession();
  if (session === undefined)
    return NextResponse.redirect(new URL("/?error=expired", request.url), 303);
  try {
    const form = await request.formData();
    requireValidCsrf(request, session, form);
    const code = form.get("code");
    const pending = session.pendingMfa;
    if (typeof code !== "string" || !/^\d{6}$/.test(code) || pending === undefined) {
      throw new Error("Invalid MFA verification");
    }
    const { url } = getSupabaseConfiguration();
    const verificationResponse = await fetch(`${url}/auth/v1/factors/${pending.factorId}/verify`, {
      method: "POST",
      headers: supabaseHeaders(session.accessToken),
      body: JSON.stringify({ challenge_id: pending.challengeId, code }),
      signal: AbortSignal.timeout(8_000),
    });
    const elevated = await parseSupabaseSession(verificationResponse);
    await recordSecurityEvent({
      eventType: "MFA_ENROLLED",
      result: "SUCCESS",
      identitySubject: readIdentitySubject(elevated.access_token),
      metadata: { assuranceLevel: "aal2" },
    });
    const response = NextResponse.redirect(new URL("/access/context", request.url), 303);
    writeBrowserSession(response, {
      accessToken: elevated.access_token,
      refreshToken: elevated.refresh_token,
      expiresAt: Date.now() + Math.min(elevated.expires_in, 12 * 60 * 60) * 1_000,
      csrfToken: session.csrfToken,
      ...(session.identitySessionId === undefined
        ? {}
        : { identitySessionId: session.identitySessionId }),
    });
    return response;
  } catch {
    try {
      await recordSecurityEvent({
        eventType: "MFA_CHALLENGE_FAILED",
        result: "FAILED",
        identitySubject: readIdentitySubject(session.accessToken),
      });
    } catch {
      // Supabase also retains the failed challenge.
    }
    return NextResponse.redirect(new URL("/access/mfa?error=verify", request.url), 303);
  }
}
