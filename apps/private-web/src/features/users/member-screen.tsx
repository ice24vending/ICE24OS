"use client";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  accountMemberDetailSchema,
  type AccountMemberDetail,
  type MemberActivityPeriod,
} from "@ice24/contracts";
import {
  Banner,
  Button,
  Card,
  DetailLayout,
  PageWidth,
  RadioGroup,
  StatusTag,
  Table,
} from "@ice24/ui";
import { ServiceState } from "../../components/system-state/service-state";
import { useUnsavedChanges } from "../context/unsaved-changes";
import { useAccountAccess } from "../account-shell/access-provider";
import { createEquipmentClient } from "../equipment/configuration-client";
import { useResource } from "../equipment/machine-configuration";
import { ReturnLink, rowLinkId } from "../navigation/return-focus";
import { TICKET_STATES } from "../tickets/model";
import { ORDER_LABELS } from "../work-orders/work-orders-collection";
import { ASSIGNABLE_ROLES, MEMBER_STATUS, roleName } from "./labels";
import {
  formatAccess,
  loadScopeOptions,
  scopeOf,
  scopeSummary,
  USERS_TAB_HREF,
  type WorkspaceAccess,
} from "./model";
import {
  ReasonDialog,
  RoleScopeFields,
  readRoleScope,
  type RoleScopeValue,
} from "./role-scope-fields";

const PERIODS: { value: MemberActivityPeriod; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];
type Action = "suspend" | "reactivate" | "end";
const ACTIONS: Record<Action, { label: string; done: string; description: string }> = {
  suspend: {
    label: "Suspender",
    done: "Asociación suspendida.",
    description:
      "La persona deja de entrar a esta cuenta de inmediato; sus otras cuentas no cambian. Puedes reactivarla después.",
  },
  reactivate: {
    label: "Reactivar",
    done: "Asociación reactivada.",
    description: "La persona vuelve a entrar a esta cuenta con el rol y alcance que tenía.",
  },
  end: {
    label: "Finalizar asociación",
    done: "Asociación finalizada.",
    description:
      "La persona deja esta cuenta de forma definitiva. Para volver a darle acceso tendrás que invitarla de nuevo.",
  },
};

/**
 * /account/users/[id] (UXD-09): a person's data, role and scope, activity by period and the
 * membership actions. Each section shows its current value; «Editar» and every action confirm
 * with a mandatory reason. The API refuses to leave the account without an active Owner.
 */
