import { NextResponse } from "next/server";
import { fileListQuerySchema, filePageSchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { failure, guard, noStore, upstreamFailure } from "../../../features/files/bff";

export async function GET(request: Request) {
  const checked = await guard(request);
  if ("error" in checked) return checked.error;
  const parsed = fileListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return failure("La página de archivos no es válida.", 400);
  const query = new URLSearchParams({ limit: String(parsed.data.limit) });
  if (parsed.data.cursor) query.set("cursor", parsed.data.cursor);
  try {
    const response = await callPrivateApi(`files?${query}`, checked.session, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return upstreamFailure(response);
    return NextResponse.json(filePageSchema.parse(await response.json()), { headers: noStore });
  } catch {
    return failure(
      "No fue posible consultar los archivos. Intenta nuevamente.",
      503,
      "DEPENDENCY_UNAVAILABLE",
      crypto.randomUUID(),
    );
  }
}
