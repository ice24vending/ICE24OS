"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createAccountCatalogEntrySchema,
  type EffectiveFrequency,
  type MachineComponentConfig,
  type MachineComponents,
  type MachineFrequencies,
} from "@ice24/contracts";
import { FailureError, toFailure, type Failure } from "../account-shell/failure";
import { ServiceState } from "../account-shell/service-state";
import type { EquipmentClient } from "./configuration-client";
import {
  ACTIVITY_TYPE_LABELS,
  NOTHING_TO_RESET,
  ORIGIN_LABELS,
  formatDate,
  formatFrequency,
  needsWarrantyWarning,
  readFrequency,
  sourceLabel,
  type ConfigurationMode,
  type FrequencyValue,
} from "./configuration-model";
import {
  ActionForm,
  ConfirmDialog,
  FrequencyFields,
  ModeNotice,
  SectionState,
  type ActionResult,
} from "./configuration-ui";

/** Catalog row of GET /v1/catalogs: official entries and the account's own (F4-18). */
export interface CatalogRow {
  id: string;
  kind?: string;
  code?: string;
  scope?: "OFFICIAL" | "ACCOUNT";
  data?: Record<string, unknown>;
}
interface OwnActivity {
  code: string;
  name: string;
  category: string;
  defaultFrequency: FrequencyValue;
  checklist: { label: string }[];
  evidenceRules: { required: boolean; minimumFiles: number };
}
const activityOf = (row: CatalogRow | undefined) =>
  row?.data?.maintenanceActivity as OwnActivity | undefined;
const catalogName = (row: CatalogRow) => String(row.data?.name ?? row.code ?? row.id);

/** Loads one resource; keeps the previous data visible while reloading. */
export function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ data?: T; failure?: Failure }>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (active) setState({ data });
      },
      (cause: unknown) => {
        if (active)
          setState({ failure: toFailure(cause, "No fue posible cargar la información.") });
      },
    );
    return () => {
      active = false;
    };
  }, [load, tick]);
  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, reload };
}

/** Pending RA-01-D1 confirmation: the user decides in the dialog; the form awaits the answer. */
export interface WarrantyQuestion {
  readonly activityName: string;
  readonly factory: readonly FrequencyValue[];
  readonly chosen: FrequencyValue;
  readonly scope: string;
  readonly resolve: (accepted: boolean) => void;
}
export function useWarrantyQuestion() {
  const [question, setQuestion] = useState<WarrantyQuestion>();
  const ask = useCallback(
    (
      activityName: string,
      factory: readonly FrequencyValue[],
      chosen: FrequencyValue,
      scope: string,
    ) =>
      new Promise<boolean>((resolve) =>
        setQuestion({
          activityName,
          factory,
          chosen,
          scope,
          resolve: (accepted) => {
            setQuestion(undefined);
            resolve(accepted);
          },
        }),
      ),
    [],
  );
  const dialog = question ? (
    <ConfirmDialog
      title="Advertencia: posible pérdida de garantía"
      acknowledgement="Entiendo que este cambio puede afectar la garantía y deseo continuar"
      confirmLabel="Aceptar y guardar"
      onConfirm={() => question.resolve(true)}
      onCancel={() => question.resolve(false)}
    >
      <p>
        Vas a cambiar <strong>{question.activityName}</strong> ({question.scope}) a cada{" "}
        <strong>{formatFrequency(question.chosen)}</strong>. El valor de fábrica de ICE24 es{" "}
        <strong>{question.factory.map((value) => formatFrequency(value)).join(" / ")}</strong>.
      </p>
      <p>
        ICE24 recomienda el valor de fábrica. Modificarlo puede provocar la pérdida de la garantía
        del equipo. La decisión queda registrada en la auditoría con tu usuario y la fecha. Puedes
        volver al valor de fábrica en cualquier momento con «Restablecer valores de fábrica».
      </p>
    </ConfirmDialog>
  ) : null;
  return { ask, dialog };
}

/** Sends a frequency change; asks for the warranty warning before or when the API requires it. */
export async function sendWithWarranty<T>(
  send: (acknowledged: boolean) => Promise<T>,
  warn: boolean,
  ask: () => Promise<boolean>,
): Promise<T | null> {
  if (warn && !(await ask())) return null;
  try {
    return await send(warn);
  } catch (cause) {
    if (
      !warn &&
      cause instanceof FailureError &&
      cause.failure.code === "WARRANTY_WARNING_CONFIRMATION_REQUIRED"
    ) {
      if (!(await ask())) return null;
      return send(true);
    }
    throw cause;
  }
}
export const WARRANTY_DECLINED =
  "No se guardó: rechazaste la advertencia de garantía. El valor anterior sigue vigente.";