export function MemberScreen({
  id,
  contextId,
  csrfToken,
}: {
  id: string;
  contextId: string;
  csrfToken: string;
}) {
  const params = useSearchParams();
  const client = useMemo(() => createEquipmentClient(contextId, csrfToken), [contextId, csrfToken]);
  const { syncMode, online } = useAccountAccess();
  const [period, setPeriod] = useState<MemberActivityPeriod>("week");
  const [saved, setSaved] = useState(params.get("invitado") ? "Invitación enviada." : "");
  const load = useCallback(async () => {
    const [access, detail, options] = await Promise.all([
      client.get<WorkspaceAccess>("equipment-workspace"),
      client
        .get<unknown>(`account-users/${id}?period=${period}`)
        .then((value) => accountMemberDetailSchema.parse(value)),
      loadScopeOptions(client).catch(() => undefined),
    ]);
    syncMode(access.accessMode);
    return { access, detail, options };
  }, [client, id, period, syncMode]);
  const { data, failure, reload } = useResource(load);
  const member = data?.detail.member;
  const title = member?.display_name ?? "Usuario";
  const writable = Boolean(
    data && data.access.canManage && data.access.accessMode === "ACTIVE" && online,
  );
  const mfa = Boolean(data?.access.hasMfa);
  // The API refuses the primary owner and the viewer's own membership: say so up front.
  const locked = !member
    ? ""
    : data!.detail.self
      ? "Es tu propia asociación: pide a otro Dueño que la cambie."
      : member.is_primary_owner
        ? "Es el titular principal de la cuenta: su rol y su acceso no se cambian desde aquí."
        : "";
  return (
    <PageWidth
      as="main"
      id="main-content"
      aria-label={title}
      className="users-screen"
      data-page-ready={String(Boolean(data || failure))}
      data-page-breadcrumbs="true"
    >
      <DetailLayout
        title={title}
        identifier={member?.email}
        breadcrumbs={[{ label: "Usuarios", href: USERS_TAB_HREF }, { label: title }]}
        backLink={<ReturnLink href={USERS_TAB_HREF} linkId={rowLinkId(id)} listName="Usuarios" />}
        statuses={
          member && (
            <StatusTag tone={MEMBER_STATUS[member.status]?.[0] ?? "nodata"} dimension="Estado">
              {MEMBER_STATUS[member.status]?.[1] ?? "Sin estado"}
            </StatusTag>
          )
        }
        status={
          !data && !failure ? (
            <ServiceState kind="loading" />
          ) : !data && failure ? (
            <ServiceState {...failure} onRetry={reload} />
          ) : undefined
        }
        summary={
          data &&
          member && (
            <div className="users-stack">
              <p role="status" className="users-saved">
                {saved}
              </p>
              {writable && !mfa && (
                <Banner tone="warning" title="Verifica tu segundo factor">
                  Para cambiar el rol o el acceso de una persona necesitas{" "}
                  <a href="/access/mfa">verificar tu segundo factor</a>.
                </Banner>
              )}
              <Card title="Datos" titleAs="h2">
                <dl className="users-data">
                  {Object.entries({
                    Nombre: member.display_name,
                    Correo: member.email,
                    Teléfono: member.phone,
                    Puesto: member.job_title,
                    "Último acceso": formatAccess(
                      member.last_access_at,
                      data.detail.activity.timeZone,
                    ),
                  }).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || "Sin capturar"}</dd>
                    </div>
                  ))}
                </dl>
                <p className="users-hint">
                  La persona actualiza su nombre, teléfono y puesto desde su perfil; también los
                  usan sus otras cuentas.
                </p>
              </Card>
              <RoleSection
                detail={data.detail}
                options={data.options}
                canEdit={writable && mfa && !locked && member.status === "ACTIVE"}
                note={
                  locked ||
                  (member.status !== "ACTIVE"
                    ? "Reactiva la asociación para cambiar su rol o alcance."
                    : "")
                }
                save={async (value, reason) => {
                  await client.send(
                    `account-users/${id}/permissions`,
                    {
                      roleCodes: [value.role],
                      branchIds: value.branchIds,
                      machineIds: value.machineIds,
                      reason,
                      overrides: value.denyEquipmentChanges
                        ? [{ permission: "equipment.manage", effect: "DENY" }]
                        : [],
                    },
                    { method: "PATCH", version: member.row_version },
                  );
                  setSaved("Rol y alcance guardados.");
                  reload();
                }}
              />
              <ActivitySection
                detail={data.detail}
                period={period}
                onPeriod={(next) => {
                  setPeriod(next);
                  setSaved("");
                }}
              />
              <StatusSection
                detail={data.detail}
                canAct={writable && mfa && !locked}
                note={locked}
                act={async (action, reason) => {
                  await client.send(`user-associations/${id}/${action}`, {
                    reason,
                    expectedVersion: member.row_version,
                  });
                  setSaved(ACTIONS[action].done);
                  reload();
                }}
              />
            </div>
          )
        }
      />
    </PageWidth>
  );
}

