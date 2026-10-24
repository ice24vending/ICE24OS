import { NextResponse } from "next/server";
import { apiErrorSchema, type ErrorCode } from "@ice24/contracts";
import { readBrowserSession, requireValidCsrf, type BrowserSession } from "../session/session";
import type { BffCode } from "../../components/system-state/failure";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{8,128}$/u;
/** Row version sent by the UI for If-Match (F5-15, API.md optimistic concurrency). */
export const VERSION = /^[1-9][0-9]{0,8}$/u;
export const noStore = { "cache-control": "no-store" } as const;

/**
 * BFF failure body `{message, code?, correlationId?}`. The code is an API.md code (or the BFF's
 * own CONTEXT_CHANGED) that lets the screen pick its state; the message is always our own text;
 * the correlation is the API's, shown as the support reference (F6-10).
 */
export const failure = (message: string, status: number, code?: BffCode, correlationId?: string) =>
  NextResponse.json(
    { message, ...(code ? { code } : {}), ...(correlationId ? { correlationId } : {}) },
    { status, headers: noStore },
  );

/** API.md error of an upstream answer, if it carries a contract error. */
async function upstreamError(response: Response) {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.error : undefined;
}

/** API.md error code of an upstream answer, if it carries a contract error. */
export const upstreamCode = async (response: Response): Promise<ErrorCode | undefined> =>
  (await upstreamError(response))?.code;

/** API correlation of an upstream failure, for the support reference of a page state (F6-10). */
export const upstreamCorrelation = async (response: Response) =>
  (await upstreamError(response))?.correlationId;

/** Upstream failure rendered with a safe message per code; upstream text is never echoed. */
export async function upstreamFailure(
  response: Response,
  messages: Partial<Record<ErrorCode, string>>,
  fallback: string,
) {
  const error = await upstreamError(response);
  const code = error?.code;
  return failure((code && messages[code]) ?? fallback, response.status, code, error?.correlationId);
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
