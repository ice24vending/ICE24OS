import { NextResponse } from "next/server";
import { apiErrorSchema, type ErrorCode } from "@ice24/contracts";
import { readBrowserSession, requireValidCsrf, type BrowserSession } from "../session/session";
import type { BffCode } from "../../features/account-shell/failure";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{8,128}$/u;
/** Row version sent by the UI for If-Match (F5-15, API.md optimistic concurrency). */
export const VERSION = /^[1-9][0-9]{0,8}$/u;
export const noStore = { "cache-control": "no-store" } as const;

/**
 * BFF failure body `{message, code?}`. The code is an API.md code (or the BFF's own
 * CONTEXT_CHANGED) that lets the screen pick its state; the message is always our own text.
 */
export const failure = (message: string, status: number, code?: BffCode) =>
  NextResponse.json(code ? { message, code } : { message }, { status, headers: noStore });

/** API.md error code of an upstream answer, if it carries a contract error. */
export async function upstreamCode(response: Response): Promise<ErrorCode | undefined> {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.error.code : undefined;
}

/** Upstream failure rendered with a safe message per code; upstream text is never echoed. */
export async function upstreamFailure(
  response: Response,
  messages: Partial<Record<ErrorCode, string>>,
  fallback: string,
) {
  const code = await upstreamCode(response);
  return failure((code && messages[code]) ?? fallback, response.status, code);
}

/** Session, workspace-context and (for mutations) CSRF and idempotency-key checks. */
export async function guard(
  request: Request,
  form?: FormData,
): Promise<{ session: BrowserSession } | { error: NextResponse }> {
  const session = await readBrowserSession();
  if (!session?.contextId)
    return {
      error: failure("Tu sesión expiró. Inicia sesión nuevamente.", 401, "AUTHENTICATION_REQUIRED"),
    };
  if (request.headers.get("x-ice24-workspace-context") !== session.contextId)
    return {
      error: failure(
        "El contexto cambió en otra pestaña. Recarga esta página.",
        409,
        "CONTEXT_CHANGED",
      ),
    };
  if (form) {
    try {
      requireValidCsrf(request, session, form);
    } catch {
      return { error: failure("Solicitud no autorizada. Recarga esta página.", 403) };
    }
    const key = form.get("key");
    if (typeof key !== "string" || !IDEMPOTENCY_KEY.test(key))
      return { error: failure("Solicitud inválida.", 400) };
  }
  return { session };
}

/** `If-Match` header for the version field of a form, or null when it is missing or invalid. */
export function ifMatch(form: FormData): { "if-match": string } | null {
  const version = form.get("version");
  return typeof version === "string" && VERSION.test(version)
    ? { "if-match": `W/"${version}"` }
    : null;
}
