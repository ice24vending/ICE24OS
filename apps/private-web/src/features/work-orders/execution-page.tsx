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
      <main>
        <h1>Orden no disponible</h1>
        <p>Revisa el contexto y tus permisos.</p>
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
      <main>
        <h1>No fue posible consultar la ejecución</h1>
        <p>Recarga para volver a intentarlo.</p>
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
