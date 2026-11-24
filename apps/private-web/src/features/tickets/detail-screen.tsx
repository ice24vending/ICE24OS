"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { downloadSessionSchema, ticketSchema } from "@ice24/contracts";
import {
  Button,
  ButtonLink,
  Card,
  DetailLayout,
  LiveRegion,
  PageWidth,
  StatusPanel,
  StatusTag,
  TextField,
} from "@ice24/ui";
import { request, toFailure, type Failure } from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";
import { useRestoreFocus } from "../../components/use-restore-focus";
import { useAccountAccess } from "../account-shell/access-provider";
import { discardUnsavedChanges, useUnsavedChanges } from "../context/unsaved-changes";
import { ReturnLink, rowLinkId } from "../navigation/return-focus";
import {
  EVENT_LABELS,
  PRIORITIES,
  ticketDate,
  ticketDetailViewSchema,
  ticketEventReason,
  ticketReturnHref,
  ticketState,
  type TicketsAccess,
} from "./model";

function TicketPhoto({
  id,
  index,
  contextId,
  csrfToken,
  online,
}: {
  id: string;
  index: number;
  contextId: string;
  csrfToken: string;
  online: boolean;
}) {
  const [photo, setPhoto] = useState<string>();
  const [failure, setFailure] = useState<Failure>();
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | undefined>(undefined);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  async function open() {
    if (busy || !online) return;
    setBusy(true);
    setFailure(undefined);
    const task = new AbortController();
    controller.current = task;
    try {
      const form = new FormData();
      form.set("csrfToken", csrfToken);
      form.set("key", crypto.randomUUID());
      form.set("purpose", "Consultar foto del reporte de mantenimiento");
      const response = await request(
        `/api/files/${id}/download`,
        {
          method: "POST",
          body: form,
          headers: { "x-ice24-workspace-context": contextId },
          signal: task.signal,
        },
        "No fue posible autorizar la foto.",
      );
      const session = downloadSessionSchema.parse(await response.json());
      // Keep the signed URL out of the DOM/storage. Only a validated raster blob is displayed.
      const bytes = await request(
        session.url,
        { signal: task.signal, referrerPolicy: "no-referrer" },
        "No fue posible abrir la foto.",
      );
      const blob = await bytes.blob();
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(blob.type) ||
        blob.size > 10 * 1024 * 1024
      )
        throw new Error("Formato no compatible");
      if (task.signal.aborted) return;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      setPhoto(objectUrl.current);
    } catch (cause) {
      if (!task.signal.aborted)
        setFailure(
          toFailure(
            cause,
            "No fue posible mostrar la foto. Consulta el archivo para revisar su estado.",
          ),
        );
    } finally {
      if (!task.signal.aborted) setBusy(false);
    }
  }
  return (
    <Card title={`Foto ${index + 1}`} titleAs="h3" padding="md" className="uxd-tickets__photo">
      {photo ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- private raster blob, never an external storage URL */}
          <img src={photo} alt={`Foto ${index + 1} del reporte de falla`} />
        </figure>
      ) : (
        <p>Evidencia privada del reporte.</p>
      )}
      <Button
        variant="secondary"
        icon="document"
        loading={busy}
        disabled={!online}
        onClick={() => void open()}
      >
        {photo ? "Actualizar foto" : "Ver foto"} {index + 1}
      </Button>
      <ButtonLink variant="tertiary" href={`/files?fileId=${id}`}>
        Consultar archivo {index + 1}
      </ButtonLink>
      {failure && <ServiceState {...failure} />}
    </Card>
  );
}

