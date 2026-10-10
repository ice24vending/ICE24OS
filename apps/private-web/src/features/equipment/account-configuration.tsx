"use client";

import { useCallback, useState } from "react";
import type {
  AccountCatalogPage,
  ApplyModelFrequencyResult,
  FrequencyOverrides,
  ModelFrequencies,
  ModelFrequency,
} from "@ice24/contracts";
import { ServiceState } from "../account-shell/service-state";
import type { EquipmentClient } from "./configuration-client";
import {
  ACTIVITY_TYPE_LABELS,
  NOTHING_TO_RESET,
  SOURCE_LABELS,
  factoryOf,
  formatDate,
  formatFrequency,
  needsWarrantyWarning,
  readFrequency,
  type ConfigurationMode,
} from "./configuration-model";
import {
  ActionForm,
  FrequencyFields,
  ModeNotice,
  SectionState,
  type ActionResult,
} from "./configuration-ui";
import {
  WARRANTY_DECLINED,
  sendWithWarranty,
  useResource,
  useWarrantyQuestion,
} from "./machine-configuration";

interface ModelRow {
  id: string;
  name?: string;
  code?: string;
  data?: Record<string, unknown>;
}
interface MachineRow {
  id: string;
  model_id?: string;
  operational_status?: string;
}
const modelName = (row: ModelRow) => String(row.data?.name ?? row.name ?? row.code ?? row.id);

function ModelActivity({
  modelId,
  item,
  client,
  editing,
  ask,
  reload,
}: {
  modelId: string;
  item: ModelFrequency;
  client: EquipmentClient;
  editing: boolean;
  ask: ReturnType<typeof useWarrantyQuestion>["ask"];
  reload: () => void;
}) {
  const custom = item.machines.filter((machine) => machine.source !== "TEMPLATE").length;
  return (
    <li className="config-card">
      <h4>
        {item.activityName}
        <span className="config-type"> · {ACTIVITY_TYPE_LABELS[item.activityType]}</span>
      </h4>
      <dl className="config-facts">
        <div>
          <dt>Valor de fábrica ICE24</dt>
          <dd>{item.factoryFrequencies.map((value) => formatFrequency(value)).join(" / ")}</dd>
        </div>
        <div>
          <dt>Valor de la cuenta</dt>
          <dd>
            {item.accountOverride ? formatFrequency(item.accountOverride.frequency) : "Sin cambios"}
          </dd>
        </div>
        <div>
          <dt>Máquinas con valor del cliente</dt>
          <dd>
            {custom} de {item.machines.length}
          </dd>
        </div>
      </dl>
      <details className="config-history">
        <summary>Valor y fuente por máquina</summary>
        <ul>
          {item.machines.map((machine) => (
            <li key={machine.machineId}>
              {machine.machineCode}: cada {formatFrequency(machine.frequency)} ·{" "}
              {SOURCE_LABELS[machine.source]}
              {machine.differsFromFactory ? " · distinto de fábrica" : ""}
            </li>
          ))}
        </ul>
      </details>
      {editing && (
        <ActionForm
          summary={`Aplicar a todas mis máquinas del modelo: ${item.activityName}`}
          submitLabel="Aplicar a todas las máquinas del modelo"
          onReload={reload}
          onSubmit={async (form, key) => {
            const frequency = readFrequency(form, "frequency")!;
            const alertLead = readFrequency(form, "alert");
            const result = await sendWithWarranty(
              (acknowledged) =>
                client.send<ApplyModelFrequencyResult>(
                  `technical-models/${modelId}/frequency-overrides`,
                  {
                    activityCode: item.activityCode,
                    frequency,
                    alertLead,
                    ...(acknowledged ? { warrantyWarningAcknowledged: true } : {}),
                    reason: String(form.get("reason")),
                    confirmation: true,
                  },
                  { key: acknowledged ? `${key}-ack` : key },
                ),
              needsWarrantyWarning(true, item.factoryFrequencies, frequency),
              () =>
                ask(
                  item.activityName,
                  item.factoryFrequencies,
                  frequency,
                  `${item.machines.length} máquina(s) del modelo`,
                ),
            );
            if (result === null) return WARRANTY_DECLINED;
            reload();
            return `Frecuencia aplicada a ${result.applied.length} máquina(s)${
              result.skippedMachineIds.length
                ? `; ${result.skippedMachineIds.length} no tienen esta actividad`
                : ""
            }. Los calendarios se recalculan en segundo plano.`;
          }}
        >
          <FrequencyFields prefix="frequency" legend="Nueva frecuencia" />
          <FrequencyFields
            prefix="alert"
            legend="Aviso anticipado (opcional)"
            required={false}
            hint="Déjalo vacío para no avisar antes del vencimiento."
          />
        </ActionForm>
      )}
      {editing && (
        <ActionForm
          emptyHint={custom > 0 ? undefined : NOTHING_TO_RESET}
          summary={`Restablecer valores de fábrica en las máquinas del modelo: ${item.activityName}`}
          submitLabel="Restablecer actividad en el modelo"
          onReload={reload}
          onSubmit={async (form, key) => {
            await client.send(
              `technical-models/${modelId}/frequency-overrides/reset`,
              {
                activityCode: item.activityCode,
                reason: String(form.get("reason")),
                confirmation: true,
              },
              { key },
            );
            reload();
            return "Valores de fábrica restablecidos en las máquinas del modelo.";
          }}
        />
      )}
    </li>
  );
}

