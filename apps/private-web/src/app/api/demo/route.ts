import { NextResponse } from "next/server";

import { isDemoModeEnabled } from "../../../server/demo/mode";
import { clearDemoCookie, writeDemoCookie } from "../../../server/demo/session";
import {
  DEMO_COOKIE,
  decodeDemoState,
  defaultDemoState,
  normalizeDemoState,
} from "../../../server/demo/state";

/** Outside the demo mode this route does not exist. */
const notFound = () => new NextResponse(null, { status: 404 });

/** Internal page to return to; anything else (absolute, protocol-relative, API) is ignored. */
const safeReturn = (value: FormDataEntryValue | null) =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.startsWith("/\\") &&
  !value.startsWith("/api/")
    ? value
    : "/workspace";

const cookieOf = (request: Request) =>
  request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEMO_COOKIE}=`))
    ?.slice(DEMO_COOKIE.length + 1);

/** `/?demo=1` lands here: starts the demo as the account owner. */
export function GET(request: Request): NextResponse {
  if (!isDemoModeEnabled()) return notFound();
  const response = NextResponse.redirect(new URL("/workspace", request.url), 303);
  writeDemoCookie(response, decodeDemoState(cookieOf(request)) ?? defaultDemoState());
  return response;
}

/** The floating "Demo" panel: change persona, account, branch, account mode or network. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isDemoModeEnabled()) return notFound();
  const current = decodeDemoState(cookieOf(request));
  const form = await request.formData();
  if (
    current === undefined ||
    request.headers.get("origin") !== new URL(request.url).origin ||
    form.get("csrfToken") !== current.csrf
  )
    return NextResponse.json({ message: "Solicitud no autorizada." }, { status: 403 });
  if (form.get("action") === "exit") {
    const response = NextResponse.redirect(new URL("/", request.url), 303);
    clearDemoCookie(response);
    return response;
  }
  const field = (name: string) => form.get(name) ?? undefined;
  const next = normalizeDemoState(
    {
      persona: field("persona"),
      account: field("account"),
      // A new account starts at its first branch; the branch list belongs to the old one.
      branch: field("account") === current.account ? field("branch") : undefined,
      mode: field("mode"),
      network: field("network"),
    },
    current,
  );
  const response = NextResponse.redirect(
    new URL(safeReturn(form.get("returnTo")), request.url),
    303,
  );
  writeDemoCookie(response, next);
  return response;
}
