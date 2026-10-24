"use client";
import { Badge, Banner, Button, Dialog, Icon, Select } from "@ice24/ui";
import { useState } from "react";

import { ACCOUNT_PARAM, BRANCH_PARAM } from "../navigation/deep-links";
import type { ContextSelectorData } from "./model";
import { discardUnsavedChanges, hasUnsavedChanges } from "./unsaved-changes";

const ALL = "";

/** A switch the viewer asked for; kept while the unsaved-changes confirmation is open. */
interface Switch {
  readonly url: "/api/session-context" | "/api/session-context/focus";
  readonly fields: Readonly<Record<string, string>>;
}

/**
 * Posts a context switch and, on success, loads the answer's location as a new document: the
 * React tree, the router cache and any data of the previous context are discarded.
 */
function useContextSwitch(csrfToken: string) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const send = async (change: Switch, key: string) => {
    setPending(key);
    setError(null);
    const body = new FormData();
    body.set("csrfToken", csrfToken);
    // The link's own account and branch would ask to switch back on landing (F6-11).
    const query = new URLSearchParams(window.location.search);
    query.delete(ACCOUNT_PARAM);
    query.delete(BRANCH_PARAM);
    const search = query.toString();
    body.set("returnTo", `${window.location.pathname}${search ? `?${search}` : ""}`);
    for (const [name, value] of Object.entries(change.fields)) body.set(name, value);
    try {
      const response = await fetch(change.url, {
        method: "POST",
        body,
        headers: { accept: "application/json" },
      });
      const data = (await response.json().catch(() => null)) as {
        location?: unknown;
        message?: unknown;
      } | null;
      if (response.ok && typeof data?.location === "string") {
        discardUnsavedChanges(); // Already confirmed: closing the page must not ask again.
        window.location.assign(data.location);
        return; // Stays pending until the new document replaces this one.
      }
      setError(
        typeof data?.message === "string" ? data.message : "No pudimos cambiar el contexto.",
      );
    } catch {
      setError("Sin conexión. Tu contexto no cambió; intenta de nuevo cuando vuelvas a estar en línea.");
    }
    setPending(null);
  };
  return { pending, error, send, clearError: () => setError(null) };
}

export interface ContextSelectorProps {
  readonly data: ContextSelectorData;
  readonly csrfToken: string;
}

/**
 * Topbar context selector (F6-08, UI_UX §10.2, AppFlow «cambio de cuenta/sucursal/máquina»):
 * always shows account, role, branch and machine; opens a dialog that is a bottom sheet on
 * mobile. Lists come from the server, already limited to what the viewer may reach.
 */
