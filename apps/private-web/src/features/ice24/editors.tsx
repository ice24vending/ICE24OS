"use client";
import { useState } from "react";
import { Button } from "@ice24/ui";
import { Editor, type Field, type Row, type Mutation } from "../equipment/workspace";
import { rowLabel } from "./model";
const options = (rows: Row[]) => rows.map((row) => ({ value: row.id, label: rowLabel(row) }));
export const reasonField: Field = {
  key: "reason",
  label: "Motivo (al menos 10 caracteres)",
  type: "textarea",
  required: true,
};
export const confirmation: Field = {
  key: "confirmation",
  label: "Confirmo que revisé los datos y deseo ejecutar esta acción",
  type: "checkbox",
  required: true,
};
export function CatalogCreation({
  catalog,
  mutate,
  disabled,
}: {
  catalog: Row[];
  mutate: Mutation;
  disabled: boolean;
}) {
  return (
    <>
      {" "}
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
            ].map((t) => ({
              value: t,
              label: (
                {
                  ice_450: "Hielo 450",
                  ice_water_450: "Hielo y agua 450",
                  ice_900: "Hielo 900",
                  water_vending: "Despachadora de agua",
                  external_validated: "Equipo externo validado",
                  private_label: "Marca propia",
                } as Record<string, string>
              )[t]!,
            })),
          },
        ]}
        submit={(v, k) =>
          mutate("admin/technical-models", { ...v, characteristics: {} }, undefined, "POST", k)
        }
      />
    </>
  );
}
export function AccountCreation({
  mutate,
  disabled: adminDisabled,
}: {
  mutate: Mutation;
  disabled: boolean;
}) {
  return (
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
  );
}
export function TemplateActions({
  selected,
  get,
  mutate,
  disabled,
}: {
  selected: Row;
  get: (path: string) => Promise<unknown>;
  mutate: Mutation;
  disabled: boolean;
}) {
  const [impact, setImpact] = useState("");
  return (
    <>
      {" "}
      <Button
        icon="search"
        variant="secondary"
        type="button"
        onClick={() =>
          void get(`admin/template-versions/${selected.id}/impact`)
            .then((v) => {
              const x = v as { machines: number; future_activities: number };
              setImpact(
                `${x.machines} máquinas del modelo; ${x.future_activities} actividades futuras.`,
              );
            })
            .catch(() => setImpact("No fue posible consultar el impacto. Intenta nuevamente."))
        }
      >
        Consultar impacto
      </Button>
      <p role="status">{impact}</p>
      <Editor
        title={selected.status === "draft" ? "Publicar versión" : "Marcar versión como sustituida"}
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
  );
}
