"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button, Checkbox, Dialog, RadioGroup, TextArea } from "@ice24/ui";
import { ASSIGNABLE_ROLES, SCOPE_NAMES, type MemberScope } from "./labels";
import type { ScopeOptions } from "./model";

export interface RoleScopeValue {
  role: string;
  scope: MemberScope;
  branchIds: readonly string[];
  machineIds: readonly string[];
  denyEquipmentChanges?: boolean;
}

/**
 * Role with what it allows, then the scope (UXD-09): whole account, one or more branches, or
 * machines; the machine list appears only for «Máquinas». One role per person, as the API keeps.
 */
export function RoleScopeFields({
  initial,
  options,
  ownerOnly = false,
  advanced = false,
  errors = {},
}: {
  initial?: RoleScopeValue | undefined;
  options: ScopeOptions;
  /** The only active Owner keeps the role: the other options explain why they are off. */
  ownerOnly?: boolean;
  /** «Denegar explícitamente cambios de equipos», offered only when editing a membership. */
  advanced?: boolean;
  errors?: Record<string, string>;
}) {
  const [scope, setScope] = useState<MemberScope>(initial?.scope ?? "ACCOUNT");
  return (
    <>
      <RadioGroup
        label="Rol"
        name="role"
        required
        defaultValue={initial?.role}
        error={errors.role}
        options={ASSIGNABLE_ROLES.map((role) => ({
          ...role,
          disabled: ownerOnly && role.value !== "OW",
          description:
            ownerOnly && role.value !== "OW"
              ? "No disponible: es el único Dueño activo de la cuenta."
              : role.description,
        }))}
      />
      <RadioGroup
        label="Alcance"
        name="scope"
        required
        orientation="horizontal"
        value={scope}
        onChange={(value) => setScope(value as MemberScope)}
        options={(Object.keys(SCOPE_NAMES) as MemberScope[]).map((value) => ({
          value,
          label: SCOPE_NAMES[value],
        }))}
      />
      {scope === "BRANCH" && (
        <ChoiceList
          legend="Sucursales"
          name="branchIds"
          error={errors.branchIds}
          empty="La cuenta aún no tiene sucursales activas."
          items={options.branches.map((b) => ({ id: b.id, label: b.name }))}
          checked={initial?.branchIds ?? []}
        />
      )}
      {scope === "MACHINE" && (
        <ChoiceList
          legend="Máquinas"
          name="machineIds"
          error={errors.machineIds}
          empty="La cuenta aún no tiene máquinas activas."
          items={options.machines}
          checked={initial?.machineIds ?? []}
        />
      )}
      {advanced && (
        <details className="users-advanced">
          <summary>Opciones avanzadas</summary>
          <Checkbox
            name="denyEquipmentChanges"
            defaultChecked={initial?.denyEquipmentChanges}
            label="Denegar explícitamente cambios de equipos"
            help="Aunque su rol lo permita, no podrá modificar sucursales ni máquinas."
          />
        </details>
      )}
    </>
  );
}

function ChoiceList({
  legend,
  name,
  items,
  checked,
  empty,
  error,
}: {
  legend: string;
  name: string;
  items: readonly { id: string; label: string }[];
  checked: readonly string[];
  empty: string;
  error?: string | undefined;
}) {
  return (
    <fieldset className="users-choices" aria-invalid={error ? true : undefined}>
      <legend className="ids-field__label">{legend}</legend>
      {items.length === 0 ? (
        <p>{empty}</p>
      ) : (
        items.map((item) => (
          <Checkbox
            key={item.id}
            name={name}
            value={item.id}
            label={item.label}
            defaultChecked={checked.includes(item.id)}
          />
        ))
      )}
      {error && (
        <p className="users-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Reads the fields above; a branch or machine scope must name at least one. */
export function readRoleScope(form: FormData): {
  value?: RoleScopeValue;
  errors: Record<string, string>;
} {
  const role = String(form.get("role") ?? "");
  const scope = String(form.get("scope") ?? "ACCOUNT") as MemberScope;
  const branchIds = scope === "BRANCH" ? form.getAll("branchIds").map(String) : [];
  const machineIds = scope === "MACHINE" ? form.getAll("machineIds").map(String) : [];
  const errors: Record<string, string> = {};
  if (!role) errors.role = "Elige un rol.";
  if (scope === "BRANCH" && !branchIds.length) errors.branchIds = "Elige al menos una sucursal.";
  if (scope === "MACHINE" && !machineIds.length) errors.machineIds = "Elige al menos una máquina.";
  return Object.keys(errors).length
    ? { errors }
    : {
        errors,
        value: {
          role,
          scope,
          branchIds,
          machineIds,
          denyEquipmentChanges: form.has("denyEquipmentChanges"),
        },
      };
}

/** Confirmation with a mandatory reason (UXD-09 decision 9): every save and every action. */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** Resolves on success; a thrown error stays in the dialog. */
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      await onConfirm(String(new FormData(event.currentTarget).get("reason") ?? "").trim());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible guardar el cambio.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!pending}
      role={danger ? "alertdialog" : "dialog"}
      title={title}
      description={description}
    >
      <form onSubmit={submit} className="users-confirm">
        <TextArea
          label="Motivo"
          name="reason"
          required
          minLength={10}
          maxLength={2000}
          help="Queda registrado en la auditoría. Al menos 10 caracteres."
        />
        <Checkbox
          name="confirmation"
          required
          label="Confirmo que revisé los datos y deseo continuar"
        />
        {message && (
          <p role="alert" className="users-error">
            {message}
          </p>
        )}
        <div className="users-actions">
          <Button variant={danger ? "danger" : "primary"} type="submit" loading={pending}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Volver
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
