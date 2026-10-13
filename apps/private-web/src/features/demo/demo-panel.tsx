"use client";

import { useEffect, useRef, type FormEvent } from "react";

export interface DemoPanelOption {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
}

export interface DemoPanelProps {
  readonly csrfToken: string;
  readonly persona: string;
  readonly account: string;
  readonly branch: string;
  readonly mode: string;
  readonly network: string;
  readonly personas: readonly DemoPanelOption[];
  readonly accounts: readonly DemoPanelOption[];
  readonly branches: readonly DemoPanelOption[];
  readonly modes: readonly DemoPanelOption[];
  readonly networks: readonly DemoPanelOption[];
  /** Whether the selected persona is limited to one branch (the branch selector applies). */
  readonly branchScoped: boolean;
}

/**
 * Simulated loss of connection: online-only services read `navigator.onLine` (useOnline), so
 * the override makes them show their real offline state. Undone when the simulation stops.
 */
function useSimulatedOffline(offline: boolean) {
  useEffect(() => {
    if (!offline) return;
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
    return () => {
      Reflect.deleteProperty(navigator, "onLine");
      window.dispatchEvent(new Event("online"));
    };
  }, [offline]);
}

function Choice({
  name,
  label,
  value,
  options,
  help,
  disabled = false,
}: {
  name: string;
  label: string;
  value: string;
  options: readonly DemoPanelOption[];
  help?: string | undefined;
  disabled?: boolean;
}) {
  const helpId = help ? `demo-${name}-help` : undefined;
  return (
    <label className="demo-panel__field">
      <span>{label}</span>
      <select name={name} defaultValue={value} disabled={disabled} aria-describedby={helpId}>
        {options.map((option) => (
          <option key={option.value} value={option.value} title={option.hint}>
            {option.label}
          </option>
        ))}
      </select>
      {help && <small id={helpId}>{help}</small>}
    </label>
  );
}

/**
 * Floating "Demo" panel (F6-00). Only rendered by the root layout while ICE24_DEMO_MODE=1 outside
 * production; it lets reviewers switch persona, account, branch, account mode and network.
 * Permissions are not decided here: the server evaluates the chosen persona with
 * @ice24/authorization, like the API.
 */
export function DemoPanel(props: DemoPanelProps) {
  const returnTo = useRef<HTMLInputElement>(null);
  useSimulatedOffline(props.network === "offline");
  const persona = props.personas.find((option) => option.value === props.persona);
  const keepLocation = (event: FormEvent<HTMLFormElement>) => {
    if (returnTo.current)
      returnTo.current.value = `${window.location.pathname}${window.location.search}`;
    event.currentTarget.dataset.pending = "true";
  };
  return (
    <aside className="demo-panel" aria-label="Panel de demostración">
      <details>
        <summary>
          <span className="demo-panel__badge">Demo</span>
          <span>{persona?.label ?? "Persona"}</span>
        </summary>
        <p className="demo-panel__note">
          Datos ficticios. Los cambios no se guardan. Los permisos de cada persona son los reales.
        </p>
        <form method="post" action="/api/demo" onSubmit={keepLocation}>
          <input type="hidden" name="csrfToken" value={props.csrfToken} />
          <input type="hidden" name="returnTo" ref={returnTo} defaultValue="/workspace" />
          <Choice
            name="persona"
            label="Persona"
            value={props.persona}
            options={props.personas}
            help={persona?.hint}
          />
          <Choice name="account" label="Cuenta" value={props.account} options={props.accounts} />
          <Choice
            name="branch"
            label="Sucursal asignada"
            value={props.branch}
            options={props.branches}
            help={
              props.branchScoped
                ? "Sucursal del Administrador de sucursal y del Técnico."
                : "Solo aplica al Administrador de sucursal y al Técnico."
            }
          />
          <Choice
            name="mode"
            label="Estado de la cuenta"
            value={props.mode}
            options={props.modes}
          />
          <Choice name="network" label="Conexión" value={props.network} options={props.networks} />
          <div className="demo-panel__actions">
            <button className="button button--primary" type="submit">
              Aplicar
            </button>
            <button className="button button--secondary" type="submit" name="action" value="exit">
              Salir del demo
            </button>
          </div>
        </form>
      </details>
    </aside>
  );
}
