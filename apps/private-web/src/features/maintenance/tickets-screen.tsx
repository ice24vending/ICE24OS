"use client";
import { LiveRegion } from "@ice24/ui";
import { MaintenanceNavigation } from "./maintenance-navigation";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button, ButtonLink, Card, Select, SystemState, type SystemStateKind } from "@ice24/ui";
import {
  ticketOptionsSchema,
  ticketSchema,
  ticketPrioritySchema,
  type Ticket,
} from "@ice24/contracts";
import { useAccountAccess } from "../account-shell/access-provider";
import { useUnsavedChanges, discardUnsavedChanges } from "../context/unsaved-changes";
import { FileUploader } from "../files/uploader";
import { request, toFailure } from "../../components/system-state/failure";
import { useRestoreFocus } from "../../components/use-restore-focus";

const noChanges = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

export const TICKET_PRIORITIES = {
  low: "Baja — puede esperar sin afectar el servicio",
  normal: "Normal — falla parcial que requiere revisión",
  high: "Alta — afecta la producción o el servicio",
  critical: "Crítica — riesgo o máquina detenida",
};
export interface TicketsScreenProps {
  contextId: string;
  csrfToken: string;
  canCreate: boolean;
  canUpload: boolean;
  machines: readonly { id: string; label: string }[];
  selectedMachine?: string | undefined;
  failure?: SystemStateKind | undefined;
  readOnly?: boolean;
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
  const rememberFocus = useRestoreFocus(busy);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Ticket | null>(null);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const latest = useRef(0);
  useUnsavedChanges(dirty || uploadBusy);
  const online = access.online;
  const blocked = !hydrated || busy || uploadBusy || !online || props.readOnly || !access.canWrite;
  const headers = { "x-ice24-workspace-context": props.contextId };
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
    rememberFocus();
    const values = new FormData(event.currentTarget);
    const data = {
      machineId,
      systemId: values.get("systemId"),
      componentId: values.get("componentId") || null,
      priority: values.get("priority"),
      description: values.get("description"),
      evidenceIds,
      activityId: null,
    };
    const payload = JSON.stringify(data);
    if (!attempt.current || attempt.current.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    const form = new FormData();
    form.set("data", payload);
    form.set("csrfToken", props.csrfToken);
    form.set("key", attempt.current.key);
    setBusy(true);
    setError("");
    try {
      const response = await request(
        "/api/tickets",
        { method: "POST", headers, body: form },
        "No fue posible guardar. Tus datos siguen en el formulario.",
      );
      const ticket = ticketSchema.parse(await response.json());
      setDirty(false);
      discardUnsavedChanges();
      attempt.current = null;
      setSaved(ticket);
    } catch (cause) {
      const failure = toFailure(cause, "No fue posible guardar. Conservamos tus datos.");
      if (failure.kind === "read_only") access.markReadOnly();
      setError(failure.message);
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
        <h1>Reportar una falla</h1>
        <p>Reporta una falla y consulta su diagnóstico y seguimiento.</p>
        <MaintenanceNavigation current="tickets" />
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
          {/* Read once by the alert; moving focus here too made NVDA read it twice (SR-03). */}
          <LiveRegion role="alert" data-announcement="ticket-error">
            {error}
          </LiveRegion>
          {saved ? (
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
          )}
        </>
      )}
    </main>
  );
}
