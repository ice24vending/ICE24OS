"use client";
import { LiveRegion } from "@ice24/ui";
import { MaintenanceNavigation } from "./maintenance-navigation";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  Button,
  ButtonLink,
  Card,
  Select,
  SystemState,
  StatusTag,
  type SystemStateKind,
} from "@ice24/ui";
import {
  ticketOptionsSchema,
  ticketSchema,
  ticketPrioritySchema,
  type Ticket,
  type TicketDetail,
} from "@ice24/contracts";
import { useAccountAccess } from "../account-shell/access-provider";
import { useUnsavedChanges, discardUnsavedChanges } from "../context/unsaved-changes";
import { FileUploader } from "../files/uploader";
import { request, toFailure } from "../../components/system-state/failure";

const noChanges = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

export const TICKET_PRIORITIES = {
  low: "Baja — puede esperar sin afectar el servicio",
  normal: "Normal — falla parcial que requiere revisión",
  high: "Alta — afecta la producción o el servicio",
  critical: "Crítica — riesgo o máquina detenida",
};
const states = {
  pending_assignment: "Pendiente de asignación",
  in_progress: "En atención",
  completed: "Completado",
  cancelled: "Cancelado",
};
export interface TicketsScreenProps {
  mode: "list" | "create" | "detail";
  contextId: string;
  csrfToken: string;
  canCreate: boolean;
  canEdit: boolean;
  canAssign?: boolean;
  canUpload: boolean;
  machines: readonly { id: string; label: string }[];
  selectedMachine?: string | undefined;
  items?: Ticket[];
  detail?: TicketDetail | undefined;
  nextCursor?: string | null;
  failure?: SystemStateKind | undefined;
  readOnly?: boolean;
  originOrder?: { id: string; folio: string } | undefined;
}
export function TicketsScreen(props: TicketsScreenProps) {
  const access = useAccountAccess();
  const hydrated = useSyncExternalStore(noChanges, clientReady, serverReady);
  const [machineId, setMachineId] = useState(props.selectedMachine ?? "");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<keyof typeof TICKET_PRIORITIES>("normal");
  const [options, setOptions] = useState<{
    systems: { id: string; name: string }[];
    components: { id: string; name: string }[];
  }>({ systems: [], components: [] });
  const [optionsMachine, setOptionsMachine] = useState("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Ticket | null>(null);
  const [detail, setDetail] = useState(props.detail);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const latest = useRef(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useUnsavedChanges(dirty || uploadBusy);
  const online = access.online;
  const blocked = !hydrated || busy || uploadBusy || !online || props.readOnly || !access.canWrite;
  const headers = { "x-ice24-workspace-context": props.contextId };
  const title =
    props.mode === "create"
      ? "Reportar una falla"
      : props.mode === "detail"
        ? "Detalle del ticket"
        : "Tickets de mantenimiento";
  async function loadOptions(id: string) {
    const generation = ++latest.current;
    setOptionsMachine("");
    setLoadingOptions(true);
    setError("");
    try {
      const result = await request(
        `/api/tickets/options/${id}`,
        { headers },
        "No fue posible cargar los sistemas. Intenta de nuevo.",
      );
      const next = ticketOptionsSchema.parse(await result.json());
      if (generation === latest.current) {
        setOptions(next);
        setOptionsMachine(id);
      }
    } catch (cause) {
      if (generation === latest.current)
        setError(toFailure(cause, "No fue posible consultar los sistemas.").message);
    } finally {
      if (generation === latest.current) setLoadingOptions(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    const values = new FormData(event.currentTarget);
    const creating = props.mode === "create";
    const data = creating
      ? {
          machineId,
          systemId: values.get("systemId"),
          componentId: values.get("componentId") || null,
          priority: values.get("priority"),
          description: values.get("description"),
          evidenceIds,
          activityId: null,
        }
      : { diagnosis: values.get("diagnosis"), reason: values.get("reason") };
    const payload = JSON.stringify(data);
    if (!attempt.current || attempt.current.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    const form = new FormData();
    form.set("data", payload);
    form.set("csrfToken", props.csrfToken);
    form.set("key", attempt.current.key);
    if (detail) form.set("version", String(detail.ticket.rowVersion));
    setBusy(true);
    setError("");
    try {
      const response = await request(
        `/api/tickets${creating ? "" : `/${detail!.ticket.id}/diagnosis`}`,
        { method: "POST", headers, body: form },
        "No fue posible guardar. Tus datos siguen en el formulario.",
      );
      const ticket = ticketSchema.parse(await response.json());
      setDirty(false);
      discardUnsavedChanges();
      attempt.current = null;
      if (creating) setSaved(ticket);
      else if (detail)
        setDetail({
          ...detail,
          ticket,
          events: [
            ...detail.events,
            {
              id: crypto.randomUUID(),
              operation: "TicketDiagnosed",
              occurredAt: new Date().toISOString(),
              reason: String(values.get("reason")),
              diagnosis: ticket.diagnosis,
            },
          ],
        });
    } catch (cause) {
      const failure = toFailure(cause, "No fue posible guardar. Conservamos tus datos.");
      if (failure.kind === "read_only") access.markReadOnly();
      setError(failure.message);
      setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      id="main-content"
      className="private-shell tickets-screen"
      aria-busy={!hydrated || undefined}
    >
      <header>
        <h1>{title}</h1>
        <p>Reporta una falla y consulta su diagnóstico y seguimiento.</p>
        <MaintenanceNavigation current="tickets" />
        {props.mode === "detail" && props.originOrder && (
          <div className="work-order-origin">
            <StatusTag tone="info">Reporte origen de {props.originOrder.folio}</StatusTag>
            <ButtonLink
              icon="chevron-left"
              variant="secondary"
              href={`/maintenance/work-orders/${props.originOrder.id}`}
            >
              Volver a {props.originOrder.folio}
            </ButtonLink>
          </div>
        )}
        {props.mode === "list" && props.canCreate && (
          <div className="tickets-screen__actions">
            <ButtonLink variant="secondary" icon="warning" href="/maintenance/tickets/new">
              Reportar una falla
            </ButtonLink>
          </div>
        )}
      </header>
      {props.failure ? (
        <SystemState
          kind={props.failure}
          title={
            props.failure === "forbidden"
              ? "Tickets no disponibles en este contexto"
              : "No fue posible cargar los tickets"
          }
          message="Revisa tu conexión y el contexto. Si el módulo está deshabilitado, solicita su habilitación al administrador."
        />
      ) : (
        <>
          {(!online || props.readOnly || !access.canWrite) && (
            <SystemState
              kind={!online ? "offline" : "read_only"}
              title={!online ? "Necesitas conexión para reportar" : "Cuenta en modo lectura"}
              message="Puedes consultar la información ya visible. La creación y los cambios requieren conexión y una cuenta habilitada; este formulario no guarda datos offline."
            />
          )}
          <LiveRegion role="alert" tabIndex={-1} ref={errorRef} data-announcement="ticket-error">
            {error}
          </LiveRegion>
          {props.mode === "list" && (
            <section aria-label="Tickets">
              {props.items?.length ? (
                props.items.map((ticket) => (
                  <Card key={ticket.id}>
                    <h2>
                      <a href={`/maintenance/tickets/${ticket.id}`}>
                        {ticket.folio} · {ticket.machineCode}
                      </a>
                    </h2>
                    <p>{ticket.description}</p>
                    <p>
                      {ticket.systemName} · {TICKET_PRIORITIES[ticket.priority]}
                    </p>
                    <StatusTag tone="info">{states[ticket.state]}</StatusTag>
                  </Card>
                ))
              ) : (
                <SystemState
                  kind="empty"
                  title="Sin tickets"
                  message="Los reportes de las máquinas autorizadas aparecerán aquí."
                />
              )}
              {props.nextCursor && (
                <ButtonLink
                  icon="chevron-right"
                  variant="secondary"
                  href={`/maintenance/tickets?cursor=${props.nextCursor}${props.selectedMachine ? `&machineId=${props.selectedMachine}` : ""}`}
                >
                  Más tickets
                </ButtonLink>
              )}
            </section>
          )}
          {props.mode === "create" &&
            (saved ? (
              <Card>
                <h2>Ticket registrado: {saved.folio}</h2>
                <p>Pendiente de asignación. La evidencia seguirá protegida mientras se verifica.</p>
                <ButtonLink
                  icon="document"
                  variant="secondary"
                  href={`/maintenance/tickets/${saved.id}`}
                >
                  Ver ticket
                </ButtonLink>
              </Card>
            ) : !props.canCreate ? (
              <SystemState
                kind="read_only"
                title="Consulta de tickets"
                message="Con tu rol puedes consultar tickets, pero no crearlos"
                action={
                  <ButtonLink icon="list" variant="secondary" href="/maintenance/tickets">
                    Volver a tickets
                  </ButtonLink>
                }
              />
            ) : (
              <>
                <Card>
                  <h2>Máquina y evidencia inicial</h2>
                  <label htmlFor="ticket-search">Buscar máquina</label>
                  <input
                    id="ticket-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Código o nombre"
                  />
                  <Select
                    label="Máquina"
                    id="ticket-machine"
                    value={machineId}
                    disabled={blocked || evidenceIds.length > 0}
                    options={[
                      { value: "", label: "Selecciona una máquina" },
                      ...props.machines
                        .filter(
                          (m) =>
                            m.id === machineId ||
                            m.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
                        )
                        .map((m) => ({ value: m.id, label: m.label })),
                    ]}
                    onChange={(e) => {
                      setMachineId(e.target.value);
                      setDirty(true);
                      if (e.target.value) void loadOptions(e.target.value);
                      else {
                        ++latest.current;
                        setOptionsMachine("");
                      }
                    }}
                  />
                  {machineId && optionsMachine !== machineId && (
                    <Button
                      icon="refresh"
                      variant="secondary"
                      aria-busy={loadingOptions}
                      disabled={blocked || loadingOptions}
                      onClick={() => void loadOptions(machineId)}
                    >
                      {loadingOptions ? "Cargando sistemas…" : "Cargar sistemas de la máquina"}
                    </Button>
                  )}
                  <LiveRegion role="status">
                    {evidenceIds.length > 0 ? (
                      <>
                        {" "}
                        {evidenceIds.length} evidencia(s) vinculada(s). La máquina queda fija para
                        conservar su asociación.{" "}
                      </>
                    ) : null}
                  </LiveRegion>
                  {machineId && props.canUpload && evidenceIds.length < 10 && (
                    <FileUploader
                      key={machineId}
                      contextId={props.contextId}
                      csrfToken={props.csrfToken}
                      fixedPurpose="machine_photo"
                      onBusyChange={setUploadBusy}
                      resources={[
                        {
                          type: "machine",
                          id: machineId,
                          label: props.machines.find((m) => m.id === machineId)?.label ?? "Máquina",
                        },
                      ]}
                      onUploaded={(id) => {
                        setEvidenceIds((current) => [...current, id]);
                        setDirty(true);
                      }}
                    />
                  )}
                  <p>
                    Fotos opcionales: JPEG o PNG, hasta 10 MB cada una. Solo se vinculan cargas
                    confirmadas; se descargan después de la verificación antivirus.
                  </p>
                </Card>
                <Card>
                  <form
                    onSubmit={(e) => void submit(e)}
                    onChange={() => setDirty(true)}
                    className="ticket-form"
                  >
                    <h2>Descripción de la falla</h2>
                    <fieldset disabled={blocked || optionsMachine !== machineId || !machineId}>
                      <legend>Datos del reporte</legend>
                      <Select
                        label="Sistema"
                        id="ticket-system"
                        name="systemId"
                        required
                        defaultValue=""
                        key={optionsMachine}
                        options={[
                          { value: "", label: "Selecciona un sistema" },
                          ...options.systems.map((item) => ({ value: item.id, label: item.name })),
                        ]}
                      />
                      <Select
                        label="Componente (opcional)"
                        id="ticket-component"
                        name="componentId"
                        options={[
                          { value: "", label: "Sin componente identificado" },
                          ...options.components.map((item) => ({
                            value: item.id,
                            label: item.name,
                          })),
                        ]}
                      />
                      <Select
                        label="Prioridad"
                        id="ticket-priority"
                        name="priority"
                        value={priority}
                        onChange={(event) =>
                          setPriority(ticketPrioritySchema.parse(event.target.value))
                        }
                        aria-describedby="ticket-priority-help"
                        options={Object.entries(TICKET_PRIORITIES).map(([value, label]) => ({
                          value,
                          label: label.split(" — ")[0]!,
                        }))}
                      />
                      <p id="ticket-priority-help">{TICKET_PRIORITIES[priority]}</p>
                      <label htmlFor="ticket-description">¿Qué falla observaste?</label>
                      <textarea
                        id="ticket-description"
                        name="description"
                        minLength={10}
                        maxLength={4000}
                        required
                        aria-describedby="ticket-description-help"
                      />
                      <p id="ticket-description-help">
                        Describe los síntomas y cuándo ocurrieron. Entre 10 y 4000 caracteres.
                      </p>
                      <Button icon="plus" variant="primary" type="submit">
                        {busy ? "Guardando…" : "Crear ticket"}
                      </Button>
                    </fieldset>
                  </form>
                </Card>
              </>
            ))}
          {props.mode === "detail" && detail && (
            <>
              <Card>
                <h2>
                  {detail.ticket.folio} · {detail.ticket.machineCode}
                </h2>
                <StatusTag tone="info">
                  {detail.ticket.state === "pending_assignment" && detail.ticket.workOrderId
                    ? "Orden asignada"
                    : states[detail.ticket.state]}
                </StatusTag>
                <p>
                  {detail.ticket.systemName}
                  {detail.ticket.componentName ? ` · ${detail.ticket.componentName}` : ""}
                </p>
                <p>{TICKET_PRIORITIES[detail.ticket.priority]}</p>
                <p>{detail.ticket.description}</p>
                <h3>Diagnóstico</h3>
                <p>{detail.ticket.diagnosis ?? "Aún no hay diagnóstico registrado."}</p>
                {detail.ticket.workOrderId ? (
                  <ButtonLink
                    icon="document"
                    variant="secondary"
                    href={`/maintenance/work-orders/${detail.ticket.workOrderId}`}
                  >
                    Ver orden de trabajo
                  </ButtonLink>
                ) : (
                  props.canAssign && (
                    <ButtonLink
                      icon="user-plus"
                      variant="secondary"
                      href={`/maintenance/work-orders/new?sourceType=ticket&sourceId=${detail.ticket.id}`}
                    >
                      Asignar técnico
                    </ButtonLink>
                  )
                )}
                <h3>Asignación</h3>
                <p>
                  Pendiente de asignación. La asignación de técnico estará disponible con las
                  órdenes de trabajo.
                </p>
                <h3>Evidencia privada</h3>
                {detail.ticket.evidenceIds.length ? (
                  detail.ticket.evidenceIds.map((id, i) => (
                    <p key={id}>
                      <a href={`/files?fileId=${id}`}>Consultar evidencia {i + 1}</a>
                    </p>
                  ))
                ) : (
                  <p>Sin evidencia inicial.</p>
                )}
                {detail.ticket.activityId && (
                  <p>
                    <a href={`/maintenance?machineId=${detail.ticket.machineId}`}>
                      Consultar actividad relacionada
                    </a>
                  </p>
                )}
              </Card>
              {props.canEdit &&
                !detail.ticket.workOrderId &&
                detail.ticket.state === "pending_assignment" && (
                  <Card>
                    <form
                      className="ticket-form"
                      onSubmit={(e) => void submit(e)}
                      onChange={() => setDirty(true)}
                    >
                      <h2>Registrar diagnóstico</h2>
                      <fieldset disabled={blocked}>
                        <legend>Actualización con historial</legend>
                        <label htmlFor="diagnosis">Diagnóstico</label>
                        <textarea
                          id="diagnosis"
                          name="diagnosis"
                          minLength={10}
                          maxLength={4000}
                          required
                          defaultValue={detail.ticket.diagnosis ?? ""}
                        />
                        <label htmlFor="diagnosis-reason">Motivo de la actualización</label>
                        <input
                          id="diagnosis-reason"
                          name="reason"
                          required
                          minLength={5}
                          maxLength={1000}
                        />
                        <Button icon="save" variant="primary" type="submit">
                          {busy ? "Guardando…" : "Guardar diagnóstico"}
                        </Button>
                      </fieldset>
                    </form>
                  </Card>
                )}
              <Card>
                <h2>Seguimiento cronológico</h2>
                <ol>
                  {detail.events.map((event) => (
                    <li key={event.id}>
                      <time dateTime={event.occurredAt}>
                        {new Date(event.occurredAt).toLocaleString("es-MX", {
                          timeZone: "America/Mexico_City",
                        })}
                      </time>
                      <p>
                        {event.operation === "TicketCreated"
                          ? "Ticket creado"
                          : "Diagnóstico actualizado"}{" "}
                        · {event.reason}
                      </p>
                      {event.diagnosis && <p>{event.diagnosis}</p>}
                    </li>
                  ))}
                </ol>
              </Card>
            </>
          )}
        </>
      )}
    </main>
  );
}
