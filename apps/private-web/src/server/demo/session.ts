import { NextResponse } from "next/server";

import type { BrowserSession } from "../session/session";
import { demoAccountById, demoContextId } from "./fixtures";
import { isDemoModeEnabled, type DemoEnvironment } from "./mode";
import {
  DEMO_COOKIE,
  DEMO_TOKEN_PREFIX,
  decodeDemoState,
  demoAccessToken,
  demoStateFromToken,
  encodeDemoState,
  type DemoState,
} from "./state";

const DEMO_MAX_AGE_SECONDS = 12 * 60 * 60;

/** Session of the selected persona. Its token only ever reaches the in-process demo API. */
export const demoBrowserSession = (state: DemoState): BrowserSession => ({
  accessToken: demoAccessToken(state),
  refreshToken: "ice24-demo",
  expiresAt: Date.now() + DEMO_MAX_AGE_SECONDS * 1_000,
  csrfToken: state.csrf,
  contextId: demoContextId(state.persona, state.account),
});

/**
 * Demo session from the demo cookie. Returns undefined — so the real encrypted session is used —
 * whenever the demo mode is disabled, whatever the cookie says.
 */
export function readDemoSession(
  cookieValue: string | undefined,
  env: DemoEnvironment = process.env,
): BrowserSession | undefined {
  if (!isDemoModeEnabled(env)) return undefined;
  const state = decodeDemoState(cookieValue);
  return state === undefined ? undefined : demoBrowserSession(state);
}

export const isDemoSession = (
  session: { readonly accessToken: string },
  env: DemoEnvironment = process.env,
) => isDemoModeEnabled(env) && session.accessToken.startsWith(DEMO_TOKEN_PREFIX);

/** Demo state of a demo session (only while the demo mode is enabled). */
export const demoStateOf = (
  session: { readonly accessToken: string },
  env: DemoEnvironment = process.env,
) => (isDemoSession(session, env) ? demoStateFromToken(session.accessToken) : undefined);

export function writeDemoCookie(response: NextResponse, state: DemoState): void {
  response.cookies.set(DEMO_COOKIE, encodeDemoState(state), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_MAX_AGE_SECONDS,
  });
}

export function clearDemoCookie(response: NextResponse): void {
  response.cookies.set(DEMO_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

/** «Cambiar de cuenta» in the demo: selects another fictitious account instead of the API. */
export function switchDemoAccount(request: Request, state: DemoState, accountId: string) {
  const account = demoAccountById(accountId);
  if (!account)
    return NextResponse.redirect(new URL("/access/context?error=context", request.url), 303);
  const response = NextResponse.redirect(new URL("/workspace", request.url), 303);
  writeDemoCookie(response, {
    ...state,
    account: account.key,
    branch: account.branches[0]!.id,
  });
  return response;
}
