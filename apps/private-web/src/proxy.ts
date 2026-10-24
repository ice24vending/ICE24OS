import { NextResponse, type NextRequest } from "next/server";

import { REQUESTED_PATH_HEADER } from "./features/navigation/deep-links";

/**
 * Deep links (F6-11): layouts do not receive the URL, so the proxy passes it along. Without a
 * session the account layout sends the viewer to the login with this path as `next`, and a link
 * of another account asks to switch context. It only reads the URL: every check stays in the
 * layout and the API.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(REQUESTED_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Pages only: not the BFF, Next assets, files with an extension, access pages nor the login.
  matcher: ["/((?!api/|_next/|access/|.*\\.).+)"],
};