export function TicketDetailScreen({
  id,
  contextId,
  csrfToken,
  permissions,
  demoOffline = false,
}: TicketsAccess & { id: string }) {
  const params = useSearchParams();
  const access = useAccountAccess();
  const [detail, setDetail] = useState<ReturnType<typeof ticketDetailViewSchema.parse>>();
  const [loading, setLoading] = useState(!demoOffline);
  const [failure, setFailure] = useState<Failure | undefined>(
    demoOffline
      ? { kind: "offline", message: "Necesitas conexión para consultar el ticket.", status: 0 }
      : undefined,
  );
  const [actionFailure, setActionFailure] = useState<Failure>();
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const rememberFocus = useRestoreFocus(busy);
  const replay = useRef<{ payload: string; key: string } | null>(null);
  const fromOrder = params.get("fromOrder");
  const headers = { "x-ice24-workspace-context": contextId };
  useUnsavedChanges(dirty);
  useEffect(() => {
    if (demoOffline) return;
    const controller = new AbortController();
    const origin = fromOrder ? `?fromOrder=${encodeURIComponent(fromOrder)}` : "";
    request(
      `/api/tickets/${id}${origin}`,
      { headers: { "x-ice24-workspace-context": contextId }, signal: controller.signal },
      "No fue posible abrir el ticket.",
    )
      .then((response) => response.json())
      .then(ticketDetailViewSchema.parse)
      .then((data) => {
        if (!controller.signal.aborted) {
          setDetail(data);
          setFailure(undefined);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setFailure(toFailure(cause, "No fue posible abrir el ticket."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [contextId, id, fromOrder, attempt, demoOffline]);
  const refresh = () => {
    if (demoOffline) {
      window.location.reload();
      return;
    }
    setLoading(true);
    setAttempt((value) => value + 1);
  };
  const ticket = detail?.ticket;
  const mayWrite = access.canWrite && permissions.includes("maintenance.tickets-edit");
  const canDiagnose = mayWrite && ticket?.state === "pending_assignment" && !ticket.workOrderId;
  const canAssign =
    access.canWrite &&
    permissions.includes("maintenance.orders-assign") &&
    ticket?.state === "pending_assignment" &&
    !ticket.workOrderId;
  async function diagnose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canDiagnose || !ticket || !detail || !access.online || busy) return;
    rememberFocus();
    const values = new FormData(event.currentTarget);
    const payload = JSON.stringify({
      diagnosis: values.get("diagnosis"),
      reason: values.get("reason"),
    });
    if (replay.current?.payload !== payload) replay.current = { payload, key: crypto.randomUUID() };
    const form = new FormData();
    form.set("data", payload);
    form.set("csrfToken", csrfToken);
    form.set("key", replay.current.key);
    form.set("version", String(ticket.rowVersion));
    setBusy(true);
    setActionFailure(undefined);
    setNotice("");
    try {
      const response = await request(
        `/api/tickets/${id}/diagnosis`,
        { method: "POST", headers, body: form },
        "No fue posible guardar el diagnóstico. Conservamos tus datos.",
      );
      const updated = ticketSchema.parse(await response.json());
      setDetail({
        ...detail,
        ticket: { ...ticket, ...updated },
        events: [
          ...detail.events,
          {
            id: crypto.randomUUID(),
            operation: "TicketDiagnosed",
            occurredAt: new Date().toISOString(),
            reason: String(values.get("reason")),
            diagnosis: updated.diagnosis,
          },
        ],
      });
      replay.current = null;
      setDirty(false);
      discardUnsavedChanges();
      setNotice("Diagnóstico guardado.");
    } catch (cause) {
      const error = toFailure(
        cause,
        "No fue posible guardar el diagnóstico. Conservamos tus datos.",
      );
      if (error.kind === "read_only") access.markReadOnly();
      setActionFailure(error);
    } finally {
      setBusy(false);
    }
  }
  const zone = detail?.timeZone ?? "America/Mexico_City";
  return (
    <PageWidth
      as="main"
      id="main-content"
      aria-label="Detalle del ticket"
      data-page-ready={String(!loading)}
      data-page-breadcrumbs="true"
      className="uxd-tickets"
    >
      <DetailLayout
        title="Detalle del ticket"
        identifier={ticket?.folio}
        breadcrumbs={[
          { label: "Mantenimiento", href: "/maintenance" },
          { label: "Tickets", href: ticketReturnHref(params.get("volver")) },
          { label: ticket?.folio ?? "Detalle" },
        ]}
        backLink={
          <ReturnLink
            href={ticketReturnHref(params.get("volver"))}
            linkId={rowLinkId(id)}
            listName="tickets"
          />
        }
        statuses={
          ticket && (
            <>
              <StatusTag tone={ticketState(ticket).tone}>{ticketState(ticket).label}</StatusTag>
              <StatusTag tone={PRIORITIES[ticket.priority].tone}>
                Prioridad {PRIORITIES[ticket.priority].label.toLowerCase()}
              </StatusTag>
            </>
          )
        }
        actions={
          canAssign &&
          access.online && (
            <ButtonLink
              icon="user-plus"
              href={`/maintenance/work-orders/new?sourceType=ticket&sourceId=${id}`}
            >
              Asignar técnico
            </ButtonLink>
          )
        }
        banner={
          <>
            {!loading && !failure && (!mayWrite || !access.online) && (
              <StatusPanel
                title={!access.online ? "Sin conexión" : "Consulta de ticket"}
                tone="info"
              >
                <p>
                  {!access.online
                    ? "Puedes consultar la información visible. Los cambios requieren conexión."
                    : "Puedes consultar el reporte y su seguimiento."}
                </p>
              </StatusPanel>
            )}
            {detail?.originOrder && permissions.includes("maintenance.orders-read") && (
              <StatusPanel title={`Reporte origen de ${detail.originOrder.folio}`}>
                <ButtonLink
                  variant="secondary"
                  href={`/maintenance/work-orders/${detail.originOrder.id}`}
                >
                  Volver a {detail.originOrder.folio}
                </ButtonLink>
              </StatusPanel>
            )}
          </>
        }
        status={
          loading ? (
            <ServiceState kind="loading" title="Cargando ticket" skeleton="list" />
          ) : failure ? (
            <ServiceState {...failure} onRetry={refresh} />
          ) : undefined
        }
        summary={
          ticket && (
            <div className="uxd-tickets__stack">
              <Card title="Descripción de la falla">
                <p className="uxd-tickets__description">{ticket.description}</p>
              </Card>
              <Card title="Diagnóstico">
                <p className="uxd-tickets__description">
                  {ticket.diagnosis ?? "Aún no hay diagnóstico registrado."}
                </p>
              </Card>
              <Card
                title="Fotos del reporte"
                description="Las fotos requieren permiso de consulta y verificación del archivo."
              >
                {!ticket.evidenceIds.length ? (
                  <p>Sin fotos adjuntas.</p>
                ) : !permissions.includes("files.read") ? (
                  <p>No tienes permiso para consultar las fotos.</p>
                ) : (
                  <div className="uxd-tickets__photos">
                    {ticket.evidenceIds.map((fileId, index) => (
                      <TicketPhoto
                        key={fileId}
                        id={fileId}
                        index={index}
                        contextId={contextId}
                        csrfToken={csrfToken}
                        online={access.online}
                      />
                    ))}
                  </div>
                )}
              </Card>
              {canDiagnose && (
                <Card title="Registrar diagnóstico">
                  <form onSubmit={(event) => void diagnose(event)} onChange={() => setDirty(true)}>
                    <fieldset disabled={!access.online || busy}>
                      <legend>Actualización con historial</legend>
                      <label htmlFor="ticket-diagnosis">Diagnóstico</label>
                      <textarea
                        id="ticket-diagnosis"
                        name="diagnosis"
                        minLength={10}
                        maxLength={4000}
                        required
                        defaultValue={ticket.diagnosis ?? ""}
                      />
                      <TextField
                        label="Motivo de la actualización"
                        name="reason"
                        minLength={5}
                        maxLength={1000}
                        required
                      />
                      <Button icon="save" type="submit" loading={busy}>
                        Guardar diagnóstico
                      </Button>
                    </fieldset>
                  </form>
                </Card>
              )}
              <LiveRegion role="status">{notice}</LiveRegion>
              {actionFailure && <ServiceState {...actionFailure} />}
              <Card title="Seguimiento cronológico">
                {!detail.events.length && <p>Aún no hay seguimiento registrado.</p>}
                <ol className="uxd-tickets__timeline">
                  {detail.events.map((event) => (
                    <li key={event.id}>
                      <h3>{EVENT_LABELS[event.operation] ?? "Seguimiento actualizado"}</h3>
                      <time dateTime={event.occurredAt}>{ticketDate(event.occurredAt, zone)}</time>
                      {event.actorName && <p>{event.actorName}</p>}
                      {event.reason && <p>{ticketEventReason(event.operation, event.reason)}</p>}
                      {event.diagnosis && <p>{event.diagnosis}</p>}
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          )
        }
        aside={
          ticket && (
            <div className="uxd-tickets__stack">
              <Card title="Datos del reporte">
                <dl className="uxd-tickets__data">
                  <div>
                    <dt>Máquina</dt>
                    <dd>
                      <ButtonLink variant="tertiary" href={`/machines/${ticket.machineId}`}>
                        {ticket.machineCode}
                      </ButtonLink>
                    </dd>
                  </div>
                  <div>
                    <dt>Sucursal</dt>
                    <dd>{ticket.branchName ?? "Sin registro"}</dd>
                  </div>
                  <div>
                    <dt>Sistema</dt>
                    <dd>{ticket.systemName}</dd>
                  </div>
                  {ticket.componentName && (
                    <div>
                      <dt>Componente</dt>
                      <dd>{ticket.componentName}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Reportado por</dt>
                    <dd>{ticket.reportedBy?.name ?? "Sin registro"}</dd>
                  </div>
                  <div>
                    <dt>Fecha del reporte</dt>
                    <dd>{ticketDate(ticket.createdAt, zone)}</dd>
                  </div>
                  {ticket.resolvedAt && (
                    <div>
                      <dt>Resuelto</dt>
                      <dd>{ticketDate(ticket.resolvedAt, zone)}</dd>
                    </div>
                  )}
                </dl>
              </Card>
              <Card title="Orden de trabajo">
                <p>
                  {ticket.assignedTo
                    ? `Asignado a ${ticket.assignedTo.name}`
                    : "Sin técnico asignado."}
                </p>
                {ticket.workOrderId ? (
                  <>
                    <p>{ticket.workOrderFolio ?? "Orden vinculada"}</p>
                    {permissions.includes("maintenance.orders-read") && (
                      <ButtonLink
                        variant="secondary"
                        icon="document"
                        href={`/maintenance/work-orders/${ticket.workOrderId}`}
                      >
                        Ver orden de trabajo
                      </ButtonLink>
                    )}
                  </>
                ) : (
                  <p>Este ticket todavía no tiene una orden de trabajo.</p>
                )}
              </Card>
            </div>
          )
        }
      />
    </PageWidth>
  );
}