function RoleSection({
  detail,
  options,
  canEdit,
  note,
  save,
}: {
  detail: AccountMemberDetail;
  options: Awaited<ReturnType<typeof loadScopeOptions>> | undefined;
  canEdit: boolean;
  note: string;
  save: (value: RoleScopeValue, reason: string) => Promise<void>;
}) {
  const { member, lastActiveOwner } = detail;
  const [editing, setEditing] = useState(false);
  const [pendingValue, setPendingValue] = useState<RoleScopeValue>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const role = member.roles[0] ?? "";
  const initial: RoleScopeValue = {
    role,
    scope: scopeOf(member),
    branchIds: member.branch_ids,
    machineIds: member.machine_ids,
    denyEquipmentChanges: member.denies_equipment_changes,
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const read = readRoleScope(new FormData(event.currentTarget));
    setErrors(read.errors);
    if (read.value) setPendingValue(read.value);
  }
  return (
    <Card
      title="Rol y alcance"
      titleAs="h2"
      actions={
        canEdit &&
        !editing &&
        options && (
          <Button icon="edit" variant="secondary" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )
      }
    >
      {editing && options ? (
        <form
          aria-label="Editar rol y alcance"
          onSubmit={submit}
          onChange={() => setDirty(true)}
          noValidate
          className="users-stack"
        >
          <RoleScopeFields
            initial={initial}
            options={options}
            ownerOnly={lastActiveOwner}
            advanced
            errors={errors}
          />
          <div className="users-actions">
            <Button variant="primary" icon="save" type="submit">
              Guardar
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setDirty(false);
                setErrors({});
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="users-data">
            <div>
              <dt>Rol</dt>
              <dd>
                {member.roles.map(roleName).join(" · ") || "Sin rol"}
                <small>{ASSIGNABLE_ROLES.find((item) => item.value === role)?.description}</small>
              </dd>
            </div>
            <div>
              <dt>Alcance</dt>
              <dd>{scopeSummary(member, options)}</dd>
            </div>
            <div>
              <dt>Cambios de equipos</dt>
              <dd>
                {member.denies_equipment_changes ? "Denegados explícitamente" : "Según su rol"}
              </dd>
            </div>
          </dl>
          {note && <p className="users-hint">{note}</p>}
          {lastActiveOwner && !note && (
            <p className="users-hint">
              Es el único Dueño activo: conserva su rol hasta que otra persona sea Dueño.
            </p>
          )}
        </>
      )}
      <ReasonDialog
        open={Boolean(pendingValue)}
        title="Guardar rol y alcance"
        description={`${member.display_name} tendrá el rol ${roleName(pendingValue?.role ?? role)}. El cambio aplica en su siguiente acción.`}
        confirmLabel="Guardar cambios"
        onClose={() => setPendingValue(undefined)}
        onConfirm={async (reason) => {
          await save(pendingValue!, reason);
          setPendingValue(undefined);
          setEditing(false);
          setDirty(false);
        }}
      />
    </Card>
  );
}

