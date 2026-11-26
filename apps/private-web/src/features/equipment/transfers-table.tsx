"use client";
import { useRef, useState, type FormEvent } from "react";
import { Button, Checkbox, Dialog, EmptyState, StatusTag, Table, TextArea } from "@ice24/ui";
import type { StatusTone } from "@ice24/ui";

export interface TransferRow {
  id: string;
  row_version: number;
  folio?: string;
  status?: string;
  machine_id?: string;
  created_at?: string;
  data?: Record<string, unknown>;
}

const STATES: Record<string, [StatusTone, string]> = {
  pending: ["warning", "Pendiente"],
  approved: ["info", "Aprobada"],
  executed: ["success", "Ejecutada"],
  rejected: ["danger", "Rechazada"],
  cancelled: ["nodata", "Cancelada"],
};

/**
 * Transfers sent by the account (UXD-08). «Cancelar» keeps the previous rules: only pending
 * transfers, only for whoever may manage equipment, and it needs the second factor.
 */
export function TransfersTable({
  rows,
  machineNames,
  canCancel,
  hasMfa,
  cancel,
}: {
  rows: TransferRow[];
  machineNames: ReadonlyMap<string, string>;
  canCancel: boolean;
  hasMfa: boolean;
  cancel: (row: TransferRow, reason: string, key: string) => Promise<unknown>;
}) {
  const [target, setTarget] = useState<TransferRow>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target || pending) return;
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    setPending(true);
    setMessage("");
    try {
      await cancel(target, reason, key.current);
      setTarget(undefined);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cancelar.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Table
        caption="Transferencias enviadas"
        captionHidden
        rows={rows}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.folio ?? row.id}
        defaultSort={{ columnId: "created", direction: "descending" }}
        empty={
          <EmptyState
            title="Sin transferencias"
            description="Cuando solicites transferir una máquina a otra cuenta, aparecerá aquí con su estado."
          />
        }
        columns={[
          {
            id: "folio",
            header: "Folio",
            mono: true,
            mobile: "title",
            cell: (row) => row.folio,
            sortValue: (row) => row.folio,
          },
          {
            id: "machine",
            header: "Máquina",
            cell: (row) => machineNames.get(row.machine_id ?? "") ?? "Ya no pertenece a la cuenta",
          },
          {
            id: "status",
            header: "Estado",
            cell: (row) => {
              const [tone, label] = STATES[row.status ?? ""] ?? ["nodata", "Sin estado"];
              return <StatusTag tone={tone}>{label}</StatusTag>;
            },
            sortValue: (row) => STATES[row.status ?? ""]?.[1],
          },
          {
            id: "created",
            header: "Solicitada",
            cell: (row) =>
              row.created_at
                ? new Intl.DateTimeFormat("es-MX", {
                    dateStyle: "medium",
                    timeZone: "America/Mexico_City",
                  }).format(new Date(row.created_at))
                : "",
            sortValue: (row) => row.created_at,
          },
          {
            id: "reason",
            header: "Motivo",
            priority: "low",
            cell: (row) => String(row.data?.reason ?? ""),
          },
        ]}
        rowActions={
          canCancel
            ? (row) =>
                row.status === "pending" && (
                  <Button
                    variant="secondary"
                    icon="close"
                    disabled={!hasMfa}
                    aria-label={`Cancelar transferencia ${row.folio ?? ""}`}
                    onClick={() => {
                      key.current = crypto.randomUUID();
                      setMessage("");
                      setTarget(row);
                    }}
                  >
                    Cancelar
                  </Button>
                )
            : undefined
        }
      />
      <Dialog
        open={Boolean(target)}
        onClose={() => !pending && setTarget(undefined)}
        title={`Cancelar transferencia ${target?.folio ?? ""}`}
        description="La máquina se queda en tu cuenta. La cancelación queda registrada en la auditoría."
      >
        <form onSubmit={submit} className="transfer-cancel">
          <TextArea label="Motivo" name="reason" required minLength={10} maxLength={2000} />
          <Checkbox
            name="confirmation"
            required
            label="Confirmo que revisé los datos y deseo cancelar la transferencia"
          />
          {message && (
            <p role="alert" className="transfer-cancel__error">
              {message}
            </p>
          )}
          <div className="account-summary__actions">
            <Button variant="danger" type="submit" loading={pending}>
              Cancelar transferencia
            </Button>
            <Button variant="secondary" onClick={() => setTarget(undefined)} disabled={pending}>
              Volver
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
