"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { activityInputSchema } from "@ice24/contracts";

type Row = {
  id: string;
  row_version: number;
  status?: string;
  name?: string;
  code?: string;
  folio?: string;
  machine_code?: string;
  model_id?: string;
  template_id?: string;
  branch_id?: string;
  account_id?: string;
  data?: Record<string, unknown>;
  definition?: Record<string, unknown>;
  details?: Record<string, unknown>;
  [key: string]: unknown;
};
type Access = {
  accountId: string;
  canAdmin: boolean;
  canManage: boolean;
  hasMfa: boolean;
  accessMode: string;
  accountWide: boolean;
};
type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "checkbox" | "textarea" | "email";
  options?: { value: string; label: string }[];
  value?: string | number | boolean | string[] | undefined;
  multiple?: boolean;
  required?: boolean;
};
type Mutation = (
  path: string,
  body: unknown,
  version?: number,
  method?: string,
  key?: string,
) => Promise<unknown>;
const label = (row: Row) =>
  String(
    row.name ??
      row.display_name ??
      row.data?.name ??
      row.machine_code ??
      row.folio ??
      row.code ??
      row.id,
  );
const options = (rows: Row[]) => rows.map((r) => ({ value: r.id, label: label(r) }));
const reasonField: Field = {
  key: "reason",
  label: "Motivo (al menos 10 caracteres)",
  type: "textarea",
  required: true,
};
const confirmation: Field = {
  key: "confirmation",
  label: "Confirmo que revisé los datos y deseo ejecutar esta acción",
  type: "checkbox",
  required: true,
};
const branchFields: Field[] = [
  { key: "name", label: "Nombre", required: true },
  { key: "address", label: "Dirección", required: true },
  { key: "latitude", label: "Latitud", type: "number", value: 0 },
  { key: "longitude", label: "Longitud", type: "number", value: 0 },
  { key: "timezone", label: "Zona horaria", value: "America/Mexico_City", required: true },
  { key: "schedule", label: "Horario de atención" },
  { key: "publicPhone", label: "Teléfono público" },
  {
    key: "ownerPhonePublic",
    label: "Autorizar publicación del teléfono del propietario",
    type: "checkbox",
  },
  { key: "referenceTemperature", label: "Temperatura de referencia °C", type: "number" },
];
function Editor({
  title,
  fields,
  submit,
  disabled = false,
  button = "Guardar",
}: {
  title: string;
  fields: Field[];
  submit: (values: Record<string, unknown>, key: string) => Promise<unknown>;
  disabled?: boolean;
  button?: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const last = useRef({ body: "", key: "" });
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {};
    for (const f of fields)
      values[f.key] = f.multiple
        ? form.getAll(f.key)
        : f.type === "checkbox"
          ? form.has(f.key)
          : f.type === "number"
            ? form.get(f.key) === ""
              ? null
              : Number(form.get(f.key))
            : String(form.get(f.key) ?? "");
    const serialized = JSON.stringify(values);
    if (last.current.body !== serialized)
      last.current = { body: serialized, key: crypto.randomUUID() };
    setPending(true);
    setMessage("");
    try {
      await submit(values, last.current.key);
      setMessage("Guardado correctamente.");
      last.current = { body: "", key: "" };
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.name === "ZodError"
            ? "Revisa los campos obligatorios y sus límites."
            : error.message
          : "No fue posible guardar.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="equipment-editor">
      <summary>{title}</summary>
      <form onSubmit={send}>
        <fieldset disabled={disabled || pending}>
          <legend>{title}</legend>
          <div className="equipment-fields">
            {fields.map((f) => (
              <label key={f.key}>
                {f.label}
                {f.options ? (
                  <select
                    name={f.key}
                    required={f.required}
                    multiple={f.multiple}
                    defaultValue={
                      f.multiple ? (Array.isArray(f.value) ? f.value : []) : String(f.value ?? "")
                    }
                  >
                    <option value="">Selecciona una opción</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    name={f.key}
                    required={f.required}
                    defaultValue={String(f.value ?? "")}
                    maxLength={2000}
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    name={f.key}
                    type="checkbox"
                    required={f.required}
                    defaultChecked={Boolean(f.value)}
                  />
                ) : (
                  <input
                    name={f.key}
                    type={f.type ?? "text"}
                    step={f.type === "number" ? "any" : undefined}
                    required={f.required}
                    defaultValue={String(f.value ?? "")}
                    maxLength={1000}
                  />
                )}
              </label>
            ))}
          </div>
          <button type="submit">{pending ? "Guardando…" : button}</button>
        </fieldset>
        <p role="status">{message}</p>
      </form>
    </details>
  );
}
function Listing({ rows, select }: { rows: Row[]; select?: (row: Row) => void }) {
  if (!rows.length) return <p>No hay registros en este contexto.</p>;
  return (
    <ul className="equipment-list">
      {rows.map((row) => (
        <li key={row.id}>
          <span>
            <strong>{label(row)}</strong>
            {row.status && <small>{stateLabel(row.status)}</small>}
          </span>
          {select && (
            <button type="button" onClick={() => select(row)}>
              Ver / editar
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
function stateLabel(state: unknown): string {
  const labels: Record<string, string> = {
    active: "Activo",
    draft: "Borrador",
    submitted: "Enviado",
    in_review: "En revisión",
    information_required: "Información requerida",
    rejected: "Rechazado",
    published: "Publicado",
    superseded: "Sustituido",
    pending: "Pendiente",
    approved: "Aprobado",
    executed: "Ejecutado",
    cancelled: "Cancelado",
    archived: "Archivado",
    available: "Disponible",
    off: "Apagado",
    maintenance: "En mantenimiento",
    out_of_service: "Fuera de servicio",
    suspended: "Suspendido",
    retired: "Retirado",
    preventive_attention: "Atención preventiva",
    attention_required: "Requiere atención",
    optimal: "Óptimo",
    critical: "Crítico",
    private: "Privado",
    up_to_date: "Al día",
    expiring_soon: "Próximo a vencer",
    restricted: "Restringido",
    corrective_action: "Acción correctiva",
    withdrawn: "Retirado de publicación",
    completed: "Completado",
    in_progress: "En curso",
  };
  return labels[String(state)] ?? String(state ?? "");
}

export function EquipmentWorkspace({
  csrfToken,
  contextId,
}: {
  csrfToken: string;
  contextId: string;
}) {
  const [access, setAccess] = useState<Access>();
  const [tab, setTab] = useState("machines");
  const [rows, setRows] = useState<Row[]>([]);
  const [branches, setBranches] = useState<Row[]>([]);
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [models, setModels] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const get = useCallback(
    async (path: string) => {
      const response = await fetch(`/api/equipment?path=${encodeURIComponent(path)}`, {
        cache: "no-store",
        headers: { "x-ice24-workspace-context": contextId },
      });
      const value: unknown = await response.json();
      if (!response.ok) throw new Error((value as { message: string }).message);
      return value;
    },
    [contextId],
  );
  const fetchWorkspace = useCallback(async () => {
    const permission = (await get("equipment-workspace")) as Access;
    const [branchRows, catalogRows, modelRows] = await Promise.all([
      get("branches"),
      get("catalogs"),
      get("technical-models"),
    ]);
    const path =
      tab === "dashboard"
        ? "admin/dashboard"
        : tab === "account"
          ? `accounts/${permission.accountId}`
          : tab === "users"
            ? "account-users"
            : tab === "requests"
              ? "equipment-requests"
              : tab === "admin"
                ? "admin/equipment-requests"
                : tab === "templates"
                  ? "technical-models"
                  : tab === "transfers"
                    ? permission.canAdmin
                      ? "admin/machine-transfers"
                      : "machine-transfers"
                    : tab;
    const data = await get(path);
    return {
      permission,
      branchRows: branchRows as Row[],
      catalogRows: catalogRows as Row[],
      modelRows: modelRows as Row[],
      data: Array.isArray(data) ? (data as Row[]) : [data as Row],
    };
  }, [get, tab]);
  const applyWorkspace = useCallback((result: Awaited<ReturnType<typeof fetchWorkspace>>) => {
    setAccess(result.permission);
    setBranches(result.branchRows);
    setCatalog(result.catalogRows);
    setModels(result.modelRows);
    setRows(result.data);
    setError("");
    setSelected(undefined);
    setLoading(false);
  }, []);
  const load = useCallback(async () => {
    try {
      applyWorkspace(await fetchWorkspace());
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "No fue posible cargar los datos.");
      setLoading(false);
    }
  }, [fetchWorkspace, applyWorkspace]);
  useEffect(() => {
    let active = true;
    void fetchWorkspace().then(
      (result) => {
        if (active) applyWorkspace(result);
      },
      (e) => {
        if (active) {
          setRows([]);
          setError(e instanceof Error ? e.message : "No fue posible cargar los datos.");
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [fetchWorkspace, applyWorkspace]);
  const mutate: Mutation = async (
    path,
    body,
    version,
    method = "POST",
    key = crypto.randomUUID(),
  ) => {
    const form = new FormData();
    form.set("csrfToken", csrfToken);
    form.set("path", path);
    form.set("method", method);
    form.set("body", JSON.stringify(body));
    form.set("key", key);
    if (version) form.set("version", String(version));
    const response = await fetch("/api/equipment", {
      method: "POST",
      body: form,
      headers: { "x-ice24-workspace-context": contextId },
    });
    const result: unknown = await response.json();
    if (!response.ok) throw new Error((result as { message: string }).message);
    if (!path.startsWith("equipment-files")) {
      setLoading(true);
      await load();
    }
    return result;
  };
  const disabled = !access?.canManage;
  const adminDisabled = disabled || !access?.canAdmin || !access?.hasMfa;
  const nav = [
    { id: "machines", name: "Máquinas" },
    { id: "requests", name: "Solicitudes" },
    { id: "branches", name: "Sucursales" },
    ...(access?.accountWide
      ? [
          { id: "account", name: "Mi cuenta" },
          { id: "users", name: "Usuarios" },
          { id: "transfers", name: "Transferencias" },
        ]
      : []),
    ...(access?.canAdmin
      ? [
          { id: "templates", name: "Catálogos y plantillas" },
          { id: "admin", name: "Validaciones" },
          { id: "admin/accounts", name: "Cuentas ICE24" },
          { id: "dashboard", name: "Panel ICE24" },
        ]
      : []),
  ];
  return (
    <main id="main-content" className="private-shell equipment-shell">
      <header className="private-header">
        <div>
          <p className="eyebrow">ICE24 OS · Operación</p>
          <h1>Cuentas y máquinas</h1>
        </div>
        <div>
          <a href="/profile">Perfil</a> · <a href="/access/context">Cambiar cuenta</a>
        </div>
      </header>
      <nav aria-label="Módulos" className="equipment-nav">
        {nav.map((n) => (
          <button
            key={n.id}
            type="button"
            aria-pressed={tab === n.id}
            onClick={() => {
              setLoading(true);
              setTab(n.id);
              if (tab === n.id) void load();
            }}
          >
            {n.name}
          </button>
        ))}
      </nav>
      {access?.accessMode === "READ_ONLY" && (
        <p role="status" className="notice">
          Cuenta en modo solo lectura.
        </p>
      )}
      {access && !access.hasMfa && access.canManage && (
        <p className="notice">
          Para publicar, aprobar, trasladar, retirar o transferir,{" "}
          <a href="/access/mfa">verifica tu segundo factor</a>.
        </p>
      )}
      <button type="button" onClick={() => void load()} disabled={loading}>
        Actualizar datos
      </button>
      {loading ? (
        <p role="status">Cargando datos del contexto…</p>
      ) : error ? (
        <p role="alert" className="notice notice--error">
          {error}
        </p>
      ) : (
        <section className="content-card">
          <h2>{nav.find((n) => n.id === tab)?.name}</h2>
          {tab === "dashboard" ? (
            <Dashboard get={get} />
          ) : tab === "account" ? (
            rows[0] && <AccountEditor row={rows[0]} mutate={mutate} disabled={disabled} />
          ) : (
            <Listing rows={rows} select={setSelected} />
          )}
          {tab === "branches" && (
            <Editor
              key={selected?.id ?? "new"}
              title={selected ? `Editar ${label(selected)}` : "Nueva sucursal"}
              fields={branchFields.map((f) => ({
                ...f,
                value:
                  (selected?.data?.[f.key] as string | number | boolean | undefined) ?? f.value,
              }))}
              disabled={disabled}
              submit={(v, k) =>
                mutate(
                  selected ? `branches/${selected.id}` : "branches",
                  v,
                  selected?.row_version,
                  selected ? "PATCH" : "POST",
                  k,
                )
              }
            />
          )}
          {tab === "branches" && selected && (
            <Editor
              title={selected.status === "archived" ? "Restaurar sucursal" : "Archivar sucursal"}
              fields={[reasonField, confirmation]}
              disabled={disabled}
              submit={(v, k) =>
                mutate(
                  `branches/${selected.id}/${selected.status === "archived" ? "restore" : "archive"}`,
                  v,
                  selected.row_version,
                  "POST",
                  k,
                )
              }
            />
          )}
          {tab === "users" && (
            <>
              <Editor
                title="Invitar usuario"
                disabled={disabled || !access?.hasMfa}
                fields={[
                  { key: "email", label: "Correo", type: "email", required: true },
                  { key: "displayName", label: "Nombre", required: true },
                  {
                    key: "role",
                    label: "Rol",
                    required: true,
                    options: [
                      { value: "OW", label: "Propietario delegado" },
                      { value: "AU", label: "Consulta" },
                      { value: "TC", label: "Técnico" },
                      { value: "OP", label: "Operador" },
                      { value: "SA", label: "Responsable sanitario" },
                    ],
                  },
                  {
                    key: "branchId",
                    label: "Limitar a sucursal (vacío: cuenta completa)",
                    options: options(branches),
                  },
                ]}
                submit={(v, k) =>
                  mutate(
                    "account-invitations",
                    {
                      email: v.email,
                      displayName: v.displayName,
                      roleCodes: [v.role],
                      branchIds: v.branchId ? [v.branchId] : [],
                      machineIds: [],
                    },
                    undefined,
                    "POST",
                    k,
                  )
                }
              />
              {selected && (
                <p>
                  Usuario: {String(selected.email)} · Estado: {String(selected.status)} · Roles:{" "}
                  {String(selected.roles)}
                </p>
              )}
            </>
          )}
          {tab === "requests" && (
            <RequestEditor
              selected={selected}
              branches={branches}
              catalog={catalog}
              mutate={mutate}
              disabled={disabled}
            />
          )}
          {tab === "users" && selected && (
            <>
              <Editor
                title="Editar permisos delegados"
                disabled={disabled || !access?.hasMfa}
                fields={[
                  {
                    key: "role",
                    label: "Rol",
                    required: true,
                    options: [
                      { value: "AU", label: "Consulta" },
                      { value: "TC", label: "Técnico" },
                      { value: "OP", label: "Operador" },
                      { value: "SA", label: "Responsable sanitario" },
                      { value: "OW", label: "Propietario delegado" },
                    ],
                  },
                  {
                    key: "branchId",
                    label: "Limitar a sucursal (vacío: cuenta completa)",
                    options: options(branches),
                  },
                  {
                    key: "denyWrite",
                    label: "Denegar explícitamente cambios de equipos",
                    type: "checkbox",
                  },
                  reasonField,
                ]}
                submit={(v, k) =>
                  mutate(
                    `account-users/${selected.id}/permissions`,
                    {
                      roleCodes: [v.role],
                      branchIds: v.branchId ? [v.branchId] : [],
                      machineIds: [],
                      reason: v.reason,
                      overrides: v.denyWrite
                        ? [{ permission: "equipment.manage", effect: "DENY" }]
                        : [],
                    },
                    selected.row_version,
                    "PATCH",
                    k,
                  )
                }
              />
              <Editor
                title="Cambiar estado de asociación"
                disabled={disabled || !access?.hasMfa}
                fields={[
                  {
                    key: "action",
                    label: "Acción",
                    required: true,
                    options: [
                      { value: "suspend", label: "Suspender" },
                      { value: "reactivate", label: "Reactivar" },
                      { value: "end", label: "Finalizar asociación" },
                    ],
                  },
                  reasonField,
                ]}
                submit={(v, k) =>
                  mutate(
                    `user-associations/${selected.id}/${String(v.action)}`,
                    { reason: v.reason, expectedVersion: selected.row_version },
                    selected.row_version,
                    "POST",
                    k,
                  )
                }
              />
            </>
          )}
          {tab === "requests" &&
            selected &&
            ["draft", "information_required"].includes(selected.status ?? "") && (
              <Editor
                title="Enviar a revisión"
                fields={[reasonField, confirmation]}
                disabled={disabled}
                submit={(v, k) =>
                  mutate(
                    `equipment-requests/${selected.id}/submit`,
                    v,
                    selected.row_version,
                    "POST",
                    k,
                  )
                }
              />
            )}
          {tab === "machines" && selected && (
            <MachineDetail
              key={selected.id}
              row={selected}
              get={get}
              mutate={mutate}
              branches={branches}
              disabled={disabled}
              hasMfa={access?.hasMfa ?? false}
            />
          )}
          {tab === "templates" && (
            <TemplatePanel
              models={models}
              catalog={catalog}
              get={get}
              mutate={mutate}
              disabled={adminDisabled}
            />
          )}
          {tab === "admin" && selected && (
            <ReviewPanel
              row={selected}
              models={models}
              get={get}
              mutate={mutate}
              disabled={adminDisabled}
            />
          )}
          {tab === "admin/accounts" && (
            <Editor
              title="Crear cuenta e invitar titular"
              disabled={adminDisabled}
              fields={[
                { key: "accountName", label: "Nombre de cuenta", required: true },
                {
                  key: "accountType",
                  label: "Tipo de titular",
                  required: true,
                  options: [
                    { value: "INDIVIDUAL", label: "Persona física" },
                    { value: "COMPANY", label: "Persona moral" },
                  ],
                },
                { key: "email", label: "Correo del titular", type: "email", required: true },
                { key: "username", label: "Usuario del titular", required: true },
                { key: "displayName", label: "Nombre del titular", required: true },
              ]}
              submit={(v, k) =>
                mutate(
                  "admin/accounts",
                  {
                    accountName: v.accountName,
                    accountType: v.accountType,
                    owner: { email: v.email, username: v.username, displayName: v.displayName },
                  },
                  undefined,
                  "POST",
                  k,
                )
              }
            />
          )}
          {tab === "admin/accounts" && selected && (
            <>
              <AccountLoader id={selected.id} get={get} mutate={mutate} disabled={adminDisabled} />
              <Editor
                title="Cambiar acceso de cuenta"
                fields={[
                  {
                    key: "mode",
                    label: "Acceso",
                    options: [
                      { value: "force-read-only", label: "Solo lectura" },
                      { value: "restore-access", label: "Activo" },
                    ],
                    required: true,
                  },
                  reasonField,
                  confirmation,
                ]}
                disabled={adminDisabled}
                submit={(v, k) =>
                  mutate(
                    `admin/accounts/${selected.id}/${String(v.mode)}`,
                    { reason: v.reason, confirmation: v.confirmation },
                    selected.row_version,
                    "POST",
                    k,
                  )
                }
              />
            </>
          )}
          {tab === "transfers" && selected && (
            <>
              <p>
                Folio: {selected.folio}. Estado: {stateLabel(selected.status)}.
              </p>
              {(access?.canAdmin ? ["approve", "execute", "reject"] : ["cancel"]).map((action) => (
                <Editor
                  key={action}
                  title={
                    {
                      approve: "Aprobar transferencia",
                      execute: "Ejecutar transferencia",
                      reject: "Rechazar transferencia",
                      cancel: "Cancelar transferencia",
                    }[action] ?? action
                  }
                  fields={[reasonField, confirmation]}
                  disabled={disabled || !access?.hasMfa}
                  submit={(v, k) =>
                    mutate(
                      `${action === "cancel" ? "" : "admin/"}machine-transfers/${selected.id}/${action}`,
                      v,
                      selected.row_version,
                      "POST",
                      k,
                    )
                  }
                />
              ))}
            </>
          )}
        </section>
      )}
    </main>
  );
}

function AccountEditor({
  row,
  mutate,
  disabled,
  admin = false,
}: {
  row: Row;
  mutate: Mutation;
  disabled: boolean;
  admin?: boolean;
}) {
  const details = row.details ?? {};
  const contact = (details.contact ?? {}) as Record<string, unknown>;
  const tax = (details.taxProfile ?? {}) as Record<string, unknown>;
  const modules = (details.moduleConfiguration ?? {}) as Record<string, unknown>;
  return (
    <>
      <p>
        {row.name} · {String(row.access_mode)}
      </p>
      <Editor
        title="Datos de cuenta"
        disabled={disabled}
        fields={[
          {
            key: "displayName",
            label: "Nombre visible",
            value: String(details.displayName ?? row.name),
            required: true,
          },
          {
            key: "legalName",
            label: "Nombre o razón social",
            value: String(details.legalName ?? ""),
            required: true,
          },
          {
            key: "timezone",
            label: "Zona horaria",
            value: String(details.timezone ?? "America/Mexico_City"),
            required: true,
          },
          {
            key: "email",
            label: "Correo de contacto",
            type: "email",
            value: String(contact.email ?? ""),
            required: true,
          },
          { key: "phone", label: "Teléfono", value: String(contact.phone ?? "") },
          { key: "taxId", label: "RFC", value: String(tax.taxId ?? "") },
          {
            key: "fiscalAddress",
            label: "Domicilio fiscal",
            value: String(tax.fiscalAddress ?? ""),
          },
          ...["maintenance", "sanitation", "inventory", "commercial"].map((key, i) => ({
            key,
            label: ["Mantenimiento", "Sanidad", "Inventario", "Comercial"][i]!,
            type: "checkbox" as const,
            value: Boolean(modules[key]),
          })),
        ]}
        submit={(v, k) =>
          mutate(
            `${admin ? "admin/" : ""}accounts/${row.id}`,
            {
              displayName: v.displayName,
              legalName: v.legalName,
              timezone: v.timezone,
              currency: "MXN",
              contact: { email: v.email, phone: v.phone },
              taxProfile: { taxId: v.taxId, fiscalAddress: v.fiscalAddress },
              moduleConfiguration: {
                maintenance: v.maintenance,
                sanitation: v.sanitation,
                inventory: v.inventory,
                commercial: v.commercial,
              },
            },
            row.row_version,
            "PATCH",
            k,
          )
        }
      />
    </>
  );
}
function AccountLoader({
  id,
  get,
  mutate,
  disabled,
}: {
  id: string;
  get: (p: string) => Promise<unknown>;
  mutate: Mutation;
  disabled: boolean;
}) {
  const [row, setRow] = useState<Row>();
  useEffect(() => {
    void get(`admin/accounts/${id}`).then((v) => setRow(v as Row));
  }, [get, id]);
  return row ? (
    <AccountEditor row={row} mutate={mutate} disabled={disabled} admin />
  ) : (
    <p>Cargando cuenta…</p>
  );
}
function Dashboard({ get }: { get: (p: string) => Promise<unknown> }) {
  const [data, setData] = useState<Record<string, unknown>>();
  useEffect(() => {
    void get("admin/dashboard").then((v) => setData(v as Record<string, unknown>));
  }, [get]);
  return (
    <dl className="data-list">
      {[
        ["accounts", "Cuentas"],
        ["pending_requests", "Solicitudes pendientes"],
        ["machines", "Máquinas"],
        ["draft_templates", "Plantillas en borrador"],
        ["failed_jobs", "Calendarios con error"],
      ].map(([key, title]) => (
        <div key={key}>
          <dt>{title}</dt>
          <dd>{String(data?.[key!] ?? "…")}</dd>
        </div>
      ))}
    </dl>
  );
}

function RequestEditor({
  selected,
  branches,
  catalog,
  mutate,
  disabled,
}: {
  selected: Row | undefined;
  branches: Row[];
  catalog: Row[];
  mutate: Mutation;
  disabled: boolean;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("file");
    if (!(file instanceof File)) return;
    if (file.size > 5_242_880) {
      setMessage("El archivo debe pesar como máximo 5 MiB.");
      return;
    }
    setMessage("Validando documento…");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const result = (await mutate("equipment-files", {
        filename: file.name,
        contentType: file.type,
        contentBase64: btoa(binary),
      })) as { id: string; status: string };
      if (result.status === "clean") {
        setFiles((f) => [...f, result.id]);
        setMessage("Documento validado y listo para adjuntar.");
      } else
        setMessage(
          `Documento ${result.status === "quarantine" ? "en cuarentena; el escáner debe estar disponible" : "rechazado por el escáner"}. Referencia: ${result.id}`,
        );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo adjuntar.");
    }
  }
  const data = selected?.data ?? {};
  return (
    <>
      <form onSubmit={upload}>
        <label>
          Documento o fotografía (PDF, JPEG o PNG, máximo 5 MiB)
          <input
            type="file"
            name="file"
            accept="application/pdf,image/jpeg,image/png"
            required
            disabled={disabled}
          />
        </label>
        <button disabled={disabled}>Validar documento</button>
        <p role="status">{message}</p>
      </form>
      <Editor
        key={selected?.id ?? "new"}
        title={selected ? "Editar solicitud" : "Nueva solicitud"}
        disabled={
          disabled ||
          (!!selected && !["draft", "information_required"].includes(selected.status ?? ""))
        }
        fields={[
          {
            key: "branchId",
            label: "Sucursal",
            options: options(branches.filter((b) => b.status === "active")),
            value: String(data.branchId ?? ""),
            required: true,
          },
          {
            key: "manufacturerId",
            label: "Fabricante",
            options: options(catalog.filter((c) => c.kind === "manufacturer")),
            value: String(data.manufacturerId ?? ""),
          },
          { key: "modelName", label: "Modelo declarado", value: String(data.modelName ?? "") },
          { key: "serialNumber", label: "Número de serie", value: String(data.serialNumber ?? "") },
          {
            key: "capacity",
            label: "Capacidad nominal",
            type: "number",
            value: typeof data.capacity === "number" ? data.capacity : "",
          },
        ]}
        submit={(v, k) =>
          mutate(
            selected ? `equipment-requests/${selected.id}` : "equipment-requests",
            {
              ...v,
              manufacturerId: v.manufacturerId || undefined,
              capacity: v.capacity ?? undefined,
              characteristics: data.characteristics ?? {},
              fileIds: [...((data.fileIds ?? []) as string[]), ...files],
            },
            selected?.row_version,
            selected ? "PATCH" : "POST",
            k,
          )
        }
      />
      <p>
        Documentos nuevos validados: {files.length}. Guarda el borrador antes de enviarlo a
        revisión.
      </p>
    </>
  );
}

function MachineDetail({
  row,
  get,
  mutate,
  branches,
  disabled,
  hasMfa,
}: {
  row: Row;
  get: (p: string) => Promise<unknown>;
  mutate: Mutation;
  branches: Row[];
  disabled: boolean;
  hasMfa: boolean;
}) {
  const [history, setHistory] = useState<Row[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void get(`machines/${row.id}/schedules`)
      .then((v) => setHistory(v as Row[]))
      .catch(() => setError("No fue posible cargar el calendario."));
  }, [get, row.id]);
  return (
    <article>
      <h3>Expediente {row.machine_code}</h3>
      <dl className="data-list">
        {[
          ["operational_status", "Operación"],
          ["technical_status", "Condición técnica"],
          ["sanitary_status", "Condición sanitaria"],
          ["publication_status", "Publicación"],
        ].map(([k, n]) => (
          <div key={k}>
            <dt>{n}</dt>
            <dd>{stateLabel(row[k!])}</dd>
          </div>
        ))}
      </dl>
      <Editor
        title="Editar nombre y marca"
        fields={[
          {
            key: "internalName",
            label: "Nombre interno",
            required: true,
            value: String(row.data?.internalName ?? ""),
          },
          {
            key: "commercialBrand",
            label: "Marca comercial",
            value: String(row.data?.commercialBrand ?? ""),
          },
        ]}
        disabled={disabled}
        submit={(v, k) => mutate(`machines/${row.id}`, v, row.row_version, "PATCH", k)}
      />
      <Editor
        title="Cambiar estado operativo"
        fields={[
          {
            key: "status",
            label: "Estado",
            required: true,
            options: ["available", "off", "maintenance", "out_of_service", "suspended"].map(
              (s) => ({ value: s, label: stateLabel(s) }),
            ),
          },
          reasonField,
          confirmation,
        ]}
        disabled={disabled}
        submit={(v, k) =>
          mutate(`machines/${row.id}/operational-status`, v, row.row_version, "POST", k)
        }
      />
      <Editor
        title="Trasladar a otra sucursal"
        fields={[
          {
            key: "toBranchId",
            label: "Sucursal destino",
            options: options(
              branches.filter((b) => b.id !== row.branch_id && b.status === "active"),
            ),
            required: true,
          },
          reasonField,
          confirmation,
        ]}
        disabled={disabled || !hasMfa}
        submit={(v, k) => mutate(`machines/${row.id}/moves`, v, row.row_version, "POST", k)}
      />
      <Editor
        title="Retirar máquina definitivamente"
        fields={[reasonField, confirmation]}
        disabled={disabled || !hasMfa}
        submit={(v, k) => mutate(`machines/${row.id}/retire`, v, row.row_version, "POST", k)}
      />
      <Editor
        title="Solicitar transferencia a otra cuenta"
        fields={[
          { key: "toAccountId", label: "Referencia de cuenta destino", required: true },
          { key: "toBranchId", label: "Referencia de sucursal destino", required: true },
          reasonField,
          confirmation,
        ]}
        disabled={disabled || !hasMfa}
        submit={(v, k) =>
          mutate(
            "machine-transfers",
            {
              ...v,
              machineId: row.id,
              commercialDataTransfer: {
                sales: false,
                customers: false,
                recharges: false,
                orders: false,
              },
              authorizationFileIds: [],
            },
            row.row_version,
            "POST",
            k,
          )
        }
      />
      <h3>Actividades y trazabilidad</h3>
      <div className="equipment-nav">
        {[
          ["schedules", "Calendario"],
          ["timeline", "Movimientos"],
          ["location-history", "Ubicación"],
          ["ownership-history", "Propiedad"],
        ].map(([path, name]) => (
          <button
            key={path}
            type="button"
            onClick={() =>
              void get(`machines/${row.id}/${path}`)
                .then((v) => setHistory(v as Row[]))
                .catch(() => setError("No se pudo cargar el historial."))
            }
          >
            {name}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {!history.length ? (
        <p>Sin registros. El calendario inicial se genera en segundo plano.</p>
      ) : (
        <ul>
          {history.map((h, i) => (
            <li key={h.id ?? i}>
              {String(h.definition?.name ?? h.event_type ?? h.kind ?? "")} · {stateLabel(h.status)}{" "}
              ·{" "}
              {String(
                h.due_at ?? h.occurred_at ?? h.valid_from ?? "Pendiente de condición o evento",
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ReviewPanel({
  row,
  models,
  get,
  mutate,
  disabled,
}: {
  row: Row;
  models: Row[];
  get: (p: string) => Promise<unknown>;
  mutate: Mutation;
  disabled: boolean;
}) {
  const [versions, setVersions] = useState<Row[]>([]);
  const [modelId, setModelId] = useState("");
  return (
    <article>
      <h3>Revisión {row.folio}</h3>
      <p>
        Modelo declarado: {String(row.data?.modelName)}. Serie: {String(row.data?.serialNumber)}.
      </p>
      {((row.data?.fileIds ?? []) as string[]).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() =>
            void get(`equipment-files/${id}/download`).then((v) =>
              window.open((v as { url: string }).url, "_blank", "noopener,noreferrer"),
            )
          }
        >
          Abrir evidencia
        </button>
      ))}
      {["review", "request-information", "reject"].map((a) => (
        <Editor
          key={a}
          title={
            {
              review: "Iniciar revisión",
              "request-information": "Solicitar información",
              reject: "Rechazar solicitud",
            }[a] ?? a
          }
          fields={[reasonField, confirmation]}
          disabled={disabled}
          submit={(v, k) =>
            mutate(`admin/equipment-requests/${row.id}/${a}`, v, row.row_version, "POST", k)
          }
        />
      ))}
      <label>
        Modelo técnico validado
        <select
          value={modelId}
          onChange={(e) => {
            setModelId(e.target.value);
            void get(`technical-models/${e.target.value}/template-versions`).then((v) =>
              setVersions(v as Row[]),
            );
          }}
        >
          <option value="">Selecciona modelo</option>
          {options(models).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <Editor
        title="Aprobar y activar máquina"
        disabled={disabled || !modelId}
        fields={[
          {
            key: "templateVersionId",
            label: "Plantilla publicada",
            required: true,
            options: versions
              .filter((v) => v.status === "published")
              .map((v) => ({ value: v.id, label: `Versión ${String(v.version_number)}` })),
          },
          {
            key: "validationMethod",
            label: "Método de validación",
            required: true,
            options: [
              { value: "documents", label: "Documentos" },
              { value: "extra_photos", label: "Fotografías adicionales" },
              { value: "video_call", label: "Videollamada" },
              { value: "site_visit", label: "Visita" },
            ],
          },
          {
            key: "reviewNotes",
            label: "Resultado de revisión (mínimo 10 caracteres)",
            type: "textarea",
            required: true,
          },
          confirmation,
        ]}
        submit={(v, k) =>
          mutate(
            `admin/equipment-requests/${row.id}/approve`,
            {
              ...v,
              technicalModelId: modelId,
              validatedFileIds: row.data?.fileIds ?? [],
              initialOperationalStatus: "off",
            },
            row.row_version,
            "POST",
            k,
          )
        }
      />
    </article>
  );
}

function TemplatePanel({
  models,
  catalog,
  get,
  mutate,
  disabled,
}: {
  models: Row[];
  catalog: Row[];
  get: (p: string) => Promise<unknown>;
  mutate: Mutation;
  disabled: boolean;
}) {
  const [modelId, setModelId] = useState("");
  const [versions, setVersions] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row>();
  const [impact, setImpact] = useState("");
  return (
    <article>
      <Editor
        title="Nuevo elemento de catálogo"
        disabled={disabled}
        fields={[
          {
            key: "kind",
            label: "Tipo",
            required: true,
            options: [
              { value: "manufacturer", label: "Fabricante" },
              { value: "system", label: "Sistema" },
              { value: "component", label: "Componente" },
              { value: "characteristic", label: "Característica" },
            ],
          },
          { key: "code", label: "Código (mayúsculas, números o guion)", required: true },
          { key: "name", label: "Nombre", required: true },
        ]}
        submit={(v, k) => mutate("admin/catalogs", v, undefined, "POST", k)}
      />
      <Editor
        title="Nuevo modelo técnico"
        disabled={disabled}
        fields={[
          { key: "code", label: "Código", required: true },
          { key: "name", label: "Nombre", required: true },
          {
            key: "manufacturerId",
            label: "Fabricante",
            required: true,
            options: options(catalog.filter((c) => c.kind === "manufacturer")),
          },
          { key: "nominalCapacity", label: "Capacidad nominal", type: "number", required: true },
          {
            key: "equipmentType",
            label: "Tipo de equipo",
            required: true,
            options: [
              "ice_450",
              "ice_water_450",
              "ice_900",
              "water_vending",
              "external_validated",
              "private_label",
            ].map((t) => ({ value: t, label: t.replaceAll("_", " ") })),
          },
        ]}
        submit={(v, k) =>
          mutate("admin/technical-models", { ...v, characteristics: {} }, undefined, "POST", k)
        }
      />
      <label>
        Modelo para administrar plantillas
        <select
          value={modelId}
          onChange={(e) => {
            setModelId(e.target.value);
            setSelected(undefined);
            if (e.target.value)
              void get(`technical-models/${e.target.value}/template-versions`).then((v) =>
                setVersions(v as Row[]),
              );
          }}
        >
          <option value="">Selecciona modelo</option>
          {options(models).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <Listing
        rows={versions.map((v) => ({ ...v, name: `Versión ${String(v.version_number)}` }))}
        select={setSelected}
      />
      {modelId && (
        <TemplateEditor
          key={selected?.id ?? modelId}
          modelId={modelId}
          selected={selected}
          catalog={catalog}
          mutate={mutate}
          disabled={disabled}
        />
      )}
      {selected && (
        <>
          <button
            type="button"
            onClick={() =>
              void get(`admin/template-versions/${selected.id}/impact`).then((v) => {
                const x = v as { machines: number; future_activities: number };
                setImpact(
                  `${x.machines} máquinas del modelo; ${x.future_activities} actividades futuras.`,
                );
              })
            }
          >
            Consultar impacto
          </button>
          <p role="status">{impact}</p>
          <Editor
            title={
              selected.status === "draft" ? "Publicar versión" : "Marcar versión como sustituida"
            }
            disabled={disabled || selected.status === "superseded"}
            fields={[reasonField, confirmation]}
            submit={(v, k) =>
              mutate(
                `admin/template-versions/${selected.id}/${selected.status === "draft" ? "publish" : "supersede"}`,
                v,
                selected.row_version,
                "POST",
                k,
              )
            }
          />
          {selected.status === "published" && (
            <Editor
              title="Aplicar a una máquina: solo actividades futuras"
              disabled={disabled}
              fields={[
                { key: "machineId", label: "Referencia de máquina", required: true },
                {
                  key: "version",
                  label: "Versión actual del expediente",
                  type: "number",
                  required: true,
                },
                reasonField,
                confirmation,
              ]}
              submit={(v, k) =>
                mutate(
                  `admin/machines/${String(v.machineId)}/template`,
                  {
                    templateVersionId: selected.id,
                    reason: v.reason,
                    confirmation: v.confirmation,
                  },
                  Number(v.version),
                  "POST",
                  k,
                )
              }
            />
          )}
        </>
      )}
    </article>
  );
}
function TemplateEditor({
  modelId,
  selected,
  catalog,
  mutate,
  disabled,
}: {
  modelId: string;
  selected: Row | undefined;
  catalog: Row[];
  mutate: Mutation;
  disabled: boolean;
}) {
  const [activities, setActivities] = useState<Record<string, unknown>[]>(() =>
    Array.isArray(selected?.definition?.activities)
      ? (selected.definition.activities as Record<string, unknown>[])
      : [],
  );
  return (
    <>
      <Editor
        title="Agregar actividad a la nueva versión"
        disabled={disabled}
        fields={[
          { key: "code", label: "Código", required: true },
          { key: "name", label: "Actividad", required: true },
          {
            key: "category",
            label: "Categoría",
            options: [
              { value: "maintenance", label: "Mantenimiento" },
              { value: "sanitation", label: "Sanidad" },
              { value: "inspection", label: "Inspección" },
            ],
            required: true,
          },
          {
            key: "triggerType",
            label: "Disparador",
            required: true,
            options: [
              { value: "time", label: "Tiempo" },
              { value: "usage", label: "Uso" },
              { value: "condition", label: "Condición" },
              { value: "event", label: "Evento" },
            ],
          },
          { key: "frequencyDays", label: "Frecuencia en días (solo por tiempo)", type: "number" },
          {
            key: "triggerDescription",
            label: "Condición de activación (uso, condición o evento)",
            type: "textarea",
          },
          { key: "responsibleRole", label: "Rol responsable", value: "TC", required: true },
          {
            key: "checklist",
            label: "Puntos del checklist (uno por línea)",
            type: "textarea",
            required: true,
          },
          {
            key: "minimumFiles",
            label: "Evidencias mínimas",
            type: "number",
            value: 1,
            required: true,
          },
          {
            key: "afterHours",
            label: "Escalar tras horas",
            type: "number",
            value: 24,
            required: true,
          },
          { key: "fields", label: "Campos de captura (uno por línea)", type: "textarea" },
          { key: "notifyRole", label: "Rol al que escalar", value: "OW", required: true },
          {
            key: "criticality",
            label: "Criticidad",
            required: true,
            options: [
              { value: "low", label: "Baja" },
              { value: "medium", label: "Media" },
              { value: "high", label: "Alta" },
              { value: "critical", label: "Crítica" },
            ],
          },
        ]}
        submit={async (v) => {
          const activity = activityInputSchema.parse({
            code: v.code,
            name: v.name,
            category: v.category,
            frequencyDays: v.triggerType === "time" ? v.frequencyDays : null,
            triggerType: v.triggerType,
            triggerDescription: v.triggerDescription,
            responsibleRole: v.responsibleRole,
            checklist: String(v.checklist)
              .split("\n")
              .filter(Boolean)
              .map((label, i) => ({ code: `CHECK_${i + 1}`, label, required: true })),
            fields: String(v.fields)
              .split("\n")
              .filter(Boolean)
              .map((label, i) => ({ code: `FIELD_${i + 1}`, label, type: "text", required: true })),
            evidenceRules: { required: Number(v.minimumFiles) > 0, minimumFiles: v.minimumFiles },
            escalationRules: { afterHours: v.afterHours, notifyRole: v.notifyRole },
            criticality: v.criticality,
          });
          if (activities.some((a) => a.code === activity.code))
            throw new Error("El código de actividad ya existe.");
          setActivities((a) => [...a, activity]);
        }}
      />
      <p>Actividades agregadas: {activities.map((a) => String(a.name)).join(", ") || "Ninguna"}.</p>
      {activities.map((activity, index) => (
        <button
          type="button"
          disabled={disabled}
          key={String(activity.code)}
          onClick={() => setActivities((values) => values.filter((_, i) => i !== index))}
        >
          Quitar {String(activity.name)}
        </button>
      ))}
      <Editor
        title={
          selected?.status === "draft" ? "Guardar definición del borrador" : "Crear nueva versión"
        }
        disabled={disabled}
        fields={[
          {
            key: "changeSummary",
            label: "Descripción del cambio (mínimo 10 caracteres)",
            type: "textarea",
            required: true,
          },
          {
            key: "systemIds",
            label: "Sistemas (permite varias selecciones)",
            multiple: true,
            value: (selected?.definition?.systems ?? []) as string[],
            options: options(catalog.filter((c) => c.kind === "system")),
            required: true,
          },
          {
            key: "componentIds",
            label: "Componentes (permite varias selecciones)",
            multiple: true,
            value: (selected?.definition?.components ?? []) as string[],
            options: options(catalog.filter((c) => c.kind === "component")),
            required: true,
          },
        ]}
        submit={(v, k) =>
          mutate(
            selected?.status === "draft"
              ? `admin/template-versions/${selected.id}`
              : `admin/technical-models/${modelId}/template-versions`,
            {
              changeSummary: v.changeSummary,
              systems: v.systemIds,
              components: v.componentIds,
              activities,
            },
            selected?.status === "draft" ? selected.row_version : undefined,
            selected?.status === "draft" ? "PATCH" : "POST",
            k,
          )
        }
      />
    </>
  );
}
