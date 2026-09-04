import { NextResponse } from "next/server";

import {
  readBrowserSession,
  requireValidCsrf,
  writeBrowserSession,
} from "../../../../../server/session/session";
import {
  getSupabaseConfiguration,
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
    const { url } = getSupabaseConfiguration();
    const enrollmentResponse = await fetch(`${url}/auth/v1/factors`, {
      method: "POST",
      headers: supabaseHeaders(session.accessToken),
      body: JSON.stringify({ factor_type: "totp", friendly_name: "ICE24 OS" }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!enrollmentResponse.ok) throw new Error("MFA enrollment failed");
    const enrollment = (await enrollmentResponse.json()) as {
      id?: unknown;
      totp?: { secret?: unknown; uri?: unknown };
    };
    if (
      typeof enrollment.id !== "string" ||
      typeof enrollment.totp?.secret !== "string" ||
      typeof enrollment.totp.uri !== "string"
    ) {
      throw new Error("Invalid MFA enrollment response");
    }
    const challengeResponse = await fetch(`${url}/auth/v1/factors/${enrollment.id}/challenge`, {
      method: "POST",
      headers: supabaseHeaders(session.accessToken),
      body: "{}",
      signal: AbortSignal.timeout(8_000),
    });
    if (!challengeResponse.ok) throw new Error("MFA challenge failed");
    const challenge = (await challengeResponse.json()) as { id?: unknown };
    if (typeof challenge.id !== "string") throw new Error("Invalid MFA challenge response");
    await recordSecurityEvent({
      eventType: "MFA_ENROLLED",
      result: "SUCCESS",
      identitySubject: readIdentitySubject(session.accessToken),
    });
    const response = NextResponse.redirect(new URL("/access/mfa", request.url), 303);
    writeBrowserSession(response, {
      ...session,
      pendingMfa: {
        factorId: enrollment.id,
        challengeId: challenge.id,
        secret: enrollment.totp.secret,
        uri: enrollment.totp.uri,
      },
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/access/mfa?error=enroll", request.url), 303);
  }
}
