import { redirect } from "next/navigation";
import { ticketQuerySchema } from "@ice24/contracts";
import { readBrowserSession } from "../../server/session/session";
import { loadAccountShell } from "../../server/account/shell";
import { TicketsScreen } from "./tickets-screen";
import "./tickets.css";
import "../files/files.css";

export async function TicketsPage({
  query = {},
}: {
  mode: "create";
  query?: Record<string, string | string[] | undefined>;
}) {
  const session = await readBrowserSession();
  if (!session?.contextId) redirect("/?error=expired");
  const shell = await loadAccountShell(session);
  const permissions = shell.capabilities?.permissions ?? [];
  const allowed = permissions.includes("maintenance.tickets-read");
  const filters = ticketQuerySchema.safeParse({
    cursor: query.cursor,
    limit: query.limit,
    machineId: session.focus?.machineId ?? query.machineId,
  });
  return (
    <TicketsScreen
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      canCreate={permissions.includes("maintenance.tickets-create")}
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
      failure={
        !shell.capabilities
          ? "error"
          : !allowed
            ? "forbidden"
            : !filters.success
              ? "error"
              : undefined
      }
    />
  );
}
