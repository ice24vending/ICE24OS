import { NextResponse } from "next/server";

import { noStore } from "../../../server/bff/responses";

export const wantsJson = (request: Request) =>
  request.headers.get("accept")?.includes("application/json") ?? false;

/**
 * Answer of a successful context switch (F6-08). `Clear-Site-Data: "cache"` drops what the
 * browser cached under the previous context; the selector then loads `location` as a new
 * document, so no in-memory data of the old context survives either.
 */
export function switched(
  request: Request,
  location: string,
  write: (response: NextResponse) => void,
): NextResponse {
  const response = wantsJson(request)
    ? NextResponse.json({ location }, { headers: noStore })
    : NextResponse.redirect(new URL(location, request.url), 303);
  response.headers.set("clear-site-data", '"cache"');
  write(response);
  return response;
}
