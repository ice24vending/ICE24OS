"use client";
import { useRouter } from "next/navigation";
import { ButtonLink, Card, DetailLayout, StatusTag, Table } from "@ice24/ui";
import type { AuditEvent } from "@ice24/contracts";
import type { ReactNode } from "react";
import { ServiceState } from "../../components/system-state/service-state";
import { auditLocation, auditReturn } from "./filters";
import {
  ACTOR_TYPES,
  ORIGINS,
  actorLabel,
  auditDate,
  entityHref,
  entityLabel,
  fieldLabel,
  operationLabel,
  valueLabel,
} from "./labels";
import { AuditResult, type InitialFailure } from "./viewer";
import { AuditPageContent } from "./page-frame";

type Values = AuditEvent["newValues"];
function Value({ value }: { value: NonNullable<Values>[string] | undefined }) {
  if (value === undefined) return <>Sin registro</>;
  if (value === null) return <>Vacío</>;
  if (typeof value === "boolean") return <>{value ? "Sí" : "No"}</>;
  if (Array.isArray(value))
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>{valueLabel(item)}</li>
        ))}
      </ul>
    );
  return <>{typeof value === "string" ? valueLabel(value) : value}</>;
}
const identifier = (value: string | null, fallback = "No aplica") =>
  value ? <code>{value}</code> : fallback;

export function AuditDetail({
  event,
  failure,
  returnTo,
  global = false,
}: {
  event: AuditEvent | null;
  failure: InitialFailure | null;
  returnTo: string;
  global?: boolean;
}) {
  const router = useRouter();
  const back = auditReturn(returnTo);
  const href = event && entityHref(event);
  const groups: Record<string, Record<string, ReactNode>> = event
    ? {
        Evento: {
          "Tipo de evento": operationLabel(event.operation),
          Resultado: <AuditResult result={event.result} />,
          Entidad: href ? (
            <a className="audit-entity-link" href={href}>
              {entityLabel(event.entityType)}
            </a>
          ) : (
            entityLabel(event.entityType)
          ),
          "Identificador de entidad": identifier(event.entityId),
          Motivo: event.reason ?? "No registrado",
        },
        "Actor y origen": {
          Actor: actorLabel(event),
          "Identificador del actor": identifier(event.actorUserId),
          "Tipo de actor": ACTOR_TYPES[event.actorType],
          Origen: ORIGINS[event.origin],
          "Dirección IP": event.ipAddress ?? "No capturada",
          Sesión: identifier(event.contextSessionId),
        },
        Ubicación: {
          Cuenta: identifier(event.accountId, "Global"),
          Sucursal: identifier(event.branchId),
          Máquina: identifier(event.machineId),
        },
        "Fechas y seguimiento": {
          "Identificador del evento": identifier(event.id),
          Correlación: identifier(event.correlationId),
          "Fecha local": auditDate(event.occurredAt, event.timeZone),
          "Zona horaria": event.timeZone,
          "Fecha UTC": auditDate(event.occurredAt),
          "Registrado en UTC": auditDate(event.createdAt),
          Versión: event.eventVersion,
        },
      }
    : {};
  const changes = event
    ? [
        ...new Set([
          ...Object.keys(event.previousValues ?? {}),
          ...Object.keys(event.newValues ?? {}),
        ]),
      ].map((field) => ({
        field,
        before: event.previousValues?.[field],
        after: event.newValues?.[field],
      }))
    : [];
  const correlation = event
    ? new URL(
        auditLocation({
          correlationId: event.correlationId,
          ...(global ? { scope: "global" } : {}),
        }),
        "https://ice24.invalid",
      )
    : null;
  correlation?.searchParams.set("origen", back);
  const unavailable = !event && (!failure || failure.kind === "not_found");
  return (
    <AuditPageContent title="Detalle de auditoría" className="audit-detail" breadcrumbs>
      <DetailLayout
        title="Detalle de auditoría"
        backHref={back}
        backLabel="Volver a auditoría"
        breadcrumbs={[{ label: "Auditoría", href: back }, { label: "Detalle" }]}
        status={
          unavailable ? (
            <ServiceState
              kind="not_found"
              title="Evento no disponible"
              message="No es posible consultar este evento en el contexto actual."
            />
          ) : failure ? (
            <ServiceState
              {...failure}
              onRetry={
                ["error", "offline"].includes(failure.kind) ? () => router.refresh() : undefined
              }
            />
          ) : undefined
        }
        summary={
          event && (
            <div className="audit-stack">
              <div className="audit-groups">
                {Object.entries(groups).map(([group, fields]) => (
                  <Card key={group} title={group}>
                    <dl>
                      {Object.entries(fields).map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                ))}
              </div>
              {correlation && (
                <ButtonLink
                  href={correlation.pathname + correlation.search}
                  icon="search"
                  variant="secondary"
                >
                  Ver todos los eventos de esta correlación
                </ButtonLink>
              )}
              <Card title="Cambios registrados">
                <Table
                  caption="Valores antes y después"
                  rows={changes}
                  getRowId={(row) => row.field}
                  columns={[
                    {
                      id: "field",
                      header: "Campo",
                      mobile: "title",
                      cell: (row) => (
                        <>
                          {fieldLabel(row.field)}
                          {JSON.stringify(row.before) !== JSON.stringify(row.after) && (
                            <StatusTag tone="info" icon="sync">
                              Cambió
                            </StatusTag>
                          )}
                        </>
                      ),
                    },
                    { id: "before", header: "Antes", cell: (row) => <Value value={row.before} /> },
                    { id: "after", header: "Después", cell: (row) => <Value value={row.after} /> },
                  ]}
                  empty={<p>Este evento no registra valores.</p>}
                />
              </Card>
              {event.deviceSummary && (
                <Card title="Dispositivo">
                  <dl>
                    {Object.entries(event.deviceSummary).map(([key, value]) => (
                      <div key={key}>
                        <dt>{fieldLabel(key)}</dt>
                        <dd>
                          <Value value={value} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}
            </div>
          )
        }
      />
    </AuditPageContent>
  );
}
