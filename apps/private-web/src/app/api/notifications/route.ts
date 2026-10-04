import { NextResponse } from "next/server";
import {
  notificationPageSchema,
  notificationQuerySchema,
  notificationSummarySchema,
} from "@ice24/contracts";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { failure, guard, noStore, upstreamFailure } from "../../../features/notifications/bff";

/** Read-only BFF: own notifications (default) or `view=summary`. Only validated filters pass. */
export async function GET(request: Request) {
  const checked = await guard(request);
  if ("error" in checked) return checked.error;
  try {
    const params = new URL(request.url).searchParams;
    const view = params.get("view") ?? "list";
    params.delete("view");
    if (view === "summary") {
      if ([...params.keys()].length > 0) return failure("Consulta inválida.", 400);
      const response = await callPrivateApi("notifications/summary", checked.session, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return upstreamFailure(response);
      return NextResponse.json(notificationSummarySchema.parse(await response.json()), {
        headers: noStore,
      });
    }
    if (view !== "list") return failure("Consulta inválida.", 400);
    const query = notificationQuerySchema.safeParse(Object.fromEntries(params));
    if (!query.success) return failure("Revisa los filtros de avisos.", 400);
    const response = await callPrivateApi(`notifications?${params}`, checked.session, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return upstreamFailure(response);
    return NextResponse.json(notificationPageSchema.parse(await response.json()), {
      headers: noStore,
    });
  } catch {
    return failure("El centro de alertas no está disponible. Intenta nuevamente.", 503);
  }
}
