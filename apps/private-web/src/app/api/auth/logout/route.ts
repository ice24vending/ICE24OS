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
import { clearDemoCookie, isDemoSession } from "../../../../server/demo/session";

/** Backstop of the client purge (UI_UX §20.7): drops local data of the origin on sign-out. */
const signedOut = (request: Request) => {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.headers.set("Clear-Site-Data", '"cache", "storage"');
  return response;
};

export async function POST(request: Request): Promise<NextResponse> {
  const session = await readBrowserSession();
  if (session !== undefined) {
    try {
      const form = await request.formData();
      requireValidCsrf(request, session, form);
    } catch {
      return NextResponse.json({ message: "Invalid request" }, { status: 403 });
    }
    if (isDemoSession(session)) {
      // Leaving a demo persona only clears the demo cookie: there is no identity to revoke.
      const response = signedOut(request);
      clearDemoCookie(response);
      return response;
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
  const response = signedOut(request);
  clearBrowserSession(response);
  return response;
}
