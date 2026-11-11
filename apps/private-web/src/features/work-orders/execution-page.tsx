import { ButtonLink, SystemState } from "@ice24/ui";
import { redirect } from "next/navigation";
import {
  workOrderDetailSchema,
  workOrderExecutionDetailSchema,
  ticketIdSchema,
} from "@ice24/contracts";
import { readBrowserSession } from "../../server/session/session";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { authorizeWorkOrderBff } from "./work-orders-authorization";
import { ExecutionScreen } from "./execution-screen";

export async function ExecutionPage({
  id,
  mode,
}: {
  id: string;
  mode: "execute" | "close" | "review";
}) {
  const session = await readBrowserSession();
  if (!session?.contextId) redirect("/?error=expired");
  if (!ticketIdSchema.safeParse(id).success || (await authorizeWorkOrderBff(session, "read")))
    return (
      <main id="main-content" className="private-shell">
        <h1>Orden no disponible</h1>
        <SystemState
          kind="forbidden"
          message="Revisa el contexto y tus permisos."
          action={
            <ButtonLink icon="list" variant="secondary" href="/maintenance/work-orders">
              Volver a órdenes
            </ButtonLink>
          }
        />
      </main>
    );
  const responses = await Promise.all(
    [`work-orders/${id}`, `work-orders/${id}/execution`].map((path) =>
      callPrivateApi(path, session).catch(() => null),
    ),
  );
  const values = await Promise.all(
    responses.map((r) => (r?.ok ? r.json().catch(() => null) : null)),
  );
  const order = workOrderDetailSchema.safeParse(values[0]);
  const execution = workOrderExecutionDetailSchema.safeParse(values[1]);
  if (!order.success || !execution.success)
    return (
      <main id="main-content" className="private-shell">
        <h1>Consulta de la ejecución</h1>
        <SystemState
          kind={responses.some((response) => response?.status === 403) ? "forbidden" : "error"}
          action={
            <ButtonLink icon="list" variant="secondary" href="/maintenance/work-orders">
              Volver a órdenes
            </ButtonLink>
          }
        />
      </main>
    );
  return (
    <ExecutionScreen
      order={order.data.order}
      detail={execution.data}
      mode={mode}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
    />
  );
}
