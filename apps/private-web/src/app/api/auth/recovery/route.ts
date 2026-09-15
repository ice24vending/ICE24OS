import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  getSupabaseConfiguration,
  recordSecurityEvent,
  supabaseHeaders,
} from "../../../../server/session/supabase-auth";

export async function POST(request: Request): Promise<NextResponse> {
  let identifierHash: string | undefined;
  let result: "SUCCESS" | "FAILED" = "FAILED";
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new Error("Invalid origin");
    const form = await request.formData();
    const email = form.get("email");
    if (typeof email !== "string" || email.trim().length === 0) throw new Error("Invalid email");
    identifierHash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
    const { url } = getSupabaseConfiguration();
    const response = await fetch(`${url}/auth/v1/recover`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        email: email.trim(),
        redirect_to: new URL("/access/first", request.url).toString(),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("Recovery provider rejected the request");
    result = "SUCCESS";
  } catch {
    // The same response is deliberate: recovery never reveals whether the account exists.
  }
  try {
    await recordSecurityEvent({
      eventType: "RECOVERY_REQUESTED",
      result,
      ...(result === "FAILED" ? { reason: "RECOVERY_REQUEST_NOT_ACCEPTED" } : {}),
      ...(identifierHash === undefined ? {} : { metadata: { identifierHash } }),
    });
  } catch {
    // The provider retains the request even if the application audit dependency is unavailable.
  }
  return NextResponse.redirect(new URL("/?recovery=sent", request.url), 303);
}
