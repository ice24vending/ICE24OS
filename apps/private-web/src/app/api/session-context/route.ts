import { contextCapabilitiesSchema } from "@ice24/contracts";
import { NextResponse } from "next/server";

import {
  readBrowserSession,
  requireValidCsrf,
  writeBrowserSession,
  type BrowserSession,
} from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { demoBrowserSession, demoStateOf, switchDemoAccount } from "../../../server/demo/session";
import { failure } from "../../../server/bff/responses";
import { locationAfterSwitch } from "../../../features/context/model";
import { authorizedDestinations } from "../../../features/navigation/destinations";
import { nextPath } from "../../../features/navigation/deep-links";
import { switched, wantsJson } from "./switched";

/** Destinations the new context may open, to keep the module when the viewer may open it. */
async function destinationsOf(session: BrowserSession) {
  const response = await callPrivateApi("session-contexts/current/capabilities", session, {
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  const parsed = contextCapabilitiesSchema.safeParse(
    response?.ok ? await response.json().catch(() => null) : null,
  );
  return parsed.success ? authorizedDestinations(parsed.data) : [];
}

/**
 * Switches the account without a new login (F3-06). The API revokes the previous context and
 * audits CONTEXT_ACTIVATED; the working branch and machine of the old account are dropped. The
 * selector (F6-08) calls it with `accept: application/json`; the /access/context page posts a form.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const json = wantsJson(request);
  const session = await readBrowserSession();
  if (session === undefined)
    return json
      ? failure("Tu sesión expiró. Inicia sesión nuevamente.", 401, "AUTHENTICATION_REQUIRED")
      : NextResponse.redirect(new URL("/?error=expired", request.url), 303);
  try {
    const form = await request.formData();
    requireValidCsrf(request, session, form);
    const accountId = form.get("accountId");
    if (typeof accountId !== "string") throw new Error("Invalid account");
    // A deep link (F6-11) opens exactly its page: the account layout checks it in the new context.
    const next = nextPath(form.get("next"));
    const demo = demoStateOf(session);
    if (demo !== undefined) {
      const switchedDemo = switchDemoAccount(demo, accountId);
      if (!switchedDemo) throw new Error("Unknown demo account");
      const location =
        next ??
        locationAfterSwitch(
          form.get("returnTo"),
          await destinationsOf(demoBrowserSession(switchedDemo.state)),
          false,
        );
      return switched(request, location, switchedDemo.write);
    }
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
    const activated: BrowserSession = { ...session, contextId: context.id, focus: undefined };
    // Signing in lands on the first destination the context may open (the summary), else the
    // profile; a switch keeps the page it came from when that one is still allowed.
    const location =
      next ?? locationAfterSwitch(form.get("returnTo"), await destinationsOf(activated), false);
    return switched(request, location, (response) => writeBrowserSession(response, activated));
  } catch {
    return json
      ? failure("No pudimos cambiar de cuenta. Tu contexto actual sigue activo.", 409)
      : NextResponse.redirect(new URL("/access/context?error=context", request.url), 303);
  }
}