function ActivitySection({
  detail,
  period,
  onPeriod,
}: {
  detail: AccountMemberDetail;
  period: MemberActivityPeriod;
  onPeriod: (period: MemberActivityPeriod) => void;
}) {
  const { activity } = detail;
  const loading = activity.period !== period;
  const since = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: activity.timeZone,
  }).format(new Date(activity.from));
  const metrics: [string, number][] = [
    ["Mantenimientos completados", activity.maintenanceCompleted],
    ["Tickets creados", activity.ticketsCreated],
    ["Tickets atendidos", activity.ticketsAttended],
    ["Órdenes asignadas", activity.ordersAssigned],
  ];
  const date = (value: string) =>
    new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: activity.timeZone }).format(
      new Date(value),
    );
  return (
    <Card
      title="Actividad"
      titleAs="h2"
      description={`Desde el ${since}, en la zona horaria de la cuenta.`}
    >
      <div className="users-stack" aria-busy={loading}>
        <RadioGroup
          label="Periodo"
          name="periodo"
          orientation="horizontal"
          value={period}
          onChange={(value) => onPeriod(value as MemberActivityPeriod)}
          options={PERIODS}
        />
        <dl className="users-metrics">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h3>Últimos mantenimientos</h3>
        <Table
          caption="Últimos mantenimientos asignados"
          captionHidden
          rows={activity.recentWorkOrders}
          getRowId={(row) => row.id}
          empty={<p>Sin órdenes de trabajo asignadas.</p>}
          columns={[
            {
              id: "folio",
              header: "Folio",
              mono: true,
              mobile: "title",
              cell: (row) => <Link href={`/maintenance/work-orders/${row.id}`}>{row.folio}</Link>,
            },
            { id: "machine", header: "Máquina", cell: (row) => row.machine_code },
            {
              id: "state",
              header: "Estado",
              cell: (row) => ORDER_LABELS[row.state as keyof typeof ORDER_LABELS] ?? row.state,
            },
            { id: "at", header: "Creada", cell: (row) => date(row.at) },
          ]}
        />
        <h3>Últimos tickets</h3>
        <Table
          caption="Últimos tickets creados o atendidos"
          captionHidden
          rows={activity.recentTickets}
          getRowId={(row) => row.id}
          empty={<p>Sin tickets creados ni atendidos.</p>}
          columns={[
            {
              id: "folio",
              header: "Folio",
              mono: true,
              mobile: "title",
              cell: (row) => <Link href={`/maintenance/tickets/${row.id}`}>{row.folio}</Link>,
            },
            { id: "machine", header: "Máquina", cell: (row) => row.machine_code },
            {
              id: "state",
              header: "Estado",
              cell: (row) =>
                TICKET_STATES[row.state as keyof typeof TICKET_STATES]?.label ?? row.state,
            },
            { id: "at", header: "Reportado", cell: (row) => date(row.at) },
          ]}
        />
      </div>
    </Card>
  );
}

function StatusSection({
  detail,
  canAct,
  note,
  act,
}: {
  detail: AccountMemberDetail;
  canAct: boolean;
  note: string;
  act: (action: Action, reason: string) => Promise<void>;
}) {
  const { member, lastActiveOwner } = detail;
  const [action, setAction] = useState<Action>();
  const available: Action[] =
    member.status === "ACTIVE"
      ? ["suspend", "end"]
      : member.status === "SUSPENDED"
        ? ["reactivate", "end"]
        : [];
  // Suspending or ending the only active Owner would leave the account without one.
  const blocked = (candidate: Action) => lastActiveOwner && candidate !== "reactivate";
  return (
    <Card title="Estado de la asociación" titleAs="h2">
      <p>
        <StatusTag tone={MEMBER_STATUS[member.status]?.[0] ?? "nodata"}>
          {MEMBER_STATUS[member.status]?.[1] ?? "Sin estado"}
        </StatusTag>{" "}
        {member.status === "PENDING" && "La persona aún no acepta la invitación."}
      </p>
      {canAct && available.length > 0 && (
        <div className="users-actions">
          {available.map((candidate) => (
            <Button
              key={candidate}
              variant={candidate === "end" ? "danger" : "secondary"}
              disabled={blocked(candidate)}
              onClick={() => setAction(candidate)}
            >
              {ACTIONS[candidate].label}
            </Button>
          ))}
        </div>
      )}
      {note && <p className="users-hint">{note}</p>}
      {canAct && lastActiveOwner && member.status === "ACTIVE" && (
        <p className="users-hint">
          No se puede suspender ni finalizar: es el único Dueño activo de la cuenta.
        </p>
      )}
      <ReasonDialog
        open={Boolean(action)}
        title={`${action ? ACTIONS[action].label : ""} · ${member.display_name}`}
        description={action ? ACTIONS[action].description : ""}
        confirmLabel={action ? ACTIONS[action].label : ""}
        danger={action === "end"}
        onClose={() => setAction(undefined)}
        onConfirm={async (reason) => {
          await act(action!, reason);
          setAction(undefined);
        }}
      />
    </Card>
  );
}
