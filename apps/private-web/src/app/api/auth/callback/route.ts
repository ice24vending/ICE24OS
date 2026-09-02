import { NextResponse, type NextRequest } from "next/server";

import { oidcFlowCookieName, readOidcFlow } from "../../../../server/session/oidc-flow";
import { createCsrfToken, writeBrowserSession } from "../../../../server/session/session";
import {
  parseSupabaseSession,
  readIdentitySubject,
  recordSecurityEvent,
} from "../../../../server/session/supabase-auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const issuer = process.env.OIDC_ISSUER?.replace(/\/$/, "");
    const clientId = process.env.OIDC_CLIENT_ID;
    const code = request.nextUrl.searchParams.get("code");
    const flow = readOidcFlow(
      request.cookies.get(oidcFlowCookieName)?.value,
      request.nextUrl.searchParams.get("state"),
    );
    if (issuer === undefined || clientId === undefined || code === null || flow === undefined) {
      throw new Error("Invalid OIDC callback");
    }
    const privateWebUrl = process.env.PRIVATE_WEB_URL ?? request.nextUrl.origin;
    const tokenResponse = await fetch(process.env.OIDC_TOKEN_ENDPOINT ?? `${issuer}/token`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        code_verifier: flow.verifier,
        redirect_uri: new URL("/api/auth/callback", privateWebUrl).toString(),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const session = await parseSupabaseSession(tokenResponse);
    await recordSecurityEvent({
      eventType: "LOGIN_SUCCEEDED",
      result: "SUCCESS",
      identitySubject: readIdentitySubject(session.access_token),
      metadata: { flow: "authorization_code_pkce" },
    });
    const response = NextResponse.redirect(new URL("/access/context", request.url), 303);
    response.cookies.set(oidcFlowCookieName, "", { path: "/", maxAge: 0 });
    writeBrowserSession(response, {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: Date.now() + Math.min(session.expires_in, 12 * 60 * 60) * 1_000,
      csrfToken: createCsrfToken(),
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?error=access", request.url), 303);
  }
}