function ModelFrequenciesSection({
  modelId,
  client,
  editing,
}: {
  modelId: string;
  client: EquipmentClient;
  editing: boolean;
}) {
  const load = useCallback(
    () => client.get<ModelFrequencies>(`technical-models/${modelId}/frequencies`),
    [client, modelId],
  );
  const { data, failure, reload } = useResource(load);
  const { ask, dialog } = useWarrantyQuestion();
  if (!data) return <SectionState failure={failure} onRetry={reload} />;
  return (
    <>
      <p className="config-hint">
        {data.machineCount} máquina(s) activas de este modelo en tu cuenta. Aplicar un valor lo
        define en cada máquina y reemplaza el valor propio que tuviera; el valor de fábrica se
        conserva para reportes y garantía.
      </p>
      {data.items.length === 0 ? (
        <ServiceState
          kind="empty"
          title="Sin actividades configurables"
          message="Las máquinas de este modelo no tienen actividades programadas por tiempo."
        />
      ) : (
        <ul className="config-list">
          {data.items.map((item) => (
            <ModelActivity
              key={item.activityCode}
              modelId={modelId}
              item={item}
              client={client}
              editing={editing}
              ask={ask}
              reload={reload}
            />
          ))}
        </ul>
      )}
      {editing && data.items.length > 0 && (
        <ActionForm
          emptyHint={
            data.items.some((item) => item.machines.some((m) => m.machineOverride))
              ? undefined
              : NOTHING_TO_RESET
          }
          summary="Restablecer valores de fábrica en todas las máquinas de este modelo"
          submitLabel="Restablecer modelo"
          onReload={reload}
          onSubmit={async (form, key): Promise<ActionResult> => {
            await client.send(
              `technical-models/${modelId}/frequency-overrides/reset`,
              { reason: String(form.get("reason")), confirmation: true },
              { key },
            );
            reload();
            return "Valores de fábrica restablecidos en todas las máquinas del modelo.";
          }}
        />
      )}
      {dialog}
    </>
  );
}

/**
 * Account configuration of components and frequencies (TASK-F4-22): apply a frequency to all
 * the machines of a model, account-level values with "Restablecer valores de fábrica", and the
 * account's own components. Owner edits; other account-wide roles consult; the Operator never
 * reaches this screen (RA-01-D2).
 */
