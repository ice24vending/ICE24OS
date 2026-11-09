import { NextResponse } from "next/server";
import { offlinePurgeReportSchema } from "@ice24/contracts";
import { readBrowserSession, requireValidCsrf } from "../../../../server/session/session";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { noStore, failure } from "../../../../server/bff/responses";
export async function GET(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return failure("Solicitud no autorizada.", 403);
  const session = await readBrowserSession();
  if (!session?.contextId)
    return NextResponse.json({ revoked: true }, { status: 401, headers: noStore });
  try {
    const response = await callPrivateApi("synchronization/access", session, {
      signal: AbortSignal.timeout(5000),
    });
    if ([401, 403, 404].includes(response.status))
      return NextResponse.json(
        { revoked: true, csrfToken: session.csrfToken },
        { status: response.status, headers: noStore },
      );
    if (!response.ok)
      return failure("No fue posible verificar el acceso. Conservamos tus datos.", 503);
    return NextResponse.json(
      { ...(await response.json()), csrfToken: session.csrfToken },
      { headers: noStore },
    );
  } catch {
    return failure("Sin conexión verificable. Conservamos tus datos.", 503);
  }
}
export async function POST(request: Request) {
  const session = await readBrowserSession();
  if (!session) return failure("Sesión requerida para registrar el recibo.", 401);
  const form = await request.formData().catch(() => null);
  if (!form) return failure("Datos inválidos.", 400);
  try {
    requireValidCsrf(request, session, form);
  } catch {
    return failure("Solicitud no autorizada.", 403);
  }
  let input: unknown;
  try {
    input = JSON.parse(String(form.get("data")));
  } catch {
    return failure("Datos inválidos.", 400);
  }
  const parsed = offlinePurgeReportSchema.safeParse(input);
  if (!parsed.success) return failure("Recibo inválido.", 400);
  try {
    const response = await callPrivateApi("synchronization/purge-receipts", session, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json(
      { recorded: response.ok },
      { status: response.status, headers: noStore },
    );
  } catch {
    return failure("El recibo se enviará al recuperar la conexión.", 503);
  }
}
