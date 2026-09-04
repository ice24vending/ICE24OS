import { NextResponse } from "next/server";

import { createOidcFlow, oidcFlowCookieName } from "../../../../server/session/oidc-flow";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const issuer = process.env.OIDC_ISSUER?.replace(/\/$/, "");
    const clientId = process.env.OIDC_CLIENT_ID;
    const privateWebUrl = process.env.PRIVATE_WEB_URL ?? new URL(request.url).origin;
    if (issuer === undefined || clientId === undefined)
      throw new Error("OIDC client not configured");
    const flow = createOidcFlow();
    const endpoint = process.env.OIDC_AUTHORIZATION_ENDPOINT ?? `${issuer}/authorize`;
    const authorizationUrl = new URL(endpoint);
    authorizationUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: new URL("/api/auth/callback", privateWebUrl).toString(),
      scope: "openid email profile offline_access",
      state: flow.state,
      code_challenge: flow.challenge,
      code_challenge_method: "S256",
    }).toString();
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(oidcFlowCookieName, flow.cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?error=access", request.url), 303);
  }
}
