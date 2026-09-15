import { NextResponse } from "next/server";

import {
  clearBrowserSession,
  readBrowserSession,
  requireValidCsrf,
} from "../../../../server/session/session";
import {
  callPrivateApi,
  getSupabaseConfiguration,
  supabaseHeaders,
} from "../../../../server/session/supabase-auth";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await readBrowserSession();
  if (session !== undefined) {
    try {
      const form = await request.formData();
      requireValidCsrf(request, session, form);
    } catch {
      return NextResponse.json({ message: "Invalid request" }, { status: 403 });
    }
    try {
      const revoked = await callPrivateApi("me/sessions/revoke-all", session, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "BFF_GLOBAL_LOGOUT" }),
      });
      if (!revoked.ok) throw new Error("Context revocation failed");
      const { url } = getSupabaseConfiguration();
      const logout = await fetch(`${url}/auth/v1/logout?scope=global`, {
        method: "POST",
        headers: supabaseHeaders(session.accessToken),
        signal: AbortSignal.timeout(8_000),
      });
      if (!logout.ok) throw new Error("Identity revocation failed");
    } catch {
      return NextResponse.json(
        { message: "Session revocation could not be completed; retry." },
        { status: 503 },
      );
    }
  }
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  clearBrowserSession(response);
  return response;
}
