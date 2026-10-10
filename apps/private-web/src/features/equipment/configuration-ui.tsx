"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useAccountAccess } from "../account-shell/access-provider";
import { toFailure, type Failure } from "../account-shell/failure";
import { ServiceState } from "../account-shell/service-state";
import { READ_ONLY_TEXT, type ConfigurationMode } from "./configuration-model";

/** Explains why the controls of a section are missing or disabled (UI/UX 13.7, RA-01-D2). */
export function ModeNotice({ mode }: { mode: ConfigurationMode }) {
  if (mode === "edit") return null;
  return (
    <p className="config-notice" data-mode={mode}>
      {READ_ONLY_TEXT[mode]}
    </p>
  );
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal confirmation (UI/UX "Confirmación de acción sensible"): entity, action, consequences and
 * a specific button. Focus moves into the dialog, Tab stays inside, Escape cancels and focus
 * returns to the control that opened it (WCAG 2.2: 2.1.2, 2.4.3, 2.4.11).
 */
export function ConfirmDialog({
  title,
  children,
  acknowledgement,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  /** Text of the checkbox the user must tick before confirming, if any. */
  acknowledgement?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [accepted, setAccepted] = useState(!acknowledgement);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus();
  }, []);
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <div className="config-dialog-backdrop">
      <div
        ref={dialog}
        className="config-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        onKeyDown={keyDown}
      >
        <h2 id={`${id}-title`}>{title}</h2>
        <div id={`${id}-body`}>{children}</div>
        {acknowledgement && (
          <label className="config-check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            {acknowledgement}
          </label>
        )}
        <div className="config-actions">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="config-primary" disabled={!accepted} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Result of an action: a message to announce, or `null` when it waits for a confirmation. */
export type ActionResult = string | null;

/**
 * Collapsible form for one auditable change: extra fields, mandatory reason (10+ characters, as
 * the API requires) and responsibility checkbox. Repeating the same body reuses its
 * Idempotency-Key. A version conflict shows the shared conflict state with a reload action.
 */
export function ActionForm({
  summary,
  submitLabel,
  children,
  disabled = false,
  emptyHint,
  defaultOpen = false,
  onSubmit,
  onReload,
}: {
  summary: string;
  submitLabel: string;
  children?: ReactNode;
  disabled?: boolean;
  /**
   * Shown (and the form disabled) when there is nothing to change, e.g. no client value to
   * restore. The form stays mounted so the result of the last action remains announced.
   */
  emptyHint?: string | undefined;
  defaultOpen?: boolean;
  onSubmit: (form: FormData, key: string) => Promise<ActionResult>;
  onReload: () => void;
}) {
  const id = useId();
  const { markReadOnly } = useAccountAccess();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState<Failure>();
  const last = useRef({ body: "", key: "" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending || emptyHint) return;
    const target = event.currentTarget;
    const form = new FormData(target);
    const serialized = JSON.stringify([...form.entries()].map(([k, v]) => [k, String(v)]));
    if (last.current.body !== serialized)
      last.current = { body: serialized, key: crypto.randomUUID() };
    setPending(true);
    setMessage("");
    setFailure(undefined);
    try {
      const result = await onSubmit(form, last.current.key);
      if (result !== null) {
        setMessage(result);
        last.current = { body: "", key: "" };
        target.reset();
      }
    } catch (cause) {
      if (cause instanceof RangeError) {
        setMessage(cause.message);
        return;
      }
      const next = toFailure(cause, "No fue posible guardar el cambio.");
      if (next.kind === "read_only") markReadOnly();
      if (next.kind === "conflict") setFailure(next);
      else setMessage(next.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="equipment-editor" open={defaultOpen || undefined}>
      <summary>{summary}</summary>
      <form onSubmit={submit} noValidate={false}>
        <fieldset disabled={disabled || pending || !!emptyHint}>
          <legend>{summary}</legend>
          {emptyHint && <p className="config-hint">{emptyHint}</p>}
          {children}
          <label htmlFor={`${id}-reason`}>Motivo del cambio (al menos 10 caracteres)</label>
          <textarea id={`${id}-reason`} name="reason" required minLength={10} maxLength={2000} />
          <label className="config-check">
            <input type="checkbox" name="confirmation" required />
            Confirmo que revisé los datos y deseo aplicar este cambio
          </label>
          <button type="submit" className="config-primary">
            {pending ? "Guardando…" : submitLabel}
          </button>
        </fieldset>
        <p role="status" className="config-status">
          {message}
        </p>
        {failure && (
          <ServiceState
            kind="conflict"
            message={failure.message}
            onRetry={() => {
              setFailure(undefined);
              onReload();
            }}
            retryLabel="Actualizar datos"
          />
        )}
      </form>
    </details>
  );
}

export interface TabItem {
  readonly id: string;
  readonly title: string;
}

/**
 * WAI-ARIA tabs with roving focus: arrow keys, Home and End move between tabs and activate
 * them; Tab moves into the panel.
 */
export function Tabs({
  label,
  idPrefix,
  tabs,
  active,
  onChange,
}: {
  label: string;
  idPrefix: string;
  tabs: readonly TabItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Move from the focused tab (WAI-ARIA APG), falling back to the selected one.
    const focused = tabs.findIndex((tab) => refs.current.get(tab.id) === event.target);
    const index = focused >= 0 ? focused : tabs.findIndex((tab) => tab.id === active);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    const tab = tabs[next]!;
    onChange(tab.id);
    refs.current.get(tab.id)?.focus();
  }
  return (
    <div role="tablist" aria-label={label} className="config-tabs" onKeyDown={keyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(node) => {
            if (node) refs.current.set(tab.id, node);
            else refs.current.delete(tab.id);
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${tab.id}`}
          aria-selected={tab.id === active}
          aria-controls={`${idPrefix}-panel-${tab.id}`}
          tabIndex={tab.id === active ? 0 : -1}
          onClick={() => onChange(tab.id)}
        >
          {tab.title}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  idPrefix,
  id,
  children,
}: {
  idPrefix: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${id}`}
      tabIndex={0}
      className="config-panel"
    >
      {children}
    </div>
  );
}

/** Frequency value + unit inputs named `<prefix>Value` / `<prefix>Unit`. */
export function FrequencyFields({
  prefix,
  legend,
  value,
  required = true,
  hint,
}: {
  prefix: string;
  legend: string;
  value?: { value: number; unit: string } | null | undefined;
  required?: boolean;
  hint?: string;
}) {
  const id = useId();
  return (
    <fieldset className="config-frequency">
      <legend className="config-legend">{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="config-hint">
          {hint}
        </p>
      )}
      <div className="config-inline">
        <label htmlFor={`${id}-value`}>
          Cada
          <input
            id={`${id}-value`}
            name={`${prefix}Value`}
            type="number"
            inputMode="numeric"
            min={1}
            max={3650}
            step={1}
            required={required}
            defaultValue={value?.value ?? ""}
            aria-describedby={hint ? `${id}-hint` : undefined}
          />
        </label>
        <label htmlFor={`${id}-unit`}>
          Unidad
          <select id={`${id}-unit`} name={`${prefix}Unit`} defaultValue={value?.unit ?? "days"}>
            <option value="days">Días</option>
            <option value="weeks">Semanas</option>
            <option value="months">Meses</option>
          </select>
        </label>
      </div>
    </fieldset>
  );
}

/** Loading / failure states of a section using the shared panel (UI/UX 17–19). */
export function SectionState({
  failure,
  onRetry,
}: {
  failure: Failure | undefined;
  onRetry: () => void;
}) {
  if (!failure) return <ServiceState kind="loading" message="Cargando la información…" />;
  return (
    <ServiceState
      kind={failure.kind}
      message={
        failure.kind === "forbidden"
          ? "No tienes permiso para consultar esta configuración en el contexto activo."
          : failure.message
      }
      onRetry={failure.kind === "forbidden" || failure.kind === "session" ? undefined : onRetry}
      retryLabel="Reintentar"
    />
  );
}
