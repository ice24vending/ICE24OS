import { redirect } from "next/navigation";
import { ticketDetailSchema, ticketPageSchema, ticketQuerySchema } from "@ice24/contracts";
import { readBrowserSession } from "../../server/session/session";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { loadAccountShell } from "../../server/account/shell";
import { TicketsScreen } from "./tickets-screen";
import "./tickets.css";
import "../files/files.css";

export async function TicketsPage({
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
  const allowed = permissions.includes("maintenance.tickets-read");
  const filters = ticketQuerySchema.safeParse({
    ...query,
    machineId: session.focus?.machineId ?? query.machineId,
  });
  const params = new URLSearchParams(
    filters.success
      ? Object.entries(filters.data)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      : [],
  );
  const response =
    allowed && filters.success && mode !== "create"
      ? await callPrivateApi(
          mode === "detail" ? `tickets/${id}` : `tickets?${params}`,
          session,
        ).catch(() => null)
      : null;
  const raw = response?.ok ? await response.json().catch(() => null) : null;
  const page = ticketPageSchema.safeParse(raw);
  const detail = ticketDetailSchema.safeParse(raw);
  return (
    <TicketsScreen
      mode={mode}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      canCreate={permissions.includes("maintenance.tickets-create")}
      canEdit={permissions.includes("maintenance.tickets-edit")}
      canUpload={permissions.includes("files.upload") && permissions.includes("files.read")}
      readOnly={shell.mode === "READ_ONLY"}
      selectedMachine={filters.success ? filters.data.machineId : undefined}
      machines={
        shell.selector.options && shell.selector.options !== "forbidden"
          ? shell.selector.options.machines.map((m) => ({
              id: m.id,
              label: `${m.code} · ${m.name}`,
            }))
          : []
      }
      items={page.success ? page.data.items : []}
      nextCursor={page.success ? page.data.nextCursor : null}
      detail={detail.success ? detail.data : undefined}
      failure={
        !shell.capabilities
          ? "error"
          : !allowed || response?.status === 403
            ? "forbidden"
            : !filters.success
              ? "error"
              : mode === "create" || page.success || detail.success
                ? undefined
                : "error"
      }
    />
  );
}
