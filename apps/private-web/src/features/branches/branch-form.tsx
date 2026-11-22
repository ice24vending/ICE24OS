"use client";
import { useRef, useState, type FormEvent } from "react";
import { branchInputSchema, type BranchInput, type BranchOverview } from "@ice24/contracts";
import { Banner, Button, ButtonLink, Card, Checkbox, Dialog, TextArea, TextField } from "@ice24/ui";
import { ServiceState } from "../../components/system-state/service-state";
import { toFailure, type Failure } from "../../components/system-state/failure";
import { useUnsavedChanges } from "../context/unsaved-changes";
import { useAccountAccess } from "../account-shell/access-provider";
import type { EquipmentClient } from "../equipment/configuration-client";

export function BranchForm({
  branch,
  client,
  backHref,
  onSaved,
  onCancel,
}: {
  branch?: BranchOverview | undefined;
  client: EquipmentClient;
  backHref: string;
  onSaved: (row: BranchOverview) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discard, setDiscard] = useState(false);
  const [version, setVersion] = useState(branch?.row_version);
  const [latest, setLatest] = useState<BranchOverview>();
  const { canWrite, online, markReadOnly } = useAccountAccess();
  const receipt = useRef({ body: "", key: "" });
  const formRef = useRef<HTMLFormElement>(null);
  const data = branch?.data;
  useUnsavedChanges(dirty);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canWrite || !online) return;
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);
    const parsed = branchInputSchema.safeParse({
      ...values,
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      referenceTemperature:
        values.referenceTemperature === "" ? null : Number(values.referenceTemperature),
      ownerPhonePublic: form.has("ownerPhonePublic"),
    });
    if (!parsed.success) {
      const next = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          "Revisa este valor y sus límites.",
        ]),
      );
      setErrors(next);
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    const body: Partial<BranchInput> = branch
      ? Object.fromEntries(
          Object.entries(parsed.data).filter(
            ([key, value]) => value !== data?.[key as keyof BranchInput],
          ),
        )
      : parsed.data;
    if (branch && Object.keys(body).length === 0) {
      setDirty(false);
      onCancel?.();
      return;
    }
    const serialized = JSON.stringify(body);
    if (receipt.current.body !== serialized)
      receipt.current = { body: serialized, key: crypto.randomUUID() };
    setPending(true);
    setFailure(undefined);
    setErrors({});
    try {
      const row = await client.send<BranchOverview>(
        branch ? `branches/${branch.id}` : "branches",
        body,
        { method: branch ? "PATCH" : "POST", version, key: receipt.current.key },
      );
      setDirty(false);
      onSaved(row);
    } catch (error) {
      const problem = toFailure(error, "No fue posible guardar la sucursal.");
      setFailure(problem);
      if (problem.kind === "read_only") markReadOnly();
    } finally {
      setPending(false);
    }
  }
  const text = (key: keyof BranchInput, label: string, required = false, maxLength = 200) => (
    <TextField
      key={key}
      label={label}
      name={key}
      required={required}
      defaultValue={String(data?.[key] ?? "")}
      maxLength={maxLength}
      error={errors[key]}
    />
  );
  const cancel = () => (dirty ? setDiscard(true) : onCancel?.());
  return (
    <form
      ref={formRef}
      aria-label={branch ? "Editar sucursal" : "Datos de la nueva sucursal"}
      onSubmit={submit}
      onChange={() => setDirty(true)}
      className="branches-stack"
    >
      {failure && <ServiceState {...failure} />}
      {failure?.kind === "conflict" && (
        <Banner tone="warning" title="Tus cambios siguen en el formulario">
          <p>
            Revisa la versión actual antes de volver a guardar. Solo se enviarán los campos que
            modificaste.
          </p>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={async () => {
              if (!branch) return;
              setPending(true);
              try {
                setLatest(await client.get<BranchOverview>(`branches/${branch.id}`));
              } catch (error) {
                setFailure(toFailure(error, "No fue posible consultar la versión actual."));
              } finally {
                setPending(false);
              }
            }}
          >
            Revisar versión actual
          </Button>
        </Banner>
      )}
      {latest && (
        <Card title="Versión actual guardada">
          <dl className="branches-data">
            {Object.entries(latest.data).map(([key, value]) => (
              <div key={key}>
                <dt>
                  {
                    (
                      {
                        name: "Nombre",
                        code: "Código",
                        address: "Dirección",
                        city: "Ciudad",
                        state: "Entidad federativa",
                        notes: "Notas",
                        latitude: "Latitud",
                        longitude: "Longitud",
                        timezone: "Zona horaria",
                        schedule: "Horario de atención",
                        publicPhone: "Teléfono público",
                        ownerPhonePublic: "Teléfono del propietario autorizado",
                        referenceTemperature: "Temperatura de referencia",
                      } as Record<string, string>
                    )[key]
                  }
                </dt>
                <dd>
                  {typeof value === "boolean"
                    ? value
                      ? "Sí"
                      : "No"
                    : String(value ?? "Sin capturar")}
                </dd>
              </div>
            ))}
          </dl>
          <Button
            variant="secondary"
            onClick={() => {
              setVersion(latest.row_version);
              setLatest(undefined);
              setFailure(undefined);
              receipt.current = { body: "", key: "" };
            }}
          >
            Continuar con mis cambios
          </Button>
        </Card>
      )}
      <fieldset disabled={pending || !canWrite || !online} className="branches-fieldset">
        <legend className="ids-visually-hidden">Datos de la sucursal</legend>
        <Card title="Identificación y ubicación">
          <div className="branches-fields">
            {text("name", "Nombre", true)}
            {text("code", "Código", false, 40)}
            {text("address", "Dirección", true, 1000)}
            {text("city", "Ciudad")}
            {text("state", "Entidad federativa")}
            <TextField
              label="Zona horaria"
              name="timezone"
              defaultValue={data?.timezone ?? "America/Mexico_City"}
              required
              maxLength={64}
              help="Por ejemplo: America/Mexico_City o America/Tijuana."
              error={errors.timezone}
            />
            <TextField
              label="Responsable"
              value={branch?.responsible ?? "Sin responsable asignado"}
              readOnly
              help="Se obtiene de los administradores asignados a esta sucursal."
            />
            {text("publicPhone", "Teléfono público", false, 40)}
          </div>
        </Card>
        <Card title="Datos complementarios">
          <div className="branches-fields">
            {text("schedule", "Horario de atención", false, 1000)}
            <TextField
              label="Latitud"
              name="latitude"
              type="number"
              step="any"
              min={-90}
              max={90}
              required
              defaultValue={data?.latitude ?? ""}
              error={errors.latitude}
            />
            <TextField
              label="Longitud"
              name="longitude"
              type="number"
              step="any"
              min={-180}
              max={180}
              required
              defaultValue={data?.longitude ?? ""}
              error={errors.longitude}
            />
            <TextField
              label="Temperatura de referencia"
              name="referenceTemperature"
              type="number"
              step="any"
              min={-80}
              max={100}
              suffix="°C"
              defaultValue={data?.referenceTemperature ?? ""}
              error={errors.referenceTemperature}
            />
            <Checkbox
              name="ownerPhonePublic"
              label="Autorizar la publicación del teléfono del propietario"
              defaultChecked={data?.ownerPhonePublic ?? false}
            />
          </div>
          <TextArea
            label="Notas"
            name="notes"
            defaultValue={data?.notes ?? ""}
            maxLength={2000}
            error={errors.notes}
          />
        </Card>
      </fieldset>
      <div className="branches-actions">
        <Button
          variant="primary"
          icon="save"
          type="submit"
          loading={pending}
          disabled={!canWrite || !online}
        >
          {branch ? "Guardar cambios" : "Crear sucursal"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={cancel} disabled={pending}>
            Cancelar
          </Button>
        ) : (
          <ButtonLink variant="secondary" href={backHref}>
            Cancelar
          </ButtonLink>
        )}
      </div>
      <Dialog
        open={discard}
        onClose={() => setDiscard(false)}
        title="Tienes cambios sin guardar"
        role="alertdialog"
      >
        <p>Si cancelas, los cambios que no guardaste se perderán.</p>
        <div className="branches-actions">
          <Button onClick={() => setDiscard(false)}>Seguir editando</Button>
          <Button
            variant="danger"
            onClick={() => {
              setDirty(false);
              setDiscard(false);
              onCancel?.();
            }}
          >
            Descartar cambios
          </Button>
        </div>
      </Dialog>
    </form>
  );
}