export function ContextSelector({ data, csrfToken }: ContextSelectorProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<{ change: Switch; key: string } | null>(null);
  const { pending, error, send, clearError } = useContextSwitch(csrfToken);
  const options = typeof data.options === "object" ? data.options : null;
  const [branchId, setBranchId] = useState(data.branch?.id ?? ALL);
  const [machineId, setMachineId] = useState(data.machine?.id ?? ALL);
  const machines = (options?.machines ?? []).filter(
    (machine) => branchId === ALL || machine.branchId === branchId,
  );

  const request = (change: Switch, key: string) => {
    if (hasUnsavedChanges()) setConfirming({ change, key });
    else void send(change, key);
  };
  const close = () => {
    setOpen(false);
    setConfirming(null);
    clearError();
    setBranchId(data.branch?.id ?? ALL);
    setMachineId(data.machine?.id ?? ALL);
  };
  const busy = pending !== null;
  const unchanged = branchId === (data.branch?.id ?? ALL) && machineId === (data.machine?.id ?? ALL);

  const accountName = data.current?.accountName ?? "Cuenta activa";
  const branchName = data.branch?.name ?? "Todas";
  const machineName = data.machine ? `${data.machine.name} (${data.machine.code})` : "Todas";

  const accounts = () => {
    if (data.accounts === null)
      return (
        <p className="context-selector__state" role="status">
          No pudimos cargar tus cuentas. Tu cuenta actual sigue activa; vuelve a abrir el selector
          en un momento.
        </p>
      );
    return (
      <ul className="context-selector__accounts">
        {data.accounts.map((account) => {
          const current = account.accountId === data.current?.accountId;
          const key = `account:${account.accountId}`;
          return (
            <li key={account.accountId}>
              <button
                type="button"
                className="context-selector__account"
                aria-current={current ? "true" : undefined}
                aria-busy={pending === key || undefined}
                disabled={busy && pending !== key}
                onClick={() =>
                  current
                    ? close()
                    : request(
                        { url: "/api/session-context", fields: { accountId: account.accountId } },
                        key,
                      )
                }
              >
                <span>
                  <strong>{account.accountName}</strong>
                  <small>{account.roles}</small>
                </span>
                {current && <Badge tone="brand">Actual</Badge>}
                {account.readOnly && <Badge>Solo lectura</Badge>}
                {pending === key && <span className="context-selector__busy">Cambiando…</span>}
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const focus = () => {
    if (data.options === null)
      return (
        <p className="context-selector__state" role="status">
          No pudimos cargar sucursales y máquinas. Tu selección actual sigue activa.
        </p>
      );
    if (data.options === "forbidden")
      return (
        <p className="context-selector__state">
          Tu rol trabaja con toda la cuenta; no elige sucursal ni máquina.
        </p>
      );
    if (data.options.branches.length === 0 && data.options.machines.length === 0)
      return (
        <p className="context-selector__state">
          Todavía no hay sucursales ni máquinas a tu alcance en esta cuenta.
        </p>
      );
    return (
      <form
        className="context-selector__focus"
        onSubmit={(event) => {
          event.preventDefault();
          if (unchanged) return close();
          request(
            { url: "/api/session-context/focus", fields: { branchId, machineId } },
            "focus",
          );
        }}
      >
        <Select
          label="Sucursal"
          name="branchId"
          value={branchId}
          disabled={busy}
          options={[
            { value: ALL, label: "Todas las sucursales" },
            ...data.options.branches.map((branch) => ({ value: branch.id, label: branch.name })),
          ]}
          onChange={(event) => {
            const next = event.target.value;
            setBranchId(next);
            // A machine of another branch would make the pair invalid.
            if (next !== ALL && options?.machines.find((m) => m.id === machineId)?.branchId !== next)
              setMachineId(ALL);
          }}
        />
        <Select
          label="Máquina"
          name="machineId"
          value={machineId}
          disabled={busy}
          help={machines.length === 0 ? "No hay máquinas en esta sucursal." : undefined}
          options={[
            { value: ALL, label: "Todas las máquinas" },
            ...machines.map((machine) => ({
              value: machine.id,
              label: `${machine.name} (${machine.code})`,
            })),
          ]}
          onChange={(event) => setMachineId(event.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          loading={pending === "focus"}
          loadingLabel="Aplicando…"
          disabled={busy && pending !== "focus"}
        >
          Aplicar sucursal y máquina
        </Button>
      </form>
    );
  };

  return (
    <>
      <button
        type="button"
        className="context-trigger"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="context-trigger__row">
          <span className="context-trigger__label">Cuenta</span>
          <strong>{accountName}</strong>
          <span className="context-trigger__label">Rol</span>
          <span className="context-trigger__role">{data.current?.roles ?? "—"}</span>
        </span>
        <span className="context-trigger__row context-trigger__row--muted">
          <span className="context-trigger__label">Sucursal</span>
          <span>{branchName}</span>
          <span aria-hidden="true">·</span>
          <span className="context-trigger__label">Máquina</span>
          <span>{machineName}</span>
        </span>
        <Icon name="chevron-down" className="context-trigger__chevron" />
        <span className="ids-visually-hidden">. Cambiar contexto</span>
      </button>

      <Dialog
        open={open}
        onClose={close}
        title={confirming ? "Tienes cambios sin guardar" : "Contexto de trabajo"}
        role={confirming ? "alertdialog" : "dialog"}
        dismissible={!busy}
        description={
          confirming
            ? "Si cambias de contexto ahora, los cambios de esta pantalla se perderán."
            : "Solo ves las cuentas, sucursales y máquinas a las que tienes acceso. Al cambiar, se descartan los datos de la selección anterior."
        }
        footer={
          confirming ? (
            <>
              <Button variant="secondary" onClick={() => setConfirming(null)} disabled={busy}>
                Seguir editando
              </Button>
              <Button
                variant="danger"
                loading={busy}
                loadingLabel="Cambiando…"
                onClick={() => void send(confirming.change, confirming.key)}
              >
                Descartar y cambiar
              </Button>
            </>
          ) : undefined
        }
      >
        {confirming ? undefined : (
          <div className="context-selector">
            {error && (
              <Banner tone="danger" role="alert" titleAs="p" title="No se cambió el contexto">
                <p>{error}</p>
              </Banner>
            )}
            <section aria-labelledby="context-selector-accounts">
              <h3 id="context-selector-accounts" className="context-selector__heading">
                Cuenta
              </h3>
              {accounts()}
            </section>
            <section aria-labelledby="context-selector-focus">
              <h3 id="context-selector-focus" className="context-selector__heading">
                Sucursal y máquina
              </h3>
              {focus()}
            </section>
          </div>
        )}
        {confirming && error && (
          <Banner tone="danger" role="alert" titleAs="p" title="No se cambió el contexto">
            <p>{error}</p>
          </Banner>
        )}
      </Dialog>
    </>
  );
}

/**
 * Shown while the saved branch or machine is out of reach (F6-08): the shell already works on
 * "all"; «Entendido» stores that, which the API also audits.
 */
export function FocusLostBanner({ csrfToken }: { readonly csrfToken: string }) {
  const { pending, error, send } = useContextSwitch(csrfToken);
  return (
    <Banner
      tone="warning"
      title="Cambió tu acceso"
      className="context-focus-lost"
      actions={
        <Button
          size="sm"
          variant="secondary"
          loading={pending !== null}
          loadingLabel="Guardando…"
          onClick={() =>
            void send(
              { url: "/api/session-context/focus", fields: { branchId: ALL, machineId: ALL } },
              "reset",
            )
          }
        >
          Entendido
        </Button>
      }
    >
      <p>
        Ya no tienes acceso a la sucursal o máquina que tenías seleccionada. Ahora ves todo lo que
        tu rol permite en esta cuenta.
      </p>
      {error && <p role="alert">{error}</p>}
    </Banner>
  );
}
