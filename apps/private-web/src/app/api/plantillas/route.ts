import { NextResponse } from "next/server";

import { failure, guard, noStore } from "../../../server/bff/responses";
import { demoIds } from "../../../server/demo/fixtures";
import { demoStateOf } from "../../../server/demo/session";

/** Writes the «Plantillas» screens can simulate (F6-09/F6-10). */
const ACTIONS = new Set(["equipment-request", "work-order-complete", "reading"]);
const SLOW_MS = 2_500;

/**
 * Idempotency of the demo writes: the same key always answers the same folio and never creates
 * another. shortcut: kept in this server process and capped; a restart forgets it (demo only).
 */
const DONE = new Map<string, string>();
const DONE_LIMIT = 500;
let issued = 0;

/**
 * Demo-only BFF of the template screens. Same checks as a real write (session, context, CSRF,
 * idempotency key) and the failures the panel selects: network error (503 with correlation),
 * read-only account (403 ACCOUNT_READ_ONLY), no permission (403) and version conflict (412).
 * Nothing is stored beyond the folio of each key.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure("Solicitud inválida.", 400);
  }
  const checked = await guard(request, form);
  if ("error" in checked) return checked.error;
  const state = demoStateOf(checked.session);
  if (!state) return new NextResponse(null, { status: 404 });
  const action = form.get("action");
  if (typeof action !== "string" || !ACTIONS.has(action)) return failure("Acción inválida.", 400);
  const correlationId = demoIds.correlation(999);
  if (state.network === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_MS));
  if (state.network === "error" || state.network === "offline")
    return failure(
      "El servicio no respondió. No se registró nada; puedes reintentar sin duplicar.",
      503,
      "DEPENDENCY_UNAVAILABLE",
      correlationId,
    );
  if (state.mode !== "ACTIVE")
    return failure("La cuenta está en modo lectura.", 403, "ACCOUNT_READ_ONLY", correlationId);
  if (state.scenario === "forbidden")
    return failure("No tienes permiso para esta acción.", 403, "FORBIDDEN", correlationId);
  if (state.scenario === "conflict")
    return failure(
      "Otra persona actualizó este registro. Actualiza y decide de nuevo.",
      412,
      "PRECONDITION_FAILED",
      correlationId,
    );
  const key = `${state.account}:${String(form.get("key"))}`;
  const known = DONE.get(key);
  if (known) return NextResponse.json({ folio: known, replayed: true }, { headers: noStore });
  if (DONE.size >= DONE_LIMIT) DONE.delete(DONE.keys().next().value!);
  const folio = `PL-${String(++issued).padStart(5, "0")}`;
  DONE.set(key, folio);
  return NextResponse.json({ folio, replayed: false }, { status: 201, headers: noStore });
}
