import { NextResponse } from "next/server";

import { readBrowserSession, requireValidCsrf } from "../../../../server/session/session";
import {
  getSupabaseConfiguration,
  supabaseHeaders,
} from "../../../../server/session/supabase-auth";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await readBrowserSession();
  if (session === undefined)
    return NextResponse.redirect(new URL("/?error=expired", request.url), 303);
  try {
    const form = await request.formData();
    requireValidCsrf(request, session, form);
    const password = form.get("password");
    if (typeof password !== "string" || password.length < 12) throw new Error("Invalid password");
    const { url } = getSupabaseConfiguration();
    const response = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: supabaseHeaders(session.accessToken),
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("Password change rejected");
    return NextResponse.redirect(new URL("/access/mfa", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/access/first?error=change", request.url), 303);
  }
}
