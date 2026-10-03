"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { auditPageSchema, type AuditEvent, type AuditPage } from "@ice24/contracts";

const outcomes: Record<string, string> = {
  SUCCESS: "Correcto",
  DENIED: "Denegado",
  FAILED: "Fallido",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
function Detail({ event }: { event: AuditEvent }) {
  return (
    <section className="audit-detail" aria-label="Detalle del evento">
      <h2>Detalle del evento</h2>
      <dl>
        {Object.entries({
          ID: event.id,
          Tipo: event.operation,
          Resultado: outcomes[event.result],
          "Fecha UTC": date(event.occurredAt),
          "Zona capturada": event.timeZone,
          "Fecha local capturada": event.occurredAtLocal,
          Actor: event.actorUserId ?? event.actorType,
          "Tipo de actor": event.actorType,
          Cuenta: event.accountId ?? "Global",
          Sucursal: event.branchId ?? "No aplica",
          Máquina: event.machineId ?? "No aplica",
          Entidad: `${event.entityType} · ${event.entityId}`,
          Contexto: event.contextSessionId ?? "No disponible",
          Correlación: event.correlationId,
          Origen: event.origin,
          IP: event.ipAddress ?? "No capturada",
          Motivo: event.reason ?? "No registrado",
          Versión: String(event.eventVersion),
          "Registrado UTC": date(event.createdAt),
        }).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="audit-changes">
        <section>
          <h3>Valores anteriores</h3>
          <pre>{JSON.stringify(event.previousValues, null, 2)}</pre>
        </section>
        <section>
          <h3>Valores nuevos</h3>
          <pre>{JSON.stringify(event.newValues, null, 2)}</pre>
        </section>
      </div>
      {event.deviceSummary && (
        <>
          <h3>Dispositivo</h3>
          <pre>{JSON.stringify(event.deviceSummary, null, 2)}</pre>
        </>
      )}
    </section>
  );
}
export function AuditViewer({
  contextId,
  initial,
  initialError,
  canGlobal,
}: {
  contextId: string;
  initial: AuditPage | null;
  initialError: string;
  canGlobal: boolean;
}) {
  const [data, setData] = useState(initial),
    [error, setError] = useState(initialError),
    [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState(""),
    [cursors, setCursors] = useState<(string | null)[]>([null]),
    [page, setPage] = useState(0);
  const [detail, setDetail] = useState<AuditEvent | null>(null);
  const active = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    // A persisted tab must not retain a previous account's evidence after navigation.
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      active.current?.abort();
      window.removeEventListener("pageshow", restore);
    };
  }, []);
  async function load(
    query: string,
    cursor: string | null,
    nextPage: number,
    history: (string | null)[],
  ) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setData(null);
    setDetail(null);
    try {
      const params = new URLSearchParams(query);
      params.set("limit", "25");
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/audit?${params}`, {
        cache: "no-store",
        headers: { "x-ice24-workspace-context": contextId },
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "No fue posible consultar la auditoría.");
      }
      const result = auditPageSchema.parse(await response.json());
      if (controller.signal.aborted) return;
      setData(result);
      setPage(nextPage);
      setCursors(history);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "No fue posible consultar la auditoría.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      params = new URLSearchParams();
    for (const key of ["operation", "actorUserId", "result", "scope", "accountId"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const from = String(form.get("from") ?? ""),
      to = String(form.get("to") ?? "");
    if (from) params.set("from", `${from}T00:00:00.000Z`);
    if (to) params.set("to", `${to}T23:59:59.999999Z`);
    setFilters(params.toString());
    void load(params.toString(), null, 0, [null]);
  }
  return (
    <main id="main-content" className="audit-layout">
      <nav aria-label="Navegación de auditoría">
        <a href="/workspace">← Espacio de trabajo</a>
        <a href="/access/context">Cambiar de cuenta</a>
      </nav>
      <header>
        <p className="eyebrow">Trazabilidad de operaciones</p>
        <h1>Auditoría</h1>
        <p>Historial inmutable de acciones sensibles. Las fechas de consulta se muestran en UTC.</p>
      </header>
      <form
        ref={form}
        onSubmit={submit}
        className="audit-filters"
        aria-label="Filtros de auditoría"
      >
        <label>
          Desde (UTC)
          <input type="date" name="from" />
        </label>
        <label>
          Hasta (UTC)
          <input type="date" name="to" />
        </label>
        <label>
          Tipo de evento
          <input name="operation" placeholder="DemoCreated" maxLength={80} />
        </label>
        <label>
          Actor (ID)
          <input name="actorUserId" placeholder="UUID del usuario" />
        </label>
        <label>
          Estado
          <select name="result" aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="SUCCESS">Correcto</option>
            <option value="DENIED">Denegado</option>
            <option value="FAILED">Fallido</option>
          </select>
        </label>
        {canGlobal && (
          <>
            <label>
              Ámbito
              <select name="scope" aria-label="Ámbito">
                <option value="account">Cuenta actual</option>
                <option value="global">Global ICE24</option>
              </select>
            </label>
            <label>
              Cuenta (ID, opcional)
              <input name="accountId" placeholder="Filtrar una cuenta" />
            </label>
          </>
        )}
        <div className="audit-actions">
          <button disabled={busy} type="submit">
            Aplicar filtros
          </button>
          <button
            disabled={busy}
            type="button"
            onClick={() => {
              // Clear inputs explicitly: a native reset is skipped once busy disables this button.
              form.current?.reset();
              setFilters("");
              void load("", null, 0, [null]);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </form>
      {busy && <p role="status">Cargando eventos…</p>}
      {error && (
        <section role="alert">
          <p>{error}</p>
          <button onClick={() => void load(filters, cursors[page] ?? null, page, cursors)}>
            Reintentar
          </button>
        </section>
      )}
      {data && (
        <section aria-label="Eventos de auditoría">
          <p role="status">
            {data.items.length
              ? `${data.items.length} eventos · Página ${page + 1}`
              : "No hay eventos que coincidan con los filtros."}
          </p>
          {!!data.items.length && (
            <div
              className="audit-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Tabla de eventos, desplazamiento horizontal"
            >
              <table>
                <caption>Eventos de auditoría, más recientes primero</caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha UTC</th>
                    <th scope="col">Tipo de evento</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((event) => (
                    <tr key={event.id}>
                      <td>{date(event.occurredAt)}</td>
                      <td>{event.operation}</td>
                      <td>{event.actorUserId ?? event.actorType}</td>
                      <td>
                        <span
                          className={`audit-result audit-result--${event.result.toLowerCase()}`}
                        >
                          {outcomes[event.result]}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setDetail(event);
                            requestAnimationFrame(() => heading.current?.focus());
                          }}
                          aria-label={`Ver detalle de ${event.operation}`}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav aria-label="Paginación de auditoría" className="audit-actions">
            <button
              disabled={busy || page === 0}
              onClick={() => void load(filters, cursors[page - 1] ?? null, page - 1, cursors)}
            >
              Anterior
            </button>
            <span>Página {page + 1}</span>
            <button
              disabled={busy || !data.page.hasMore}
              onClick={() => {
                const history = [...cursors.slice(0, page + 1), data.page.nextCursor];
                void load(filters, data.page.nextCursor, page + 1, history);
              }}
            >
              Siguiente
            </button>
          </nav>
        </section>
      )}
      {detail && (
        <div>
          <h2 ref={heading} tabIndex={-1}>
            Evento seleccionado
          </h2>
          <button onClick={() => setDetail(null)}>Cerrar detalle</button>
          <Detail event={detail} />
        </div>
      )}
    </main>
  );
}
