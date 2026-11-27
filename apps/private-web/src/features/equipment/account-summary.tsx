"use client";
import { useRef, useState, type FormEvent } from "react";
import { accountDetailsSchema, type ModuleConfiguration } from "@ice24/contracts";
import { Button, Card, StatusTag, TextArea, TextField } from "@ice24/ui";
import { ServiceState } from "../../components/system-state/service-state";
import { toFailure, type Failure } from "../../components/system-state/failure";
import { useUnsavedChanges } from "../context/unsaved-changes";
import type { EquipmentClient } from "./configuration-client";
import { MODULES } from "./account-model";

export interface AccountRow {
  id: string;
  name?: string;
  row_version: number;
  access_mode?: unknown;
  created_at?: unknown;
  details?: Record<string, unknown>;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");
const record = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/**
 * «Mi cuenta» (UXD-08): account data at a glance, «Editar» saved through PATCH accounts/:id
 * (If-Match + ACCOUNT_UPDATED audit) and the contracted modules, read-only.
 */
export function AccountSummary({
  row,
  modules,
  plan,
  client,
  canEdit,
  onSaved,
}: {
  row: AccountRow;
  modules: ModuleConfiguration | null;
  plan: string | null;
  client: EquipmentClient;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState("");
  const details = record(row.details);
  const contact = record(details.contact);
  const tax = record(details.taxProfile);
  const timezone = text(details.timezone) || "America/Mexico_City";
  const created = text(row.created_at);
  const active = row.access_mode === "ACTIVE";
  const facts: [string, string][] = [
    ["Razón social", text(details.legalName)],
    ["Nombre comercial", text(details.displayName) || text(row.name)],
    ["RFC", text(tax.taxId)],
    ["Correo de contacto", text(contact.email)],
    ["Teléfono de contacto", text(contact.phone)],
    ["Domicilio fiscal", text(tax.fiscalAddress)],
    ["Zona horaria", timezone],
    [
      "Fecha de alta",
      created
        ? new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: timezone }).format(
            new Date(created),
          )
        : "",
    ],
    ...(plan ? [["Plan", plan] as [string, string]] : []),
  ];
  return (
    <div className="account-summary">
      <p role="status" className="account-summary__saved">
        {saved}
      </p>
      {editing ? (
        <AccountForm
          row={row}
          client={client}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setSaved("Datos de la cuenta guardados.");
            onSaved();
          }}
        />
      ) : (
        <Card
          title="Datos de la cuenta"
          titleAs="h3"
          actions={
            canEdit && (
              <Button icon="edit" variant="secondary" onClick={() => setEditing(true)}>
                Editar
              </Button>
            )
          }
        >
          <dl className="account-summary__data">
            <div>
              <dt>Estado</dt>
              <dd>
                <StatusTag tone={active ? "success" : "warning"}>
                  {active ? "Activa" : "Solo lectura"}
                </StatusTag>
              </dd>
            </div>
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "Sin capturar"}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
      <Card
        title="Módulos contratados"
        titleAs="h3"
        description="ICE24 activa o desactiva cada módulo según tu contrato. Para cambiarlos, contacta a ICE24."
      >
        {modules ? (
          <ul className="account-modules">
            {modules.modules.map(({ code, enabled }) => (
              <li key={code}>
                <div>
                  <strong>{MODULES[code][0]}</strong>
                  <p>{MODULES[code][1]}</p>
                </div>
                <StatusTag
                  tone={enabled ? "success" : "nodata"}
                  icon={enabled ? undefined : "lock"}
                >
                  {enabled ? "Activo" : "Desactivado por ICE24"}
                </StatusTag>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No fue posible consultar los módulos. Usa «Actualizar datos» para intentarlo de nuevo.
          </p>
        )}
      </Card>
    </div>
  );
}

function AccountForm({
  row,
  client,
  onCancel,
  onSaved,
}: {
  row: AccountRow;
  client: EquipmentClient;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const receipt = useRef({ body: "", key: "" });
  const formRef = useRef<HTMLFormElement>(null);
  const details = record(row.details);
  const contact = record(details.contact);
  const tax = record(details.taxProfile);
  const modules = record(details.moduleConfiguration);
  useUnsavedChanges(dirty);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const parsed = accountDetailsSchema.safeParse({
      displayName: value("displayName"),
      legalName: value("legalName"),
      timezone: value("timezone"),
      currency: "MXN",
      contact: { email: value("email"), phone: value("phone") },
      taxProfile: { taxId: value("taxId"), fiscalAddress: value("fiscalAddress") },
      // Kept as stored: the screen no longer shows these flags, but the contract requires them.
      moduleConfiguration: {
        maintenance: Boolean(modules.maintenance),
        sanitation: Boolean(modules.sanitation),
        inventory: Boolean(modules.inventory),
        commercial: Boolean(modules.commercial),
      },
    });
    if (!parsed.success) {
      const names: Record<string, string> = { contact: "email", taxProfile: "taxId" };
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => {
            const [first, second] = issue.path.map(String);
            const key = first === "contact" || first === "taxProfile" ? second! : first!;
            return [names[key] ?? key, "Revisa este valor y sus límites."];
          }),
        ),
      );
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    const serialized = JSON.stringify(parsed.data);
    if (receipt.current.body !== serialized)
      receipt.current = { body: serialized, key: crypto.randomUUID() };
    setPending(true);
    setFailure(undefined);
    setErrors({});
    try {
      await client.send(`accounts/${row.id}`, parsed.data, {
        method: "PATCH",
        version: row.row_version,
        key: receipt.current.key,
      });
      setDirty(false);
      onSaved();
    } catch (error) {
      setFailure(toFailure(error, "No fue posible guardar los datos de la cuenta."));
    } finally {
      setPending(false);
    }
  }
  const field = (name: string, label: string, value: unknown, extra = {}) => (
    <TextField
      label={label}
      name={name}
      defaultValue={text(value)}
      maxLength={200}
      error={errors[name]}
      {...extra}
    />
  );
  return (
    <form
      ref={formRef}
      aria-label="Editar datos de la cuenta"
      onSubmit={submit}
      onChange={() => setDirty(true)}
    >
      <Card title="Editar datos de la cuenta" titleAs="h3">
        {failure && <ServiceState {...failure} />}
        <fieldset disabled={pending} className="account-summary__fields">
          <legend className="ids-visually-hidden">Datos de la cuenta</legend>
          {field("legalName", "Razón social", details.legalName, { required: true })}
          {field("displayName", "Nombre comercial", details.displayName ?? row.name, {
            required: true,
          })}
          {field("taxId", "RFC", tax.taxId, { maxLength: 30 })}
          {field("email", "Correo de contacto", contact.email, { type: "email", required: true })}
          {field("phone", "Teléfono de contacto", contact.phone, { type: "tel", maxLength: 40 })}
          {field("timezone", "Zona horaria", details.timezone ?? "America/Mexico_City", {
            required: true,
            maxLength: 64,
            help: "Por ejemplo: America/Mexico_City o America/Tijuana.",
          })}
          <TextArea
            label="Domicilio fiscal"
            name="fiscalAddress"
            defaultValue={text(tax.fiscalAddress)}
            maxLength={1000}
            error={errors.fiscalAddress}
          />
        </fieldset>
        <div className="account-summary__actions">
          <Button variant="primary" icon="save" type="submit" loading={pending}>
            Guardar cambios
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        </div>
      </Card>
    </form>
  );
}
