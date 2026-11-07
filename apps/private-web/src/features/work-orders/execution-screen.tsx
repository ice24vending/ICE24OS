"use client";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Button,
  ButtonLink,
  Comparator,
  EvidenceReading,
  EvidenceLot,
  EvidenceSignature,
} from "@ice24/ui";
import {
  workOrderSchema,
  type WorkOrder,
  type WorkOrderExecution,
  type WorkOrderExecutionDetail,
  type ExecutionEvidence,
} from "@ice24/contracts";
import { assessWorkOrderExecution } from "@ice24/domain";
import { useAccountAccess } from "../account-shell/access-provider";
import { useUnsavedChanges } from "../context/unsaved-changes";
import { request, toFailure } from "../../components/system-state/failure";
import { EvidencePhoto } from "./evidence-photo";
import { DownloadOrder } from "../sync/download-order";

const noChanges = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;
const empty: WorkOrderExecution = {
  checklist: [],
  fields: {},
  diagnosis: "",
  activitiesPerformed: "",
  parts: [],
  tests: "",
  recommendation: "",
  evidence: [],
  result: "conforming",
  followup: "",
};
const textFields = [
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "activitiesPerformed", label: "Actividades realizadas" },
  { key: "tests", label: "Pruebas realizadas" },
  { key: "recommendation", label: "Recomendación" },
] as const;
const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));

function describeValue(
  key: "checklist" | "fields" | "parts" | "evidence" | "result" | "followup",
  value: WorkOrderExecution,
  order: WorkOrder,
): string {
  if (key === "checklist")
    return (
      value.checklist
        .map((code) => order.definition.checklist.find((step) => step.code === code)?.label ?? code)
        .join("; ") || "Sin pasos completados"
    );
  if (key === "fields")
    return (
      Object.entries(value.fields)
        .map(
          ([code, item]) =>
            `${"fields" in order.definition ? (order.definition.fields.find((field) => field.code === code)?.label ?? code) : code}: ${typeof item === "boolean" ? (item ? "Sí" : "No") : item}`,
        )
        .join("; ") || "Sin campos adicionales"
    );
  if (key === "parts")
    return (
      value.parts
        .map(
          (part) =>
            `${part.name}: ${part.quantity} ${part.unit}${part.lot ? ` · Lote ${part.lot}` : ""}`,
        )
        .join("; ") || "Sin refacciones"
    );
  if (key === "evidence")
    return (
      value.evidence
        .map((item) => {
          const label =
            order.definition.evidenceRules.requirements?.find(
              (r) => r.code === item.requirementCode,
            )?.label ?? "Foto de evidencia";
          return `${label}: ${item.type === "photo" ? "archivo adjunto" : item.type === "reading" ? `${item.value} ${item.unit}` : item.type === "signature" ? `Confirmado por ${item.name}` : item.value}`;
        })
        .join("; ") || "Sin evidencia"
    );
  if (key === "result")
    return {
      conforming: "Conforme",
      observations: "Con observaciones",
      nonconforming: "No conforme",
    }[value.result];
  return value.followup || "Sin seguimiento";
}

