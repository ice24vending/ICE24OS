"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DetailLayout,
  ListLayout,
  NavigationTabs,
  PageWidth,
  StatusTag,
  Table,
  type TableColumn,
} from "@ice24/ui";
import { ServiceState } from "../../components/system-state/service-state";
import { toFailure, type Failure } from "../../components/system-state/failure";
import { useAccountAccess } from "../account-shell/access-provider";
import { createEquipmentClient } from "../equipment/configuration-client";
import {
  AccountEditor,
  Editor,
  ReviewPanel,
  TemplateEditor,
  type Access,
  type Mutation,
  type Row,
} from "../equipment/workspace";
import { ReturnLink, rowLinkId } from "../navigation/return-focus";
import { withOrigin } from "../navigation/deep-links";
import {
  AccountCreation,
  CatalogCreation,
  TemplateActions,
  confirmation,
  reasonField,
} from "./editors";
import {
  SECTIONS,
  adminReturn,
  detailTitle,
  rowLabel,
  stateLabel,
  type AdminSection,
} from "./model";

type Data = {
  access: Access;
  rows: Row[];
  record: Row | undefined;
  models: Row[];
  catalog: Row[];
  versions: Row[];
  dashboard: Record<string, number | string>;
};
function RecordStatus({ row }: { row: Row }) {
  const state = String(row.status ?? row.access_mode);
  return (
    <StatusTag
      dimension="Estado"
      tone={
        ["active", "ACTIVE", "published"].includes(state)
          ? "success"
          : ["rejected", "SUSPENDED"].includes(state)
            ? "danger"
            : "info"
      }
    >
      {stateLabel(row)}
    </StatusTag>
  );
}
const columns: TableColumn<Row>[] = [
  { id: "name", header: "Registro", cell: rowLabel, mobile: "title" },
  {
    id: "code",
    header: "Referencia",
    cell: (row) =>
      String(
        row.code ??
          row.folio ??
          row.data?.serialNumber ??
          (row.account_type === "COMPANY"
            ? "Persona moral"
            : row.account_type === "INDIVIDUAL"
              ? "Persona física"
              : "Sin referencia"),
      ),
  },
  { id: "status", header: "Estado", cell: (row) => <RecordStatus row={row} /> },
];
export function AdministrationScreen({
  section,
  id,
  returnTo,
  contextId,
  csrfToken,
  permissions,
}: {
  section: AdminSection;
  id?: string | undefined;
  returnTo?: string | undefined;
  contextId: string;
  csrfToken: string;
  permissions: readonly string[];
}) {
  const account = useAccountAccess();
  const client = useMemo(() => createEquipmentClient(contextId, csrfToken), [contextId, csrfToken]);
  const get = useCallback((path: string) => client.get<unknown>(path), [client]);
  const [data, setData] = useState<Data>();
  const [failure, setFailure] = useState<Failure>();
  const [loading, setLoading] = useState(true);
  const title = id ? detailTitle(section) : "Administración ICE24";
  const back = adminReturn(returnTo, section);
  useEffect(() => {
    document.title = `${title} · ICE24 OS`;
  }, [title]);
  const fetchData = useCallback(async (): Promise<Data> => {
    const access = await client.get<Access>("equipment-workspace");
    if (!access.canAdmin) throw new Error("No tienes permiso para consultar la administración.");
    const path =
      section === "cuentas"
        ? "admin/accounts"
        : section === "validaciones"
          ? "admin/equipment-requests"
          : "technical-models";
    const [rows, catalog, models, versions, dashboard] = await Promise.all([
      section === "panel" || section === "plantillas"
        ? Promise.resolve([] as Row[])
        : client.get<Row[]>(path),
      section === "modelos" || section === "plantillas"
        ? client.get<Row[]>("catalogs")
        : Promise.resolve([] as Row[]),
      section === "validaciones" && id
        ? client.get<Row[]>("technical-models")
        : Promise.resolve([] as Row[]),
      section === "modelos" && id
        ? client.get<Row[]>(`technical-models/${id}/template-versions`)
        : Promise.resolve([] as Row[]),
      section === "panel"
        ? client.get<Record<string, number | string>>("admin/dashboard")
        : Promise.resolve({}),
    ]);
    const record = !id
      ? undefined
      : section === "cuentas"
        ? await client.get<Row>(`admin/accounts/${id}`)
        : section === "plantillas"
          ? await client.get<Row>(`template-versions/${id}`)
          : rows.find((row) => row.id === id);
    return { access, rows, record, models, catalog, versions, dashboard };
  }, [client, section, id]);
  useEffect(() => {
    let active = true;
    void fetchData().then(
      (result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      },
      (error) => {
        if (active) {
          setFailure(toFailure(error, "No fue posible cargar la administración."));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [fetchData]);
  const refresh = async () => {
    setLoading(true);
    setFailure(undefined);
    try {
      setData(await fetchData());
    } catch (error) {
      setFailure(toFailure(error, "No fue posible cargar la administración."));
    } finally {
      setLoading(false);
    }
  };
  const canEdit = permissions.includes("equipment.admin") && !!data?.access.hasMfa;
  const disabled =
    loading || !account.canWrite || !account.online || data?.access.accessMode !== "ACTIVE";
  const mutate: Mutation = async (path, body, version, method = "POST", key) => {
    if (!canEdit || disabled) throw new Error("No puedes guardar cambios en este momento.");
    try {
      const result = await client.send(path, body, {
        version,
        method: method as "POST" | "PATCH" | "PUT",
        ...(key ? { key } : {}),
      });
      await refresh();
      return result;
    } catch (error) {
      const classified = toFailure(error, "No fue posible guardar el cambio.");
      if (classified.kind === "read_only") account.markReadOnly();
      if (classified.kind === "conflict") await refresh();
      setFailure(classified);
      throw error;
    }
  };
  const status = loading ? (
    <ServiceState kind="loading" title="Cargando administración…" />
  ) : failure ? (
    <ServiceState {...failure} onRetry={() => void refresh()} />
  ) : id && !data?.record ? (
    <ServiceState
      kind="not_found"
      title="Registro no disponible"
      message="Vuelve a la lista para consultar los registros disponibles."
    />
  ) : undefined;
  const origin = id ? `/ice24/${section}/${id}` : `/ice24?seccion=${section}`;
  const record = data?.record;
  const reference = record?.code?.trim() || record?.folio?.trim();
  const table = (rows: Row[], target: AdminSection, caption: string) =>
    rows.length ? (
      <Table
        caption={caption}
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        getRowHref={(row) => withOrigin(`/ice24/${target}/${row.id}`, origin)}
        getRowLinkId={(row) => rowLinkId(row.id)}
      />
    ) : (
      <ServiceState
        kind="empty"
        title="No hay registros"
        message="Los registros aparecerán aquí cuando se den de alta."
      />
    );
  return (
    <PageWidth
      as="main"
      variant={id ? "reading" : "full"}
      id="main-content"
      className="equipment-shell ice24-screen"
      aria-label={title}
      data-page-ready={String(!loading)}
      data-page-breadcrumbs={id ? "true" : undefined}
    >
      {id ? (
        <DetailLayout
          title={title}
          description={record && rowLabel(record)}
          statuses={record && <RecordStatus row={record} />}
          breadcrumbs={[{ label: "Administración ICE24", href: "/ice24" }, { label: title }]}
          backLink={
            <ReturnLink
              href={back}
              linkId={rowLinkId(id)}
              listName={section === "plantillas" ? "plantillas del modelo" : "administración"}
            />
          }
          actions={
            <Button variant="secondary" icon="refresh" onClick={() => void refresh()}>
              Actualizar datos
            </Button>
          }
          status={status}
          summary={
            record && (
              <Card title="Datos del registro">
                <dl className="ice24-data">
                  <div>
                    <dt>Nombre o folio</dt>
                    <dd>{rowLabel(record)}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{stateLabel(record)}</dd>
                  </div>
                  {reference && (
                    <div>
                      <dt>Referencia</dt>
                      <dd>{reference}</dd>
                    </div>
                  )}
                </dl>
                {section === "modelos" && (
                  <>
                    <h2>Plantillas del modelo</h2>
                    {table(data?.versions ?? [], "plantillas", "Versiones de plantilla")}
                    {canEdit && (
                      <TemplateEditor
                        modelId={record.id}
                        selected={undefined}
                        catalog={data?.catalog ?? []}
                        mutate={mutate}
                        disabled={disabled}
                      />
                    )}
                  </>
                )}
                {section === "plantillas" && (
                  <>
                    <h2>Actividades de la plantilla</h2>
                    <ul>
                      {(
                        (record.definition?.activities ?? []) as { code: string; name: string }[]
                      ).map((activity) => (
                        <li key={activity.code}>{activity.name}</li>
                      ))}
                    </ul>
                    {canEdit && (
                      <>
                        <TemplateEditor
                          key={record.row_version}
                          modelId={String(record.model_id)}
                          selected={record}
                          catalog={data?.catalog ?? []}
                          mutate={mutate}
                          disabled={disabled}
                        />
                        <TemplateActions
                          selected={record}
                          get={get}
                          mutate={mutate}
                          disabled={disabled}
                        />
                      </>
                    )}
                  </>
                )}
                {section === "validaciones" && (
                  <>
                    <p>
                      Modelo declarado: {String(record.data?.modelName ?? "Sin especificar")}.
                      Serie: {String(record.data?.serialNumber ?? "Sin especificar")}.
                    </p>
                    {canEdit &&
                      ["submitted", "in_review", "information_required"].includes(
                        record.status ?? "",
                      ) && (
                        <ReviewPanel
                          key={record.row_version}
                          row={record}
                          models={data?.models ?? []}
                          get={get}
                          mutate={mutate}
                          disabled={disabled}
                        />
                      )}
                  </>
                )}
                {section === "cuentas" && canEdit && (
                  <>
                    <AccountEditor
                      key={record.row_version}
                      row={record}
                      mutate={mutate}
                      disabled={disabled}
                      admin
                    />
                    <Editor
                      title="Cambiar acceso de cuenta"
                      disabled={disabled}
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
                      submit={(values, key) =>
                        mutate(
                          `admin/accounts/${record.id}/${String(values.mode)}`,
                          { reason: values.reason, confirmation: values.confirmation },
                          record.row_version,
                          "POST",
                          key,
                        )
                      }
                    />
                  </>
                )}
              </Card>
            )
          }
        />
      ) : (
        <ListLayout
          title={title}
          description="Consulta los modelos, valida solicitudes y administra las cuentas de ICE24."
          actions={
            <Button
              variant="secondary"
              icon="refresh"
              loading={loading}
              onClick={() => void refresh()}
            >
              Actualizar datos
            </Button>
          }
          banner={
            <NavigationTabs
              label="Secciones de administración"
              items={Object.entries(SECTIONS).map(([key, label]) => ({
                href: `/ice24?seccion=${key}`,
                label,
                icon:
                  key === "modelos"
                    ? "document"
                    : key === "validaciones"
                      ? "shield"
                      : key === "cuentas"
                        ? "user"
                        : "home",
                current: key === section,
              }))}
            />
          }
          status={status}
        >
          {data &&
            (section === "panel" ? (
              <section className="ice24-dashboard" aria-label="Indicadores de administración">
                {[
                  ["accounts", "Cuentas"],
                  ["pending_requests", "Solicitudes pendientes"],
                  ["machines", "Máquinas"],
                  ["draft_templates", "Plantillas en borrador"],
                  ["failed_jobs", "Calendarios con error"],
                ].map(([key, label]) => (
                  <Card key={key} title={label}>
                    <p>{data.dashboard[key!] ?? "Sin datos"}</p>
                  </Card>
                ))}
              </section>
            ) : (
              <Card title={SECTIONS[section as keyof typeof SECTIONS]} padding="flush">
                {table(
                  data.rows,
                  section,
                  section === "cuentas"
                    ? "Cuentas de ICE24"
                    : section === "validaciones"
                      ? "Solicitudes de validación"
                      : "Modelos técnicos",
                )}
              </Card>
            ))}
          {data && canEdit && section === "modelos" && (
            <Card title="Altas de catálogo">
              <CatalogCreation catalog={data.catalog} mutate={mutate} disabled={disabled} />
            </Card>
          )}
          {data && canEdit && permissions.includes("accounts.create") && section === "cuentas" && (
            <Card title="Alta de cuenta">
              <AccountCreation mutate={mutate} disabled={disabled} />
            </Card>
          )}
        </ListLayout>
      )}
    </PageWidth>
  );
}
