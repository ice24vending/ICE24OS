import { NextResponse } from "next/server";

import {
  readBrowserSession,
  requireValidCsrf,
  writeBrowserSession,
} from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await readBrowserSession();
  if (session === undefined)
    return NextResponse.redirect(new URL("/?error=expired", request.url), 303);
  try {
    const form = await request.formData();
    requireValidCsrf(request, session, form);
    const accountId = form.get("accountId");
    if (typeof accountId !== "string") throw new Error("Invalid account");
    const apiResponse = await callPrivateApi("session-contexts", session, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountId,
        ...(session.identitySessionId === undefined
          ? {}
          : { identitySessionId: session.identitySessionId }),
      }),
    });
    if (!apiResponse.ok) throw new Error("Context activation failed");
    const context = (await apiResponse.json()) as { id?: unknown };
    if (typeof context.id !== "string") throw new Error("Invalid context response");
    const response = NextResponse.redirect(new URL("/profile", request.url), 303);
    writeBrowserSession(response, { ...session, contextId: context.id });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/access/context?error=context", request.url), 303);
  }
}
