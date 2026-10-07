import type { ErrorCode } from "@ice24/contracts";

/** Screen states shared by the account services (UI/UX 17 to 19). */
export type FailureKind =
  "session" | "forbidden" | "read_only" | "not_found" | "conflict" | "offline" | "error";

/** Codes the BFF may attach to a failure: API.md codes plus the BFF's own context check. */
export type BffCode = ErrorCode | "CONTEXT_CHANGED";

export interface Failure {
  readonly kind: FailureKind;
  readonly message: string;
  readonly status: number;
  readonly code?: string | undefined;
}

const CONFLICT_CODES = new Set([
  "PRECONDITION_FAILED",
  "STATE_TRANSITION_INVALID",
  "IDEMPOTENCY_CONFLICT",
  "CONFLICT",
  "CONTEXT_CHANGED",
]);

/** Maps an HTTP status (0 = no network) and an optional code to the state the screen shows. */
export function failureKind(status: number, code?: string): FailureKind {
  if (status === 0) return "offline";
  if (status === 401) return "session";
  if (code === "ACCOUNT_READ_ONLY") return "read_only";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 412 || (code !== undefined && CONFLICT_CODES.has(code))) return "conflict";
  // A 409 with another code is a business rule (e.g. RELATED_CONDITION_NOT_RESOLVED), not a race.
  if (status === 409 && code === undefined) return "conflict";
  return "error";
}

/** Reads the BFF failure body `{message, code?}`; upstream text is never shown. */
export async function readFailure(response: Response, fallback: string): Promise<Failure> {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    code?: unknown;
  } | null;
  const code = typeof body?.code === "string" ? body.code : undefined;
  return {
    kind: failureKind(response.status, code),
    message: typeof body?.message === "string" ? body.message : fallback,
    status: response.status,
    code,
  };
}

export const OFFLINE_MESSAGE =
  "Sin conexión. Necesitas red para consultar o cambiar esta información; no se realizó ningún cambio.";

/** A rejected `fetch` means the browser could not reach the BFF at all. */
export const networkFailure = (): Failure => ({
  kind: "offline",
  message: OFFLINE_MESSAGE,
  status: 0,
});

/** Error carrying a classified failure through async UI code. */
export class FailureError extends Error {
  constructor(readonly failure: Failure) {
    super(failure.message);
  }
}

/** `fetch` that classifies network errors and non-2xx answers as `FailureError`. */
export async function request(
  input: string,
  init: RequestInit,
  fallback: string,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (cause) {
    if (init.signal?.aborted) throw cause;
    throw new FailureError(networkFailure());
  }
  if (!response.ok) throw new FailureError(await readFailure(response, fallback));
  return response;
}

/** Normalizes anything thrown by UI code into a failure to render. */
export const toFailure = (cause: unknown, fallback: string): Failure =>
  cause instanceof FailureError ? cause.failure : { kind: "error", message: fallback, status: 500 };
