"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink, Card, LiveRegion } from "@ice24/ui";
import { ServiceState } from "../../components/system-state/service-state";
import { toFailure, type Failure } from "../../components/system-state/failure";
import { useAccountAccess } from "../account-shell/access-provider";
import { useUnsavedChanges } from "../context/unsaved-changes";
import { ConfirmDialog } from "../equipment/configuration-ui";
import type { EquipmentClient } from "../equipment/configuration-client";
import { OPERATION } from "./model";
import type { MachineBranch, MachineDetail, MachineTransfer } from "./detail-model";

const TITLES = {
  metadata: "Nombre y marca",
  operational: "Estado operativo",
  move: "Sucursal",
  retire: "Retiro definitivo",
  transfer: "Transferencia a otra cuenta",
};
type Action = keyof typeof TITLES;
export function MachineAdministration({
  machine,
  branches,
  transfers,
  canManage,
  disabled,
  hasMfa,
  client,
  refresh,
}: {
  machine: MachineDetail;
  branches: MachineBranch[];
  transfers: MachineTransfer[];
  canManage: boolean;
  disabled: boolean;
  hasMfa: boolean;
  client: EquipmentClient;
  refresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Action>();
  const [message, setMessage] = useState("");
  const openers = useRef(new Map<Action, HTMLButtonElement>());
  const pending = transfers.filter((row) => ["pending", "approved"].includes(row.status));
  const values: Record<Action, string> = {
    metadata: [
      machine.data.internalName || "Sin registro",
      machine.data.commercialBrand || "Sin registro de marca",
    ].join(" · "),
    operational: [
      machine.operational_status ? OPERATION[machine.operational_status].label : "Sin registro",
      machine.conditionDates?.operational.reason || "Sin registro de motivo",
    ].join(" · "),
    move: machine.branchName || "Sin registro",
    retire:
      machine.operational_status === "retired"
        ? "Retirada definitivamente"
        : "Sin retiro definitivo",
    transfer: pending.length
      ? pending
          .map((row) => `${row.folio} · ${row.status === "approved" ? "Aprobada" : "Pendiente"}`)
          .join(", ")
      : "Sin solicitudes en curso",
  };
  function close(action: Action) {
    setEditing(undefined);
    openers.current.get(action)?.focus();
  }
  return (
    <Card title="Administración">
      <div className="machine-detail__administration">
        {(Object.keys(TITLES) as Action[]).map((action) => {
          const mfa = ["move", "retire", "transfer"].includes(action);
          const blocked =
            disabled || (mfa && !hasMfa) || (action === "transfer" && pending.length > 0);
          return (
            <section key={action} aria-label={TITLES[action]} className="machine-detail__admin-row">
              <div className="machine-detail__row-heading">
                <div>
                  <h3>{TITLES[action]}</h3>
                  <p>{values[action]}</p>
                </div>
                {canManage && (
                  <Button
                    ref={(node) => {
                      if (node) openers.current.set(action, node);
                      else openers.current.delete(action);
                    }}
                    variant="secondary"
                    icon="edit"
                    disabled={blocked}
                    aria-label={`Editar ${TITLES[action].toLocaleLowerCase("es-MX")}`}
                    onClick={() => {
                      setMessage("");
                      setEditing(action);
                    }}
                  >
                    Editar
                  </Button>
                )}
              </div>
              {canManage && mfa && !hasMfa && (
                <p>
                  Este cambio requiere verificar tu segundo factor.
                  <ButtonLink href="/access/mfa" variant="tertiary">
                    Verificar segundo factor
                  </ButtonLink>
                </p>
              )}
              {editing === action && (
                <AdministrationForm
                  key={`${action}:${machine.row_version}`}
                  action={action}
                  machine={machine}
                  branches={branches}
                  disabled={blocked}
                  client={client}
                  onCancel={() => close(action)}
                  onSaved={async () => {
                    await refresh();
                    setMessage("Cambio guardado.");
                    close(action);
                  }}
                />
              )}
            </section>
          );
        })}
      </div>
      <LiveRegion>{message}</LiveRegion>
    </Card>
  );
}

function AdministrationForm({
  action,
  machine,
  branches,
  disabled,
  client,
  onCancel,
  onSaved,
}: {
  action: Action;
  machine: MachineDetail;
  branches: MachineBranch[];
  disabled: boolean;
  client: EquipmentClient;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure>();
  const [confirmation, setConfirmation] = useState<{
    body: Record<string, unknown>;
    key: string;
  }>();
  const last = useRef({ serialized: "", key: "" });
  const { markReadOnly } = useAccountAccess();
  useUnsavedChanges(dirty);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("input,select,textarea")?.focus();
  }, []);
  async function save(body: Record<string, unknown>, key: string) {
    if (disabled || pending) return;
    setPending(true);
    setFailure(undefined);
    try {
      const suffix = {
        metadata: "",
        operational: "/operational-status",
        move: "/moves",
        retire: "/retire",
        transfer: "",
      }[action];
      await client.send(
        action === "transfer" ? "machine-transfers" : `machines/${machine.id}${suffix}`,
        body,
        { method: action === "metadata" ? "PATCH" : "POST", version: machine.row_version, key },
      );
      setDirty(false);
      setConfirmation(undefined);
      await onSaved();
    } catch (error) {
      const next = toFailure(error, "No fue posible guardar el cambio.");
      if (next.kind === "read_only") markReadOnly();
      setFailure(next);
    } finally {
      setPending(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending) return;
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    let body: Record<string, unknown>;
    if (action === "metadata")
      body = { internalName: text("internalName"), commercialBrand: text("commercialBrand") };
    else {
      body = { reason: text("reason"), confirmation: data.has("confirmation") };
      if (action === "operational") body.status = text("status");
      if (action === "move") body.toBranchId = text("toBranchId");
      if (action === "transfer")
        body = {
          ...body,
          machineId: machine.id,
          toAccountId: text("toAccountId"),
          toBranchId: text("toBranchId"),
          commercialDataTransfer: {
            sales: false,
            customers: false,
            recharges: false,
            orders: false,
          },
          authorizationFileIds: [],
        };
    }
    const serialized = JSON.stringify(body);
    if (last.current.serialized !== serialized)
      last.current = { serialized, key: crypto.randomUUID() };
    if (action === "retire" || action === "transfer")
      setConfirmation({ body, key: last.current.key });
    else void save(body, last.current.key);
  }
  return (
    <>
      <form
        ref={ref}
        onSubmit={submit}
        onInput={() => setDirty(true)}
        className="machine-detail__form"
        aria-label={`Editar ${TITLES[action].toLocaleLowerCase("es-MX")}`}
      >
        <fieldset disabled={disabled || pending}>
          <legend>{TITLES[action]}</legend>
          {action === "metadata" && (
            <>
              <label>
                Nombre
                <input
                  name="internalName"
                  defaultValue={machine.data.internalName ?? ""}
                  required
                  maxLength={200}
                />
              </label>
              <label>
                Marca
                <input
                  name="commercialBrand"
                  defaultValue={machine.data.commercialBrand ?? ""}
                  maxLength={200}
                />
              </label>
            </>
          )}
          {action === "operational" && (
            <label>
              Estado operativo
              <select name="status" defaultValue={machine.operational_status ?? ""} required>
                {Object.entries(OPERATION)
                  .filter(([state]) => state !== "retired")
                  .map(([state, look]) => (
                    <option key={state} value={state}>
                      {look.label}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {action === "move" && (
            <label>
              Sucursal
              <select name="toBranchId" defaultValue={machine.branch_id} required>
                {branches
                  .filter((row) => row.status === "active" || row.id === machine.branch_id)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.data.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {action === "transfer" && (
            <>
              <label>
                Cuenta destino
                <input name="toAccountId" required />
              </label>
              <label>
                Sucursal destino
                <input name="toBranchId" required />
              </label>
            </>
          )}
          {action !== "metadata" && (
            <>
              <label>
                Motivo del cambio
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  maxLength={2000}
                  defaultValue={
                    action === "operational"
                      ? (machine.conditionDates?.operational.reason ?? "")
                      : ""
                  }
                />
              </label>
              <label className="config-check">
                <input type="checkbox" name="confirmation" required />
                Confirmo que revisé los datos y deseo aplicar este cambio
              </label>
            </>
          )}
          <div className="config-actions">
            <Button variant="primary" type="submit" icon="save">
              {pending ? "Guardando…" : "Guardar"}
            </Button>
            <Button
              variant="tertiary"
              type="button"
              onClick={() => {
                setDirty(false);
                onCancel();
              }}
            >
              Cancelar
            </Button>
          </div>
        </fieldset>
        {failure && <ServiceState {...failure} />}
      </form>
      {confirmation && (
        <ConfirmDialog
          title={action === "retire" ? "Confirmar retiro definitivo" : "Confirmar transferencia"}
          acknowledgement={
            action === "retire"
              ? "Entiendo que el retiro es definitivo"
              : "Confirmo la cuenta y la sucursal de destino"
          }
          confirmLabel={action === "retire" ? "Retirar máquina" : "Solicitar transferencia"}
          onConfirm={() => {
            const value = confirmation;
            setConfirmation(undefined);
            void save(value.body, value.key);
          }}
          onCancel={() => setConfirmation(undefined)}
        >
          <p>
            {machine.data.internalName} · {machine.machine_code}
          </p>
          <p>
            {action === "retire"
              ? "La máquina dejará de operar. Se cancelarán las actividades futuras y las transferencias pendientes; el historial se conserva."
              : "Se solicitará transferir la máquina a otra cuenta. La solicitud requiere aprobación; el historial técnico se conserva."}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