export function AccountConfiguration({
  client,
  mode,
  models,
}: {
  client: EquipmentClient;
  mode: ConfigurationMode;
  models: ModelRow[];
}) {
  const [modelId, setModelId] = useState("");
  const load = useCallback(
    async () =>
      Promise.all([
        client.get<FrequencyOverrides>("account-frequency-overrides"),
        client.get<AccountCatalogPage>("account-catalog-entries"),
        client.get<MachineRow[]>("machines"),
      ]),
    [client],
  );
  const { data, failure, reload } = useResource(load);
  if (!data) return <SectionState failure={failure} onRetry={reload} />;
  const [account, catalog, machines] = data;
  const editing = mode === "edit";
  const inUse = new Set(
    machines.filter((m) => m.operational_status !== "retired").map((m) => m.model_id),
  );
  const usedModels = models.filter((model) => inUse.has(model.id));
  return (
    <div className="config-account">
      <ModeNotice mode={mode} />
      {failure && <SectionState failure={failure} onRetry={reload} />}
      <section aria-labelledby="config-models">
        <h3 id="config-models">Frecuencias por modelo</h3>
        {usedModels.length === 0 ? (
          <ServiceState
            kind="empty"
            title="Sin máquinas activas"
            message="Cuando ICE24 active máquinas en tu cuenta podrás configurar sus frecuencias por modelo."
          />
        ) : (
          <label>
            Modelo
            <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
              <option value="">Selecciona un modelo</option>
              {usedModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {modelName(model)}
                </option>
              ))}
            </select>
          </label>
        )}
        {modelId && (
          <ModelFrequenciesSection
            key={modelId}
            modelId={modelId}
            client={client}
            editing={editing}
          />
        )}
      </section>
      <section aria-labelledby="config-account-values">
        <h3 id="config-account-values">Valores definidos para toda la cuenta</h3>
        {account.current.length === 0 ? (
          <p>Ninguno: todas las máquinas usan el valor de fábrica ICE24 o el de cada máquina.</p>
        ) : (
          <ul className="config-list">
            {account.current.map((row) => (
              <li key={row.id} className="config-card">
                <h4>{row.activityCode}</h4>
                <dl className="config-facts">
                  <div>
                    <dt>Valor de fábrica ICE24</dt>
                    <dd>{factoryOf(row)}</dd>
                  </div>
                  <div>
                    <dt>Valor de la cuenta</dt>
                    <dd>{formatFrequency(row.frequency)}</dd>
                  </div>
                  <div>
                    <dt>Vigente desde</dt>
                    <dd>{formatDate(row.validFrom)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
        {editing && (
          <ActionForm
            emptyHint={account.current.length > 0 ? undefined : NOTHING_TO_RESET}
            summary="Restablecer valores de fábrica de la cuenta"
            submitLabel="Restablecer cuenta"
            onReload={reload}
            onSubmit={async (form, key) => {
              await client.send(
                "account-frequency-overrides/reset",
                { reason: String(form.get("reason")), confirmation: true },
                { key },
              );
              reload();
              return "Valores de la cuenta restablecidos. Rigen los de fábrica o los de cada máquina.";
            }}
          />
        )}
      </section>
      <section aria-labelledby="config-own">
        <h3 id="config-own">Componentes propios de la cuenta</h3>
        {catalog.items.length === 0 ? (
          <p>
            Aún no hay componentes propios. Créalos desde la pestaña «Componentes» del expediente de
            una máquina.
          </p>
        ) : (
          <ul className="config-list">
            {catalog.items.map((entry) => (
              <li key={entry.id} className="config-card">
                <h4>
                  {entry.name} <span className="config-type">· {entry.code}</span>
                </h4>
                <p>
                  {entry.status === "active" ? "Activo" : "Retirado"}
                  {entry.maintenanceActivity &&
                    ` · ${entry.maintenanceActivity.name} cada ${formatFrequency(
                      entry.maintenanceActivity.defaultFrequency,
                    )}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
