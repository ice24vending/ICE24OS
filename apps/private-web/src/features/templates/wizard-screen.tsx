"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Banner,
  ButtonLink,
  Checkbox,
  PageHeader,
  ReadOnlyIndicator,
  Select,
  TextField,
  WizardLayout,
} from "@ice24/ui";

import { useUnsavedChanges } from "../context/unsaved-changes";
import { ActionFeedback, useTemplateAction, useTemplateStatus, type TemplateData } from "./shared";

const MODELS = [
  { value: "IC-500", label: "Despachadora de hielo IC-500" },
  { value: "IC-900", label: "Fábrica de hielo IC-900" },
  { value: "AP-200", label: "Purificadora de agua AP-200" },
];
const SERIAL = /^[A-Z]{3}-\d{5}$/u;

/** Wizard template (F6-09): equipment request in steps, per-step validation and final review. */
export function WizardScreen({ data, backHref }: { data: TemplateData; backHref: string }) {
  const router = useRouter();
  const submit = useTemplateAction(data, "equipment-request");
  const branches = [...new Set(data.machines.map((m) => m.branch))];
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [branch, setBranch] = useState("");
  const [invoice, setInvoice] = useState(false);
  // Anything typed and not sent yet (F6-11): leaving, switching context or closing asks first.
  useUnsavedChanges(!submit.result && Boolean(model || serial || branch || invoice));
  const status = useTemplateStatus(data, {
    title: "No hay sucursales disponibles.",
    message: "Para solicitar un alta, la cuenta necesita al menos una sucursal con máquinas.",
  });

  if (submit.result)
    return (
      <main id="main-content" className="private-shell template-screen">
        <PageHeader title="Solicitud de alta de equipo" />
        <Banner
          tone="success"
          role="status"
          title="Solicitud enviada"
          titleAs="h2"
          actions={
            <ButtonLink href="/plantillas/lista" variant="secondary" size="sm">
              Ver máquinas
            </ButtonLink>
          }
        >
          Folio {submit.result.folio}. ICE24 revisará el equipo {serial} ({model}) para {branch}.
        </Banner>
      </main>
    );

  const label = (options: { value: string; label: string }[], value: string) =>
    options.find((option) => option.value === value)?.label ?? "—";
  return (
    <main id="main-content" className="private-shell template-screen">
      <WizardLayout
        title="Solicitud de alta de equipo"
        description="Plantilla de flujo por pasos. La solicitud llega a ICE24 para validación; no activa la máquina."
        backHref={backHref}
        cancelHref={backHref}
        banner={
          <>
            {data.readOnly && (
              <ReadOnlyIndicator reason="Puedes revisar los pasos, pero no enviar la solicitud." />
            )}
            <ActionFeedback
              failure={submit.failure}
              onRetry={() => void submit.send()}
              onRefresh={() => {
                submit.reset();
                router.refresh();
              }}
            />
          </>
        }
        status={status}
        steps={[
          {
            id: "datos",
            label: "Datos básicos",
            content: (
              <>
                <Select
                  label="Modelo"
                  placeholder="Selecciona el modelo"
                  options={MODELS}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  required
                />
                <TextField
                  label="Número de serie"
                  help="Como aparece en la placa: tres letras, guion y cinco números (FAB-44910)."
                  value={serial}
                  onChange={(event) => setSerial(event.target.value.toUpperCase())}
                  required
                />
              </>
            ),
            validate: () => [
              ...(model ? [] : ["Elige el modelo de la máquina."]),
              ...(SERIAL.test(serial) ? [] : ["Escribe el número de serie como FAB-44910."]),
            ],
          },
          {
            id: "ubicacion",
            label: "Ubicación",
            content: (
              <Select
                label="Sucursal"
                placeholder="Selecciona la sucursal"
                options={branches.map((name) => ({ value: name, label: name }))}
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                required
              />
            ),
            validate: () => (branch ? [] : ["Elige la sucursal donde quedará la máquina."]),
          },
          {
            id: "documentos",
            label: "Documentos",
            content: (
              <Checkbox
                label="Adjuntaré la factura y la fotografía de la placa"
                help="ICE24 no valida el alta sin estos documentos."
                checked={invoice}
                onChange={(event) => setInvoice(event.target.checked)}
              />
            ),
            validate: () => (invoice ? [] : ["Confirma que adjuntarás la factura y la placa."]),
          },
        ]}
        summary={
          <dl className="template-summary">
            <div>
              <dt>Modelo</dt>
              <dd>{label(MODELS, model)}</dd>
            </div>
            <div>
              <dt>Número de serie</dt>
              <dd>{serial || "—"}</dd>
            </div>
            <div>
              <dt>Sucursal</dt>
              <dd>{branch || "—"}</dd>
            </div>
            <div>
              <dt>Documentos</dt>
              <dd>{invoice ? "Factura y placa" : "Pendientes"}</dd>
            </div>
          </dl>
        }
        finishLabel="Enviar solicitud"
        onFinish={() => void submit.send()}
        finishing={submit.sending}
        finishDisabledReason={submit.blocked}
      />
    </main>
  );
}