function ComponentHistory({ history }: { history: MachineComponentConfig[] }) {
  return (
    <details className="config-history">
      <summary>Historial de cambios ({history.length})</summary>
      <ol>
        {[...history].reverse().map((row) => (
          <li key={row.id}>
            <strong>{row.component?.name ?? "Componente de un propietario anterior"}</strong> ·{" "}
            {row.status === "active" ? "Activo" : "Inactivo"} · {ORIGIN_LABELS[row.origin]} · del{" "}
            {formatDate(row.validFrom)} al {formatDate(row.validTo)} · versión {row.version}
            {row.reason ? ` · Motivo: ${row.reason}` : " · Registrado antes de la cuenta actual"}
          </li>
        ))}
      </ol>
    </details>
  );
}

/**
 * "Componentes" tab of the machine file (TASK-F4-22): active and inactive components with their
 * origin, add from the catalog, create an own component with its activity (RA-01-D3), activate
 * or deactivate, and the history. Writes follow RA-01-D2; the API re-checks them.
 */
export function MachineComponentsPanel({
  machineId,
  client,
  mode,
  canCreateOwn,
}: {
  machineId: string;
  client: EquipmentClient;
  mode: ConfigurationMode;
  canCreateOwn: boolean;
}) {
  const load = useCallback(
    async () =>
      Promise.all([
        client.get<MachineComponents>(`machines/${machineId}/components`),
        client.get<CatalogRow[]>("catalogs"),
      ]),
    [client, machineId],
  );
  const { data, failure, reload } = useResource(load);
  if (!data) return <SectionState failure={failure} onRetry={reload} />;
  const [components, catalog] = data;
  const editing = mode === "edit";
  const byId = new Map(catalog.map((row) => [row.id, row]));
  const configured = new Set(components.current.map((row) => row.componentCatalogId));
  const available = catalog.filter((row) => row.kind === "component" && !configured.has(row.id));
  const transition =
    (row: MachineComponentConfig, action: "activate" | "deactivate") =>
    async (form: FormData, key: string): Promise<ActionResult> => {
      await client.send(
        `machines/${machineId}/components/${row.id}/${action}`,
        { reason: String(form.get("reason")), confirmation: true },
        { version: row.version, key },
      );
      reload();
      return action === "activate"
        ? "Componente activado. El calendario se recalcula en segundo plano."
        : "Componente desactivado. Sus actividades futuras se cancelan; el historial se conserva.";
    };
  return (
    <section aria-labelledby={`components-${machineId}`}>
      <h4 id={`components-${machineId}`}>Componentes de la máquina</h4>
      <ModeNotice mode={mode} />
      {failure && <SectionState failure={failure} onRetry={reload} />}
      {components.current.length === 0 ? (
        <ServiceState
          kind="empty"
          title="Sin componentes"
          message="Esta máquina aún no tiene componentes configurados."
        />
      ) : (
        <ul className="config-list">
          {components.current.map((row) => {
            const entry = byId.get(row.componentCatalogId);
            const activity = activityOf(entry);
            return (
              <li key={row.id} className="config-card">
                <h5>{row.component?.name ?? "Componente de un propietario anterior"}</h5>
                <dl className="config-facts">
                  <div>
                    <dt>Origen</dt>
                    <dd>{ORIGIN_LABELS[row.origin]}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>
                      <span className={`config-badge config-badge--${row.status}`}>
                        {row.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Vigente desde</dt>
                    <dd>{formatDate(row.validFrom)}</dd>
                  </div>
                  {row.component && (
                    <div>
                      <dt>Código</dt>
                      <dd>{row.component.code}</dd>
                    </div>
                  )}
                  {activity && (
                    <div>
                      <dt>Actividad propia</dt>
                      <dd>
                        {activity.name} · cada {formatFrequency(activity.defaultFrequency)} ·{" "}
                        {activity.checklist.length} pasos ·{" "}
                        {activity.evidenceRules.required
                          ? `${activity.evidenceRules.minimumFiles} evidencia(s) obligatoria(s)`
                          : "evidencia opcional"}
                      </dd>
                    </div>
                  )}
                </dl>
                {editing && row.component && (
                  <ActionForm
                    summary={
                      row.status === "active"
                        ? `Desactivar ${row.component.name}`
                        : `Activar ${row.component.name}`
                    }
                    submitLabel={row.status === "active" ? "Desactivar" : "Activar"}
                    onSubmit={transition(row, row.status === "active" ? "deactivate" : "activate")}
                    onReload={reload}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ComponentHistory history={components.history} />
      {editing && (
        <ActionForm
          summary="Agregar componente del catálogo"
          submitLabel="Agregar componente"
          onReload={reload}
          onSubmit={async (form, key) => {
            await client.send(
              `machines/${machineId}/components`,
              {
                componentCatalogId: String(form.get("componentCatalogId")),
                reason: String(form.get("reason")),
                confirmation: true,
              },
              { key },
            );
            reload();
            return "Componente agregado. El calendario se recalcula en segundo plano.";
          }}
        >
          <label>
            Componente
            <select name="componentCatalogId" required defaultValue="">
              <option value="" disabled>
                Selecciona un componente
              </option>
              {available.map((row) => (
                <option key={row.id} value={row.id}>
                  {catalogName(row)} · {row.scope === "ACCOUNT" ? "propio" : "catálogo ICE24"}
                </option>
              ))}
            </select>
          </label>
          {available.length === 0 && (
            <p className="config-hint">
              Todos los componentes del catálogo ya están en la máquina.
            </p>
          )}
        </ActionForm>
      )}
      {editing && canCreateOwn && (
        <ActionForm
          summary="Crear componente propio"
          submitLabel="Crear y agregar a la máquina"
          onReload={reload}
          onSubmit={async (form, key) => {
            const frequency = readFrequency(form, "frequency");
            const parsed = createAccountCatalogEntrySchema.safeParse({
              code: String(form.get("code")).trim().toUpperCase(),
              kind: "component",
              name: String(form.get("name")).trim(),
              ...(String(form.get("description")).trim()
                ? { description: String(form.get("description")).trim() }
                : {}),
              maintenanceActivity: {
                code: String(form.get("activityCode")).trim().toUpperCase(),
                name: String(form.get("activityName")).trim(),
                category: String(form.get("category")),
                defaultFrequency: frequency,
                checklist: String(form.get("checklist"))
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((label, index) => ({ code: `PASO_${index + 1}`, label, required: true })),
                evidenceRules: {
                  required: form.has("evidenceRequired"),
                  minimumFiles: Number(form.get("minimumFiles") || 0),
                },
              },
            });
            if (!parsed.success)
              throw new RangeError(
                "Revisa los datos: código en mayúsculas (2 a 40 caracteres), nombre, frecuencia, al menos un paso del checklist y, si la evidencia es obligatoria, mínimo un archivo.",
              );
            const entry = await client.send<{ id: string }>(
              "account-catalog-entries",
              parsed.data,
              {
                key,
              },
            );
            await client.send(
              `machines/${machineId}/components`,
              {
                componentCatalogId: entry.id,
                reason: String(form.get("reason")),
                confirmation: true,
              },
              { key },
            );
            reload();
            return "Componente propio creado y agregado. Su actividad se programa en segundo plano.";
          }}
        >
          <div className="equipment-fields">
            <label>
              Código del componente
              <input name="code" required maxLength={40} pattern="[A-Za-z0-9_\-]{2,40}" />
            </label>
            <label>
              Nombre
              <input name="name" required maxLength={200} />
            </label>
            <label>
              Descripción (opcional)
              <input name="description" maxLength={1000} />
            </label>
            <label>
              Código de la actividad
              <input name="activityCode" required maxLength={40} pattern="[A-Za-z0-9_\-]{2,40}" />
            </label>
            <label>
              Nombre de la actividad
              <input name="activityName" required maxLength={200} />
            </label>
            <label>
              Tipo de actividad
              <select name="category" defaultValue="maintenance">
                <option value="maintenance">Mantenimiento</option>
                <option value="sanitation">Sanitización</option>
                <option value="inspection">Inspección</option>
              </select>
            </label>
          </div>
          <FrequencyFields prefix="frequency" legend="Frecuencia de la actividad" />
          <label>
            Pasos del checklist (uno por línea)
            <textarea name="checklist" required maxLength={4000} />
          </label>
          <div className="equipment-fields">
            <label className="config-check">
              <input type="checkbox" name="evidenceRequired" defaultChecked />
              La evidencia es obligatoria
            </label>
            <label>
              Evidencias mínimas
              <input name="minimumFiles" type="number" min={0} max={20} defaultValue={1} />
            </label>
          </div>
        </ActionForm>
      )}
    </section>
  );
}

function FrequencyCard({
  item,
  machineId,
  client,
  editing,
  ask,
  reload,
}: {
  item: EffectiveFrequency;
  machineId: string;
  client: EquipmentClient;
  editing: boolean;
  ask: ReturnType<typeof useWarrantyQuestion>["ask"];
  reload: () => void;
}) {
  const own = item.machineOverride;
  const target = {
    activityCode: item.activityCode,
    componentCatalogId: item.componentCatalogId,
  };
  const warn = item.warrantyApplies && item.differsFromFactory;
  return (
    <li className="config-card">
      <h6>
        {item.activityName}
        <span className="config-type"> · {ACTIVITY_TYPE_LABELS[item.activityType]}</span>
      </h6>
      <dl className="config-facts">
        <div>
          <dt>{item.warrantyApplies ? "Valor de fábrica ICE24" : "Valor por defecto (propio)"}</dt>
          <dd>{formatFrequency(item.factory.frequency)}</dd>
        </div>
        <div>
          <dt>Valor del cliente</dt>
          <dd>{item.source === "TEMPLATE" ? "Sin cambios" : formatFrequency(item.frequency)}</dd>
        </div>
        <div>
          <dt>Fuente del valor vigente</dt>
          <dd>{sourceLabel(item.source, !item.warrantyApplies)}</dd>
        </div>
        <div>
          <dt>Aviso anticipado</dt>
          <dd>
            {formatFrequency(item.alertLead, "Sin aviso")}
            {item.alertSource ? ` (${sourceLabel(item.alertSource, !item.warrantyApplies)})` : ""}
          </dd>
        </div>
      </dl>
      {warn && (
        <p className="config-warning">
          Distinto del valor de fábrica: puede afectar la garantía.
          {own?.warrantyWarningAcknowledgedAt &&
            ` Advertencia aceptada el ${formatDate(own.warrantyWarningAcknowledgedAt)}.`}
        </p>
      )}
      {editing && (
        <ActionForm
          summary={`Cambiar frecuencia de ${item.activityName}`}
          submitLabel="Guardar frecuencia"
          onReload={reload}
          onSubmit={async (form, key) => {
            const frequency = readFrequency(form, "frequency")!;
            const alertLead = readFrequency(form, "alert");
            const body = (acknowledged: boolean) => ({
              ...target,
              frequency,
              alertLead,
              ...(acknowledged ? { warrantyWarningAcknowledged: true } : {}),
              reason: String(form.get("reason")),
              confirmation: true,
            });
            const saved = await sendWithWarranty(
              (acknowledged) =>
                client.send(`machines/${machineId}/frequency-overrides`, body(acknowledged), {
                  method: own ? "PUT" : "POST",
                  version: own?.version,
                  key: acknowledged ? `${key}-ack` : key,
                }),
              needsWarrantyWarning(item.warrantyApplies, [item.factory.frequency], frequency),
              () => ask(item.activityName, [item.factory.frequency], frequency, "esta máquina"),
            );
            if (saved === null) return WARRANTY_DECLINED;
            reload();
            return "Frecuencia guardada. El calendario se recalcula en segundo plano; revísalo en «Calendario y trazabilidad».";
          }}
        >
          <FrequencyFields prefix="frequency" legend="Nueva frecuencia" value={item.frequency} />
          <FrequencyFields
            prefix="alert"
            legend="Aviso anticipado (opcional)"
            value={item.alertLead}
            required={false}
            hint="Déjalo vacío para no avisar antes del vencimiento."
          />
        </ActionForm>
      )}
      {editing && (
        <ActionForm
          emptyHint={own ? undefined : NOTHING_TO_RESET}
          summary={`Restablecer valor de fábrica de ${item.activityName}`}
          submitLabel="Restablecer valor de fábrica"
          onReload={reload}
          onSubmit={async (form, key) => {
            await client.send(
              `machines/${machineId}/frequency-overrides/reset`,
              {
                activityCode: item.activityCode,
                ...(item.componentCatalogId ? { componentCatalogId: item.componentCatalogId } : {}),
                reason: String(form.get("reason")),
                confirmation: true,
              },
              { key },
            );
            reload();
            return "Valor de fábrica restablecido. El calendario se recalcula en segundo plano.";
          }}
        />
      )}
    </li>
  );
}

/**
 * "Frecuencias y alertas" section (TASK-F4-22): per activity the ICE24 factory value, the
 * client value and its source (machine → account → template). Leaving the factory value asks
 * for the warranty warning (RA-01-D1); "Restablecer valores de fábrica" per activity, per
 * component and for the whole machine.
 */
export function MachineFrequenciesPanel({
  machineId,
  client,
  mode,
}: {
  machineId: string;
  client: EquipmentClient;
  mode: ConfigurationMode;
}) {
  const load = useCallback(
    async () =>
      Promise.all([
        client.get<MachineFrequencies>(`machines/${machineId}/frequencies`),
        client.get<MachineComponents>(`machines/${machineId}/components`),
      ]),
    [client, machineId],
  );
  const { data, failure, reload } = useResource(load);
  const { ask, dialog } = useWarrantyQuestion();
  if (!data) return <SectionState failure={failure} onRetry={reload} />;
  const [frequencies, components] = data;
  const editing = mode === "edit";
  const names = new Map(
    components.current.map((row) => [row.componentCatalogId, row.component?.name ?? null]),
  );
  const groups = new Map<string | null, EffectiveFrequency[]>();
  for (const item of frequencies.items)
    groups.set(item.componentCatalogId, [...(groups.get(item.componentCatalogId) ?? []), item]);
  const reset =
    (body: Record<string, unknown>, message: string) =>
    async (form: FormData, key: string): Promise<ActionResult> => {
      await client.send(
        `machines/${machineId}/frequency-overrides/reset`,
        { ...body, reason: String(form.get("reason")), confirmation: true },
        { key },
      );
      reload();
      return message;
    };
  return (
    <section aria-labelledby={`frequencies-${machineId}`}>
      <h4 id={`frequencies-${machineId}`}>Frecuencias y alertas</h4>
      <ModeNotice mode={mode} />
      <p className="config-hint">
        Orden de prioridad: valor de esta máquina → valor de la cuenta → valor de fábrica ICE24.
        Cambiar una frecuencia solo recalcula actividades futuras; el historial no cambia.
      </p>
      {failure && <SectionState failure={failure} onRetry={reload} />}
      {frequencies.items.length === 0 ? (
        <ServiceState
          kind="empty"
          title="Sin frecuencias configurables"
          message="Esta máquina no tiene actividades programadas por tiempo."
        />
      ) : (
        [...groups.entries()].map(([componentId, items]) => {
          const name = componentId ? (names.get(componentId) ?? "Componente propio") : null;
          return (
            <section key={componentId ?? "template"} className="config-group">
              <h5>{name ? `Componente propio: ${name}` : "Actividades de la plantilla ICE24"}</h5>
              <ul className="config-list">
                {items.map((item) => (
                  <FrequencyCard
                    key={`${item.componentCatalogId ?? ""}:${item.activityCode}`}
                    item={item}
                    machineId={machineId}
                    client={client}
                    editing={editing}
                    ask={ask}
                    reload={reload}
                  />
                ))}
              </ul>
              {editing && componentId && (
                <ActionForm
                  emptyHint={
                    items.some((item) => item.machineOverride) ? undefined : NOTHING_TO_RESET
                  }
                  summary={`Restablecer valores de fábrica del componente ${name}`}
                  submitLabel="Restablecer componente"
                  onReload={reload}
                  onSubmit={reset(
                    { componentCatalogId: componentId },
                    "Valores del componente restablecidos. El calendario se recalcula en segundo plano.",
                  )}
                />
              )}
            </section>
          );
        })
      )}
      {editing && frequencies.items.length > 0 && (
        <ActionForm
          emptyHint={
            frequencies.items.some((item) => item.machineOverride) ? undefined : NOTHING_TO_RESET
          }
          summary="Restablecer valores de fábrica de toda la máquina"
          submitLabel="Restablecer máquina"
          onReload={reload}
          onSubmit={reset(
            {},
            "Valores de la máquina restablecidos. Rigen los de la cuenta o los de fábrica.",
          )}
        />
      )}
      {frequencies.items.some((item) => item.source === "ACCOUNT") && (
        <p className="config-hint">
          Los valores definidos para toda la cuenta se restablecen en «Componentes y frecuencias» de
          la cuenta.
        </p>
      )}
      {dialog}
    </section>
  );
}
