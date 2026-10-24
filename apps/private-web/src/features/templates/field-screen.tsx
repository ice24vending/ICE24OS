"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Banner,
  Button,
  Checkbox,
  MobileOperationalLayout,
  ReadOnlyIndicator,
  SyncStatus,
  TextArea,
} from "@ice24/ui";

import { useAccountAccess } from "../account-shell/access-provider";
import {
  removeLocal,
  saveLocally,
  usePendingOperations,
} from "../../components/system-state/local-data";
import { ActionFeedback, useTemplateAction, useTemplateStatus, type TemplateData } from "./shared";

const ACTION = "work-order-complete";
const STEPS = [
  "Desconectar alimentación",
  "Revisar filtro",
  "Limpiar tolva",
  "Prueba final de despacho",
];

/**
 * Field template (F6-09, UI_UX §14.8): a work order for one hand and gloves. «Guardar en este
 * dispositivo» works without network (local queue, F6-10); «Completar orden» needs network and
 * the full checklist. Queued orders are sent later with their own id as idempotency key.
 */
export function FieldScreen({ data }: { data: TemplateData }) {
  const router = useRouter();
  const { online, canWrite, blockedText } = useAccountAccess();
  const complete = useTemplateAction(data, ACTION);
  const pending = usePendingOperations(data.accountId).filter((op) => op.action === ACTION);
  const [checked, setChecked] = useState<readonly string[]>(STEPS.slice(0, 2));
  const [notice, setNotice] = useState("");
  const [sendingQueue, setSendingQueue] = useState(false);
  const machine = data.machines[0];
  const status = useTemplateStatus(data, {
    title: "No tienes órdenes asignadas.",
    message: "Cuando te asignen una orden de trabajo aparecerá aquí, lista para trabajar sin red.",
  });
  const missing = STEPS.length - checked.length;

  const saveHere = async () => {
    // The local id is the idempotency key of the later send.
    const id = complete.intentKey();
    try {
      await saveLocally({
        id,
        accountId: data.accountId ?? "",
        action: ACTION,
        createdAt: new Date().toISOString(),
        state: "pending",
        href: "/plantillas/campo",
        attempts: 0,
      });
      setNotice("Orden guardada en este dispositivo. Envíala cuando haya conexión.");
    } catch {
      setNotice("Este navegador no permite guardar datos locales; necesitas conexión para enviar.");
    }
  };
  const finish = async () => {
    if (!online) return saveHere();
    const id = complete.intentKey();
    const done = await complete.send();
    if (!done) return;
    setNotice("");
    // Sent with the key it may have been saved under: drop the local copy.
    await removeLocal(id);
  };
  const sendQueue = async () => {
    setSendingQueue(true);
    for (const operation of pending) {
      const done = await complete.send(operation.id);
      if (!done) break;
      await removeLocal(operation.id);
    }
    setSendingQueue(false);
  };

  const writeBlocked = canWrite ? undefined : blockedText;
  return (
    <main id="main-content" className="private-shell template-screen template-screen--field">
      <MobileOperationalLayout
        backHref="/plantillas"
        backLabel="Plantillas"
        title="OT-00241 · Mantenimiento preventivo"
        subtitle={machine ? `${machine.code} · ${machine.name}` : undefined}
        statusBar={
          <SyncStatus
            state={!online ? "offline" : pending.length ? "pending" : "available_offline"}
            pendingCount={pending.length || undefined}
          />
        }
        progress={
          status
            ? undefined
            : {
                value: checked.length,
                max: STEPS.length,
                label: `Progreso ${checked.length} de ${STEPS.length}`,
              }
        }
        banner={
          <>
            {data.readOnly && (
              <ReadOnlyIndicator reason="Puedes consultar la orden, pero no registrar avances." />
            )}
            {complete.result && (
              <Banner tone="success" role="status" title="Orden completada" titleAs="p">
                OT-00241 se cerró con folio {complete.result.folio}
                {complete.result.replayed && " (ya estaba registrada; no se duplicó)"}.
              </Banner>
            )}
            {notice && <Banner tone="info" role="status" title={notice} titleAs="p" />}
            {pending.length > 0 && (
              <Banner
                tone={online ? "warning" : "offline"}
                title={`${pending.length === 1 ? "1 orden pendiente" : `${pending.length} órdenes pendientes`} de enviar`}
                titleAs="p"
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void sendQueue()}
                    loading={sendingQueue}
                    loadingLabel="Enviando…"
                    disabledReason={complete.blocked}
                  >
                    Enviar ahora
                  </Button>
                }
              >
                Guardadas en este dispositivo. Al enviarlas se usa la misma clave: no se duplican.
              </Banner>
            )}
            <ActionFeedback
              failure={complete.failure}
              onRetry={() => void complete.send()}
              onRefresh={() => {
                complete.reset();
                router.refresh();
              }}
            />
          </>
        }
        status={status}
        secondaryAction={
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon="download"
            onClick={() => void saveHere()}
            disabledReason={writeBlocked}
          >
            Guardar en este dispositivo
          </Button>
        }
        primaryAction={
          <Button
            size="lg"
            fullWidth
            onClick={() => void finish()}
            loading={complete.sending}
            loadingLabel="Enviando…"
            disabledReason={
              writeBlocked ??
              (status ? "No hay una orden para completar." : undefined) ??
              (missing > 0
                ? `Faltan ${missing} ${missing === 1 ? "paso" : "pasos"} del checklist.`
                : undefined)
            }
          >
            {online ? "Completar orden" : "Guardar y completar cuando haya red"}
          </Button>
        }
      >
        <fieldset className="ids-field-layout__checklist">
          <legend>Checklist</legend>
          {STEPS.map((step) => (
            <Checkbox
              key={step}
              label={step}
              checked={checked.includes(step)}
              disabled={!canWrite}
              onChange={(event) =>
                setChecked((current) =>
                  event.target.checked
                    ? [...current, step]
                    : current.filter((item) => item !== step),
                )
              }
            />
          ))}
        </fieldset>
        <TextArea
          label="Diagnóstico"
          readOnly={!canWrite}
          defaultValue="Filtro con sedimento leve."
        />
      </MobileOperationalLayout>
    </main>
  );
}
