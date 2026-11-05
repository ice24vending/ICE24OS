import { redirect } from "next/navigation";
import {
  workOrderDetailSchema,
  workOrderPageSchema,
  workOrderQuerySchema,
  workOrderOptionsSchema,
  workOrderSourceSchema,
  ticketIdSchema,
  ticketDetailSchema,
} from "@ice24/contracts";
import { readBrowserSession } from "../../server/session/session";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { loadAccountShell } from "../../server/account/shell";
import { WorkOrdersScreen } from "./work-orders-screen";
import "../maintenance/tickets.css";
import "../maintenance/maintenance.css";
export async function WorkOrdersPage({
  mode,
  id,
  query = {},
}: {
  mode: "list" | "create" | "detail";
  id?: string;
  query?: Record<string, string | string[] | undefined>;
}) {
  const session = await readBrowserSession();
  if (!session?.contextId) redirect("/?error=expired");
  const shell = await loadAccountShell(session);
  const permissions = shell.capabilities?.permissions ?? [];
  const allowed = permissions.includes(
    mode === "create" ? "maintenance.orders-assign" : "maintenance.orders-read",
  );
  const filters = workOrderQuerySchema.safeParse({
    ...Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "")),
    machineId: session.focus?.machineId ?? (query.machineId || undefined),
  });
  const params = new URLSearchParams(
    filters.success
      ? Object.entries(filters.data)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      : [],
  );
  const source = workOrderSourceSchema.safeParse(query.sourceType),
    sourceId = ticketIdSchema.safeParse(query.sourceId);
  const valid =
    mode === "create"
      ? source.success && sourceId.success
      : mode === "detail"
        ? ticketIdSchema.safeParse(id).success
        : filters.success;
  const route =
    mode === "list"
      ? `work-orders?${params}`
      : mode === "detail"
        ? `work-orders/${id}`
        : `work-orders/options/${source.data}/${sourceId.data}`;
  const response = allowed && valid ? await callPrivateApi(route, session).catch(() => null) : null;
  const raw = response?.ok ? await response.json().catch(() => null) : null;
  const page = workOrderPageSchema.safeParse(raw),
    detail = workOrderDetailSchema.safeParse(raw);
  let options = workOrderOptionsSchema.safeParse(raw);
  let sourceTicketFolio: string | undefined;
  if (
    detail.success &&
    detail.data.order.ticketId &&
    permissions.includes("maintenance.tickets-read")
  ) {
    const ticket = await callPrivateApi(`tickets/${detail.data.order.ticketId}`, session).catch(
      () => null,
    );
    const parsed = ticketDetailSchema.safeParse(
      ticket?.ok ? await ticket.json().catch(() => null) : null,
    );
    if (parsed.success) sourceTicketFolio = parsed.data.ticket.folio;
  }
  if (detail.success && detail.data.canReassign) {
    const extra = await callPrivateApi(
      `work-orders/options/${detail.data.order.sourceType}/${detail.data.order.sourceId}`,
      session,
    ).catch(() => null);
    options = workOrderOptionsSchema.safeParse(
      extra?.ok ? await extra.json().catch(() => null) : null,
    );
  }
  return (
    <WorkOrdersScreen
      mode={mode}
      sourceTicketFolio={sourceTicketFolio}
      lockedMachineId={session.focus?.machineId ?? undefined}
      machineOptions={
        shell.selector.options && shell.selector.options !== "forbidden"
          ? shell.selector.options.machines.map((machine) => ({
              value: machine.id,
              label: `${machine.code} · ${machine.name}`,
            }))
          : []
      }
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      readOnly={shell.mode === "READ_ONLY"}
      items={page.success ? page.data.items : []}
      nextCursor={page.success ? page.data.nextCursor : null}
      detail={detail.success ? detail.data : undefined}
      options={options.success ? options.data : undefined}
      filters={Object.fromEntries(params)}
      failure={
        !shell.capabilities
          ? "error"
          : !allowed || response?.status === 403
            ? "forbidden"
            : !valid || !(page.success || detail.success || options.success)
              ? "error"
              : undefined
      }
    />
  );
}
