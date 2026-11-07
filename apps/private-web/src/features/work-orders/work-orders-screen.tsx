"use client";
import { MaintenanceNavigation } from "../maintenance/maintenance-navigation";
import { DownloadOrder } from "../sync/download-order";
import { DownloadedOrders } from "../sync/downloaded-orders";
import { ReleaseOrder } from "../sync/release-order";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  Button,
  ButtonLink,
  Card,
  Icon,
  Select,
  StatusTag,
  SystemState,
  type SystemStateKind,
} from "@ice24/ui";
import {
  workOrderSchema,
  type WorkOrder,
  type WorkOrderDetail,
  type WorkOrderOptions,
} from "@ice24/contracts";
import { useAccountAccess } from "../account-shell/access-provider";
import { useUnsavedChanges, discardUnsavedChanges } from "../context/unsaved-changes";
import { request, toFailure } from "../../components/system-state/failure";
export const ORDER_LABELS = {
  scheduled: "Programado",
  upcoming: "Próximo",
  overdue: "Vencido",
  in_progress: "En atención",
  completed: "Completado",
  with_observations: "Con observaciones",
  nonconforming: "No conforme",
  corrected: "Corregido",
  cancelled: "Anulado",
};
const ACTION_LABELS = {
  notify: "Marcar próximo",
  expire: "Marcar vencido",
  start: "Iniciar orden",
  complete: "Completar",
  observe: "Completar con observaciones",
  reject: "Registrar no conforme",
  correct: "Corregir",
  cancel: "Anular",
  reopen: "Reabrir",
};
const subscribe = () => () => undefined;
export interface WorkOrdersScreenProps {
  mode: "list" | "create" | "detail";
  contextId: string;
  csrfToken: string;
  items?: WorkOrder[];
  detail?: WorkOrderDetail | undefined;
  options?: WorkOrderOptions | undefined;
  nextCursor?: string | null;
  filters?: Record<string, string>;
  sourceTicketFolio?: string | undefined;
  machineOptions?: readonly { value: string; label: string }[];
  lockedMachineId?: string | undefined;
  readOnly?: boolean;
  failure?: SystemStateKind | undefined;
}
export function WorkOrderTimeline({ events }: { events: WorkOrderDetail["events"] }) {
  return (
    <ol aria-label="Línea de estados de la orden">
      {events.map((event) => (
        <li key={event.id}>
          <strong>{event.state ? ORDER_LABELS[event.state] : "Actualización"}</strong>
          <p>{event.reason}</p>
          <time dateTime={event.occurredAt}>
            {new Intl.DateTimeFormat("es-MX", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "America/Mexico_City",
            }).format(new Date(event.occurredAt))}
          </time>
        </li>
      ))}
    </ol>
  );
}
export function WorkOrdersScreen(props: WorkOrdersScreenProps) {
  const access = useAccountAccess();
  const [filtering, setFiltering] = useState(false);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<WorkOrder | null>(null);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  useUnsavedChanges(dirty);
  const blocked = !ready || busy || props.readOnly || !access.canWrite || !access.online;
  const order = props.detail?.order;
  const startAction = props.detail?.actions.find((action) => action.action === "start");
  const administrativeActions =
    props.detail?.actions.filter((action) => ["notify", "expire"].includes(action.action)) ?? [];
  const writeReason = !access.online
    ? "Conéctate para cambiar el estado de la orden."
    : props.readOnly || !access.canWrite
      ? "La cuenta está en modo consulta."
      : undefined;
  async function submit(
    event: FormEvent<HTMLFormElement>,
    kind: "create" | "assignment" | "transitions",
  ) {
    event.preventDefault();
    if (blocked) return;
    const fields = new FormData(event.currentTarget);
    const data =
      kind === "create"
        ? {
            sourceType: props.options!.sourceType,
            sourceId: props.options!.sourceId,
            assigneeId: fields.get("assigneeId"),
            activityCode: fields.get("activityCode"),
            reason: fields.get("reason"),
          }
        : kind === "assignment"
          ? { assigneeId: fields.get("assigneeId"), reason: fields.get("reason") }
          : { action: fields.get("action"), reason: fields.get("reason") ?? "" };
    const payload = JSON.stringify(data);
    if (!attempt.current || attempt.current.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    const form = new FormData();
    form.set("data", payload);
    form.set("key", attempt.current.key);
    form.set("csrfToken", props.csrfToken);
    form.set("version", String(kind === "create" ? props.options!.rowVersion : order!.rowVersion));
    setBusy(true);
    setError("");
    try {
      const response = await request(
        `/api/work-orders${kind === "create" ? "" : `/${order!.id}/${kind}`}`,
        { method: "POST", headers: { "x-ice24-workspace-context": props.contextId }, body: form },
        "No fue posible guardar. Tus datos siguen en el formulario.",
      );
      const result = workOrderSchema.parse(await response.json());
      setSaved(result);
      setDirty(false);
      discardUnsavedChanges();
      attempt.current = null;
    } catch (cause) {
      setError(toFailure(cause, "No fue posible guardar. Reintenta con los mismos datos.").message);
      queueMicrotask(() => alert.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  const filterQuery = new URLSearchParams(props.filters);
  filterQuery.delete("cursor");
  const reason = (
    <>
      <label htmlFor="order-reason">Motivo *</label>
      <textarea id="order-reason" name="reason" required minLength={5} maxLength={1000} />
    </>
  );
  const technicians = props.options?.technicians ?? [];
  const technicianSelect = (
    <Select
      label="Técnico responsable"
      name="assigneeId"
      required
      defaultValue={order?.assigneeId ?? ""}
      options={[
        { value: "", label: "Selecciona un técnico" },
        ...technicians.map((t) => ({ value: t.id, label: t.name })),
      ]}
    />
  );
  const title =
    props.mode === "create"
      ? "Asignar técnico"
      : props.mode === "detail"
        ? "Detalle de la orden"
        : "Órdenes de trabajo";
  return (
    <main
      id="main-content"
      className="private-shell tickets-screen work-orders-screen"
      data-work-orders-ready={ready ? "true" : "false"}
    >
      <header>
        <p>Mantenimiento · {props.mode === "list" ? "Órdenes de trabajo" : "Orden de trabajo"}</p>
        <h1>{title}</h1>
        <MaintenanceNavigation current="orders" />
      </header>
      {props.readOnly && <SystemState kind="read_only" />}
      {!access.online && (
        <SystemState
          kind="offline"
          message="Asignar o cambiar una orden requiere conexión. La descarga offline se habilitará en una etapa posterior."
        />
      )}
      {error && (
        <p role="alert" tabIndex={-1} ref={alert}>
          {error}
        </p>
      )}
      {saved ? (
        <Card title="Orden guardada">
          <p>
            {saved.folio} · {ORDER_LABELS[saved.state]}
          </p>
          <ButtonLink
            icon="document"
            variant="secondary"
            href={`/maintenance/work-orders/${saved.id}`}
          >
            Ver orden actualizada
          </ButtonLink>
        </Card>
      ) : props.failure ? (
        <SystemState
          kind={props.failure}
          action={
            <ButtonLink icon="refresh" variant="secondary" href="/maintenance/work-orders">
              Volver a intentar
            </ButtonLink>
          }
        />
      ) : props.mode === "create" && props.options ? (
        <>
          <p>
            {props.options.machineCode} · Solo se muestran técnicos con acceso vigente. La
            definición de la plantilla queda guardada en la orden.
          </p>
          {props.options.existingOrderId ? (
            <Card title="Este origen ya tiene una orden">
              <ButtonLink
                icon="document"
                variant="secondary"
                href={`/maintenance/work-orders/${props.options.existingOrderId}`}
              >
                Ver orden existente
              </ButtonLink>
            </Card>
          ) : (
            <form
              onSubmit={(event) => void submit(event, "create")}
              onChange={() => setDirty(true)}
              aria-busy={busy}
            >
              <fieldset disabled={blocked}>
                <legend>Datos de asignación</legend>
                {technicianSelect}
                <Select
                  label="Actividad de la plantilla"
                  name="activityCode"
                  required
                  options={[
                    { value: "", label: "Selecciona una actividad" },
                    ...props.options.activities.map((a) => ({ value: a.code, label: a.name })),
                  ]}
                />
                {reason}
                <Button
                  icon="plus"
                  variant="primary"
                  type="submit"
                  disabled={blocked || !technicians.length || !props.options.activities.length}
                >
                  {busy ? "Guardando…" : "Crear orden y asignar"}
                </Button>
              </fieldset>
              {!technicians.length && (
                <p>No hay técnicos elegibles. Revisa sus accesos a esta sucursal o máquina.</p>
              )}
              {!props.options.activities.length && (
                <p>
                  La plantilla no tiene actividades de mantenimiento. Debe publicarse una versión
                  con su definición.
                </p>
              )}
            </form>
          )}
        </>
      ) : order && props.detail ? (
        <>
          <Card title={order.folio}>
            <StatusTag
              tone={
                order.state === "overdue" || order.state === "nonconforming" ? "warning" : "info"
              }
            >
              {ORDER_LABELS[order.state]}
            </StatusTag>
            <p>
              {order.machineCode} · {order.definition.name}
            </p>
            <p>Responsable: {order.assigneeName}</p>
            <p>
              Plantilla v{order.templateVersion} · Versión de orden {order.rowVersion}
            </p>
            {order.ticketId && (
              <div className="work-order-origin">
                <StatusTag tone="info">
                  Ticket origen{props.sourceTicketFolio ? ` · ${props.sourceTicketFolio}` : ""}
                </StatusTag>
                <ButtonLink
                  icon="document"
                  variant="secondary"
                  href={`/maintenance/tickets/${order.ticketId}?fromOrder=${order.id}`}
                >
                  Ver reporte original
                </ButtonLink>
              </div>
            )}
          </Card>
          <Card title="Procedimiento y requisitos">
            <p>
              {order.definition.procedure ||
                "La versión de plantilla usada no define un procedimiento adicional."}
            </p>
            <h3>Checklist</h3>
            <ul>
              {order.definition.checklist.map((item) => (
                <li key={item.code}>
                  {item.label}
                  {item.required ? " · Obligatorio" : ""}
                </li>
              ))}
            </ul>
            <h3>Evidencia de cierre</h3>
            <p>
              {order.definition.evidenceRules.required
                ? `Mínimo ${order.definition.evidenceRules.minimumFiles} archivos requeridos.`
                : "Sin archivos obligatorios en esta versión."}
            </p>
            <h3>Piezas previstas</h3>
            {order.definition.plannedParts?.length ? (
              <ul>
                {order.definition.plannedParts.map((part) => (
                  <li key={part.code}>
                    {part.name}: {part.quantity} {part.unit}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sin piezas previstas en esta versión de plantilla.</p>
            )}
          </Card>
          <Card title="Acciones disponibles">
            {startAction && !startAction.allowed && (
              <aside className="work-order-consultation" aria-label="Modo consulta">
                <Icon name="info" />
                <p>
                  <strong>Modo consulta.</strong> {startAction.message}
                  {access.userId !== order.assigneeId &&
                    " Solo el técnico asignado puede iniciar esta orden."}
                  {" Puedes consultar la ejecución y sus requisitos."}
                </p>
              </aside>
            )}
            <section className="work-order-action-group" aria-labelledby="order-execution-title">
              <h3 id="order-execution-title">Ejecución y seguimiento</h3>
              <p className="work-order-action-help">
                El cierre requiere completar la ejecución y sus evidencias.
              </p>
              <div className="work-order-action-links">
                {startAction?.allowed && (
                  <form onSubmit={(event) => void submit(event, "transitions")}>
                    <input type="hidden" name="action" value="start" />
                    <Button
                      icon="play"
                      variant="primary"
                      type="submit"
                      disabled={blocked}
                      disabledReason={writeReason}
                    >
                      Iniciar orden
                    </Button>
                  </form>
                )}
                <ButtonLink
                  icon="edit"
                  variant={startAction?.allowed ? "secondary" : "primary"}
                  href={`/maintenance/work-orders/${order.id}/execute`}
                >
                  Consultar ejecución
                </ButtonLink>
                {order.state === "in_progress" && (
                  <ButtonLink
                    icon="check-circle"
                    variant="secondary"
                    href={`/maintenance/work-orders/${order.id}/close`}
                  >
                    Revisar cierre
                  </ButtonLink>
                )}
                {["completed", "with_observations", "nonconforming", "corrected"].includes(
                  order.state,
                ) && (
                  <ButtonLink
                    icon="compare"
                    variant="secondary"
                    href={`/maintenance/work-orders/${order.id}/review`}
                  >
                    Revisar y corregir
                  </ButtonLink>
                )}
              </div>
            </section>
            {administrativeActions.length > 0 && (
              <section
                className="work-order-action-group work-order-action-group--secondary"
                aria-labelledby="order-administration-title"
              >
                <h3 id="order-administration-title">Administración del estado</h3>
                <div className="work-order-administrative-actions">
                  {administrativeActions.map((action) => (
                    <form
                      className="work-order-action-item"
                      key={action.action}
                      onSubmit={(event) => void submit(event, "transitions")}
                    >
                      <input type="hidden" name="action" value={action.action} />
                      <Button
                        icon={action.action === "notify" ? "clock" : "warning"}
                        variant="secondary"
                        type="submit"
                        disabled={blocked || !action.allowed}
                        disabledReason={!action.allowed ? action.message : writeReason}
                      >
                        {ACTION_LABELS[action.action]}
                      </Button>
                    </form>
                  ))}
                </div>
              </section>
            )}
          </Card>
          <DownloadOrder order={order} contextId={props.contextId} csrfToken={props.csrfToken} />
          {props.detail?.offlineLease && (
            <p>
              Descarga reservada para el dispositivo {props.detail.offlineLease.deviceId}. Vigente
              hasta {new Date(props.detail.offlineLease.expiresAt).toLocaleString("es-MX")}.
            </p>
          )}
          {props.detail?.canReleaseOffline && (
            <ReleaseOrder
              order={order}
              contextId={props.contextId}
              csrfToken={props.csrfToken}
              disabled={!!blocked}
            />
          )}
          {props.detail.canReassign && (
            <Card title="Cambiar técnico antes de iniciar">
              <form
                onSubmit={(event) => void submit(event, "assignment")}
                onChange={() => setDirty(true)}
              >
                <fieldset disabled={blocked}>
                  {technicianSelect}
                  {reason}
                  <Button
                    icon="user-plus"
                    variant="secondary"
                    type="submit"
                    disabled={blocked || !technicians.length}
                  >
                    Cambiar responsable
                  </Button>
                </fieldset>
              </form>
            </Card>
          )}
          <Card title="Seguimiento">
            <WorkOrderTimeline events={props.detail.events} />
          </Card>
        </>
      ) : props.mode === "list" ? (
        <>
          <details className="work-order-filter-panel" open>
            <summary>
              <Icon name="filter" /> Filtros de órdenes
            </summary>
            <form
              key={filterQuery.toString()}
              method="get"
              action="/maintenance/work-orders"
              className="maintenance-filters work-order-filters"
              aria-label="Filtrar órdenes"
              aria-busy={!ready || filtering}
              onChange={(event) => event.currentTarget.requestSubmit()}
              onSubmit={() => setFiltering(true)}
            >
              <Select
                label="Vista"
                disabled={!ready}
                name="view"
                defaultValue={props.filters?.view ?? "assigned"}
                options={[
                  { value: "assigned", label: "Asignadas" },
                  { value: "pending", label: "Pendientes de iniciar" },
                  { value: "downloaded", label: "Descargadas" },
                ]}
              />
              <Select
                label="Estado"
                disabled={!ready}
                name="state"
                defaultValue={props.filters?.state ?? ""}
                options={[
                  { value: "", label: "Todos" },
                  ...Object.entries(ORDER_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
              <Select
                label="Máquina"
                disabled={!ready}
                name="machineId"
                readOnly={!!props.lockedMachineId}
                defaultValue={props.filters?.machineId ?? ""}
                options={[
                  { value: "", label: "Todas" },
                  ...(props.machineOptions ?? [
                    ...new Map(
                      (props.items ?? []).map((item) => [
                        item.machineId,
                        { value: item.machineId, label: item.machineCode },
                      ]),
                    ).values(),
                  ]),
                ]}
              />
              <Select
                label="Responsable"
                disabled={!ready}
                name="assigneeId"
                defaultValue={props.filters?.assigneeId ?? ""}
                options={[
                  { value: "", label: "Todos" },
                  ...(props.filters?.assigneeId &&
                  !(props.items ?? []).some((item) => item.assigneeId === props.filters?.assigneeId)
                    ? [{ value: props.filters.assigneeId, label: "Responsable seleccionado" }]
                    : []),
                  ...new Map(
                    (props.items ?? []).map((item) => [
                      item.assigneeId,
                      { value: item.assigneeId, label: item.assigneeName },
                    ]),
                  ).values(),
                ]}
              />
              <Button icon="filter" variant="secondary" type="submit" disabled={!ready}>
                Aplicar filtros
              </Button>
              <ButtonLink icon="close" variant="tertiary" href="/maintenance/work-orders">
                Limpiar filtros
              </ButtonLink>
            </form>
          </details>
          <p role="status" className="work-order-filter-status">
            {filtering
              ? "Aplicando filtros…"
              : `${props.items?.length ?? 0} órdenes en esta página. Los filtros se aplican al cambiar una opción.`}
            {props.lockedMachineId &&
              " La máquina está fijada por el contexto activo; cámbiala desde el selector de contexto."}
          </p>
          {props.filters?.view === "downloaded" && <DownloadedOrders />}
          {props.filters?.view === "downloaded" ? null : !props.items?.length ? (
            <SystemState kind="empty" message="No hay órdenes con estos filtros en tu contexto." />
          ) : (
            <section aria-label="Órdenes asignadas">
              {props.items.map((item) => (
                <Card key={item.id} title={item.folio}>
                  <StatusTag tone={item.state === "overdue" ? "warning" : "info"}>
                    {ORDER_LABELS[item.state]}
                  </StatusTag>
                  <p>
                    {item.machineCode} · {item.definition.name}
                  </p>
                  <p>Responsable: {item.assigneeName}</p>
                  <ButtonLink icon="document" href={`/maintenance/work-orders/${item.id}`}>
                    Ver {item.folio}
                  </ButtonLink>
                  <DownloadOrder
                    order={item}
                    compact
                    contextId={props.contextId}
                    csrfToken={props.csrfToken}
                  />
                </Card>
              ))}
            </section>
          )}
          {props.nextCursor && (
            <ButtonLink
              icon="chevron-right"
              variant="secondary"
              href={`/maintenance/work-orders?${filterQuery}&cursor=${props.nextCursor}`}
            >
              Siguiente página
            </ButtonLink>
          )}
        </>
      ) : (
        <SystemState kind="error" />
      )}
    </main>
  );
}