function LocalPhotoSlot({
  renderPhoto,
  code,
  label,
  onVerified,
}: {
  renderPhoto: (
    code: string,
    label: string,
    onVerified: (e: ExecutionEvidence) => void,
  ) => ReactNode;
  code: string;
  label: string;
  onVerified: (e: ExecutionEvidence) => void;
}) {
  return renderPhoto(code, label, onVerified);
}
export function ExecutionScreen({
  order: initialOrder,
  detail,
  mode,
  contextId,
  csrfToken,
  local,
}: {
  order: WorkOrder;
  detail: WorkOrderExecutionDetail;
  mode: "execute" | "close" | "review";
  contextId: string;
  csrfToken: string;
  local?: {
    blocked: boolean;
    onChange: (data: WorkOrderExecution) => void;
    onClose: (data: WorkOrderExecution) => Promise<void>;
    onReview: () => void;
    onEditField: (field: string) => void;
    renderPhoto: (
      code: string,
      label: string,
      onVerified: (e: ExecutionEvidence) => void,
    ) => ReactNode;
  };
}) {
  const access = useAccountAccess();
  const hydrated = useSyncExternalStore(noChanges, clientReady, serverReady);
  const latest = detail.revisions[0]?.execution ?? empty;
  const [order, setOrder] = useState(initialOrder);
  const [data, setData] = useState<WorkOrderExecution>(latest);
  const currentData = useRef(data);
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [reviewAction, setReviewAction] = useState(
    detail.canReview ? "review" : "request_correction",
  );
  const [done, setDone] = useState(false);
  const [comparisonId, setComparisonId] = useState(
    detail.revisions.find((r) => r.kind === "closure")?.id ?? detail.revisions.at(-1)?.id ?? "",
  );
  const comparison = detail.revisions.find((r) => r.id === comparisonId);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  useUnsavedChanges(dirty || Object.values(pendingPhotos).some(Boolean));
  const editing = mode === "execute" || (mode === "review" && reviewAction === "correct");
  const authorized =
    mode === "review" ? detail.canReview || detail.canRequestCorrection : detail.canExecute;
  const blocked =
    !hydrated ||
    busy ||
    done ||
    !access.canWrite ||
    (!local && !access.online) ||
    !authorized ||
    !!local?.blocked;
  const assessment = assessWorkOrderExecution(order.definition, data);
  if (mode === "close") {
    for (const item of detail.missing)
      if (
        !assessment.missing.some(
          (existing) => existing.field === item.field && existing.message === item.message,
        )
      )
        assessment.missing.push(item);
    assessment.complete = assessment.missing.length === 0;
  }
  const update = (patch: Partial<WorkOrderExecution>) => {
    currentData.current = { ...currentData.current, ...patch };
    setData(currentData.current);
    if (local) local.onChange(currentData.current);
    setDirty(!local);
  };
  function evidence(value: ExecutionEvidence, append = false) {
    update({
      evidence: [
        ...(append
          ? currentData.current.evidence
          : currentData.current.evidence.filter(
              (e) => e.requirementCode !== value.requirementCode,
            )),
        value,
      ],
    });
  }
  async function send(kind: "execution" | "transitions" | "reviews", value: unknown) {
    if (blocked) return;
    if (local) {
      setBusy(true);
      try {
        await local.onClose(data);
        setDone(true);
        setMessage(
          "Cierre guardado en este dispositivo. Pendiente de sincronizar y verificar evidencias.",
        );
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "No fue posible guardar el cierre local.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    const payload = JSON.stringify({ kind, value, version: order.rowVersion });
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    const form = new FormData();
    form.set("data", JSON.stringify(value));
    form.set("csrfToken", csrfToken);
    form.set("key", attempt.current.key);
    form.set("version", String(order.rowVersion));
    setBusy(true);
    setMessage("");
    try {
      const response = await request(
        `/api/work-orders/${order.id}/${kind}`,
        { method: "POST", headers: { "x-ice24-workspace-context": contextId }, body: form },
        "No fue posible guardar. Conservamos los datos del formulario.",
      );
      setOrder(workOrderSchema.parse(await response.json()));
      setDirty(false);
      attempt.current = null;
      setMessage(
        kind === "execution"
          ? "Borrador guardado en el servidor."
          : "Operación registrada. El historial anterior se conserva.",
      );
      if (kind !== "execution") setDone(true);
    } catch (cause) {
      setMessage(
        toFailure(cause, "No fue posible guardar. Reintenta con los mismos datos.").message,
      );
    } finally {
      setBusy(false);
      queueMicrotask(() => feedback.current?.focus());
    }
  }
  const requirements = order.definition.evidenceRules.requirements ?? [];
  const actorLabel = (id: string) => (id === order.assigneeId ? (order.assigneeName ?? id) : id);
  const photos = requirements.filter((r) => r.type.endsWith("_photo"));
  if (!requirements.length && order.definition.evidenceRules.required)
    photos.push({
      code: "legacy",
      label: "Fotos de evidencia",
      type: "before_photo",
      required: true,
      minimum: order.definition.evidenceRules.minimumFiles,
    });
  return (
    <main className="ticket-page execution-page" aria-busy={!hydrated || undefined}>
      <h1>
        {mode === "execute"
          ? "Ejecutar orden"
          : mode === "close"
            ? "Revisar y cerrar"
            : "Revisión de la ejecución"}
      </h1>
      <p>
        {order.folio} · {order.machineCode} · Definición v{order.templateVersion}
      </p>
      {!local && mode === "execute" && (
        <DownloadOrder order={order} contextId={contextId} csrfToken={csrfToken} />
      )}
      {!authorized && (
        <p role="status">Puedes consultar la ejecución. No tienes autorización para modificarla.</p>
      )}
      {!access.canWrite && <p role="status">La cuenta está en modo lectura.</p>}
      {message && (
        <p role="status" ref={feedback} tabIndex={-1}>
          {message}
        </p>
      )}
      {mode === "review" && (
        <section className="execution-panel">
          <h2>Acción de revisión</h2>
          <label htmlFor="review-action">Acción</label>
          <select
            id="review-action"
            value={reviewAction}
            disabled={blocked}
            onChange={(e) => setReviewAction(e.target.value)}
          >
            {detail.canReview && (
              <>
                <option value="review">Registrar revisión</option>
                <option value="correct" disabled={order.state === "corrected"}>
                  Corregir con una nueva versión
                </option>
                {order.state === "completed" && <option value="cancel">Anular</option>}
                {detail.canReopen && <option value="reopen">Reabrir</option>}
              </>
            )}
            {detail.canRequestCorrection && (
              <option value="request_correction">Solicitar corrección</option>
            )}
          </select>
          {!detail.canReopen && <p>La reapertura no está disponible para esta orden.</p>}
          <label htmlFor="review-reason">
            Motivo obligatorio
            <textarea
              id="review-reason"
              value={reason}
              minLength={5}
              maxLength={1000}
              onChange={(e) => {
                setReason(e.target.value);
                setDirty(true);
              }}
              disabled={blocked}
            />
          </label>
        </section>
      )}
      <fieldset disabled={!editing || blocked} className="execution-panel">
        <legend>Registro de ejecución</legend>
        <section id="checklist">
          <h2>Checklist</h2>
          {order.definition.checklist.map((item) => (
            <label className="execution-check" key={item.code} htmlFor={`checklist-${item.code}`}>
              <input
                id={`checklist-${item.code}`}
                type="checkbox"
                checked={data.checklist.includes(item.code)}
                onChange={(e) =>
                  update({
                    checklist: e.target.checked
                      ? [...data.checklist, item.code]
                      : data.checklist.filter((x) => x !== item.code),
                  })
                }
              />
              {item.label}
              {item.required ? " *" : ""}
            </label>
          ))}
        </section>
        {("fields" in order.definition ? order.definition.fields : []).map((field) => (
          <label key={field.code} htmlFor={`field-${field.code}`}>
            {field.label}
            {field.required ? " *" : ""}
            <input
              id={`field-${field.code}`}
              type={
                field.type === "boolean"
                  ? "checkbox"
                  : field.type === "number"
                    ? "number"
                    : field.type === "date"
                      ? "date"
                      : "text"
              }
              {...(field.type === "boolean"
                ? { checked: data.fields[field.code] === true }
                : { value: String(data.fields[field.code] ?? "") })}
              onChange={(e) =>
                update({
                  fields: {
                    ...data.fields,
                    [field.code]:
                      field.type === "boolean"
                        ? e.target.checked
                        : field.type === "number" && e.target.value !== ""
                          ? Number(e.target.value)
                          : e.target.value,
                  },
                })
              }
            />
          </label>
        ))}
        {textFields.map((field) => (
          <label key={field.key} htmlFor={field.key}>
            {field.label} *
            <textarea
              id={field.key}
              value={data[field.key]}
              maxLength={8000}
              onChange={(e) => update({ [field.key]: e.target.value })}
            />
          </label>
        ))}
        <section>
          <h2>Refacciones utilizadas</h2>
          {data.parts.map((part, index) => (
            <div className="execution-part" key={index}>
              {(["code", "name", "quantity", "unit", "lot"] as const).map((key, i) => (
                <label key={key}>
                  {["Código", "Nombre", "Cantidad", "Unidad", "Lote"][i]}
                  <input
                    type={key === "quantity" ? "number" : "text"}
                    min={key === "quantity" ? 0.001 : undefined}
                    step="any"
                    value={part[key]}
                    onChange={(e) =>
                      update({
                        parts: data.parts.map((p, n) =>
                          n === index
                            ? {
                                ...p,
                                [key]: key === "quantity" ? Number(e.target.value) : e.target.value,
                              }
                            : p,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <Button
                icon="close"
                variant="tertiary"
                onClick={() => update({ parts: data.parts.filter((_, i) => i !== index) })}
              >
                Quitar refacción
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            icon="plus"
            onClick={() =>
              update({
                parts: [...data.parts, { code: "", name: "", quantity: 1, unit: "pieza", lot: "" }],
              })
            }
          >
            Agregar refacción
          </Button>
        </section>
        <section id="evidence">
          <h2>Evidencia</h2>
          {photos.map((requirement) => (
            <p id={`evidence-${requirement.code}`} key={requirement.code}>
              {requirement.label}:{" "}
              {
                data.evidence.filter(
                  (item) => item.type === "photo" && item.requirementCode === requirement.code,
                ).length
              }{" "}
              de {requirement.minimum} fotos requeridas.
            </p>
          ))}
          {requirements
            .filter((r) => !r.type.endsWith("_photo"))
            .map((r) => {
              const entry = data.evidence.find((e) => e.requirementCode === r.code);
              const remove = () =>
                update({ evidence: data.evidence.filter((e) => e.requirementCode !== r.code) });
              return (
                <div key={r.code} id={`evidence-${r.code}`}>
                  {r.type === "reading" && (
                    <EvidenceReading
                      label={r.label}
                      unit={r.unit!}
                      minimum={r.minimumValue}
                      maximum={r.maximumValue}
                      value={entry?.type === "reading" ? entry.value : ""}
                      onChange={(value) =>
                        value === ""
                          ? remove()
                          : evidence({
                              type: "reading",
                              requirementCode: r.code,
                              value,
                              unit: r.unit!,
                            })
                      }
                    />
                  )}
                  {r.type === "lot" && (
                    <EvidenceLot
                      label={r.label}
                      value={entry?.type === "lot" ? entry.value : ""}
                      onChange={(value) =>
                        value === ""
                          ? remove()
                          : evidence({ type: "lot", requirementCode: r.code, value })
                      }
                    />
                  )}
                  {r.type === "signature" && (
                    <EvidenceSignature
                      label={r.label}
                      value={entry?.type === "signature" ? entry.name : ""}
                      onInvalidate={remove}
                      onConfirm={(name) =>
                        evidence({
                          type: "signature",
                          requirementCode: r.code,
                          name,
                          confirmed: true,
                        })
                      }
                    />
                  )}
                </div>
              );
            })}
          {data.evidence
            .filter((e) => e.type === "photo")
            .map((e) => (
              <p key={e.fileId}>
                Foto adjunta ·{" "}
                {requirements.find((r) => r.code === e.requirementCode)?.label ?? "Evidencia"}{" "}
                <Button
                  variant="tertiary"
                  icon="close"
                  onClick={() => update({ evidence: data.evidence.filter((x) => x !== e) })}
                >
                  Quitar foto
                </Button>
              </p>
            ))}
        </section>
        <label htmlFor="result">
          Resultado
          <select
            id="result"
            value={data.result}
            onChange={(e) => update({ result: e.target.value as WorkOrderExecution["result"] })}
          >
            <option value="conforming">Conforme</option>
            <option value="observations">Con observaciones</option>
            <option value="nonconforming">No conforme</option>
          </select>
        </label>
        <label htmlFor="followup">
          Seguimiento{data.result !== "conforming" ? " *" : ""}
          <textarea
            id="followup"
            value={data.followup}
            onChange={(e) => update({ followup: e.target.value })}
          />
        </label>
      </fieldset>
      {editing && !blocked && (
        <section className="execution-panel">
          <h2>Adjuntar fotos</h2>
          {photos.map((r) =>
            local ? (
              <LocalPhotoSlot
                key={r.code}
                renderPhoto={local.renderPhoto}
                code={r.code}
                label={`${r.label} · mínimo ${r.minimum}`}
                onVerified={(e) => evidence(e, true)}
              />
            ) : (
              <EvidencePhoto
                key={r.code}
                code={r.code}
                label={`${r.label} · mínimo ${r.minimum}`}
                machineId={order.machineId}
                contextId={contextId}
                csrfToken={csrfToken}
                onVerified={(e) => evidence(e, true)}
                onPending={(pending) =>
                  setPendingPhotos((current) => ({ ...current, [r.code]: pending }))
                }
              />
            ),
          )}
        </section>
      )}
      {assessment.missing.length > 0 && (
        <section className="execution-panel" aria-label="Requisitos pendientes">
          <h2>Pendiente para cerrar</h2>
          <ul>
            {assessment.missing.map((item, i) => (
              <li key={`${item.field}-${i}`}>
                <a
                  href={
                    mode === "close" && !local
                      ? `/maintenance/work-orders/${order.id}/execute#${item.field}`
                      : `#${item.field}`
                  }
                  onClick={
                    local
                      ? (event) => {
                          event.preventDefault();
                          local.onEditField(item.field);
                        }
                      : undefined
                  }
                >
                  {item.message}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {mode === "review" && comparison && (
        <section className="execution-panel">
          <label>
            Versión para comparar
            <select value={comparisonId} onChange={(e) => setComparisonId(e.target.value)}>
              {detail.revisions.map((r) => (
                <option value={r.id} key={r.id}>
                  Versión {r.version} · {formatTime(r.createdAt)}
                </option>
              ))}
            </select>
          </label>
          <Comparator
            title={
              reviewAction === "correct"
                ? "Versión conservada y corrección propuesta"
                : "Versión conservada y vigente"
            }
            before={{
              label: `Versión ${comparison.version}`,
              meta: `Autor ${actorLabel(comparison.actorId)} · ${formatTime(comparison.createdAt)}`,
            }}
            after={{
              label: reviewAction === "correct" ? "Corrección propuesta" : "Versión vigente",
            }}
            fields={[
              ...textFields.map((f) => ({
                id: f.key,
                label: f.label,
                before: comparison.execution[f.key],
                after: data[f.key],
                changed: comparison.execution[f.key] !== data[f.key],
              })),
              ...(["checklist", "fields", "parts", "evidence", "result", "followup"] as const).map(
                (key, index) => ({
                  id: key,
                  label: [
                    "Checklist",
                    "Campos capturados",
                    "Refacciones",
                    "Evidencia",
                    "Resultado",
                    "Seguimiento",
                  ][index]!,
                  before: describeValue(key, comparison.execution, order),
                  after: describeValue(key, data, order),
                  changed: JSON.stringify(comparison.execution[key]) !== JSON.stringify(data[key]),
                }),
              ),
            ]}
          />
        </section>
      )}
      <div className="execution-actions">
        {done && (
          <ButtonLink
            icon="refresh"
            variant="secondary"
            href={`/maintenance/work-orders/${order.id}/review`}
          >
            Ver historial actualizado
          </ButtonLink>
        )}
        {mode === "execute" && (
          <>
            {!local && (
              <Button
                icon="save"
                loading={busy}
                disabled={blocked || Object.values(pendingPhotos).some(Boolean)}
                onClick={() => send("execution", data)}
              >
                Guardar borrador
              </Button>
            )}
            {local ? (
              <Button
                icon="check-circle"
                variant="secondary"
                disabled={blocked}
                onClick={local.onReview}
              >
                Revisar cierre
              </Button>
            ) : (
              <ButtonLink
                icon="check-circle"
                variant="secondary"
                href={`/maintenance/work-orders/${order.id}/close`}
              >
                Revisar cierre
              </ButtonLink>
            )}
          </>
        )}
        {mode === "close" && (
          <Button
            icon="check-circle"
            loading={busy}
            disabled={blocked || !assessment.complete || !detail.revisions.length}
            onClick={() =>
              send("transitions", {
                action:
                  data.result === "conforming"
                    ? "complete"
                    : data.result === "observations"
                      ? "observe"
                      : "reject",
                reason: data.followup,
              })
            }
          >
            Confirmar cierre
          </Button>
        )}
        {mode === "review" && (
          <Button
            icon="check-circle"
            loading={busy}
            disabled={
              blocked ||
              reason.trim().length < 5 ||
              (reviewAction === "correct" && !assessment.complete)
            }
            onClick={() =>
              send("reviews", {
                action: reviewAction,
                reason,
                ...(reviewAction === "correct" ? { execution: data } : {}),
              })
            }
          >
            Registrar{" "}
            {reviewAction === "cancel"
              ? "anulación"
              : reviewAction === "reopen"
                ? "reapertura"
                : "revisión"}
          </Button>
        )}
        <ButtonLink icon="list" variant="tertiary" href={`/maintenance/work-orders/${order.id}`}>
          Volver a la orden
        </ButtonLink>
      </div>
      {!local && (
        <section className="execution-panel">
          <h2>Versiones conservadas</h2>
          <ol>
            {detail.revisions.map((revision) => (
              <li key={revision.id}>
                Versión {revision.version} ·{" "}
                {{ draft: "Borrador", closure: "Cierre", correction: "Corrección" }[revision.kind]}{" "}
                · <time dateTime={revision.createdAt}>{formatTime(revision.createdAt)}</time> ·
                Autor {actorLabel(revision.actorId)}
                <p>{revision.reason}</p>
              </li>
            ))}
          </ol>
          <h2>Revisiones</h2>
          <ol>
            {detail.reviews.map((review) => (
              <li key={review.id}>
                {(
                  {
                    review: "Revisión",
                    correct: "Corrección",
                    request_correction: "Solicitud de corrección",
                    cancel: "Anulación",
                    reopen: "Reapertura",
                  } as Record<string, string>
                )[review.action] ?? review.action}{" "}
                · {formatTime(review.createdAt)} · Autor {actorLabel(review.actorId)}
                <p>{review.reason}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
