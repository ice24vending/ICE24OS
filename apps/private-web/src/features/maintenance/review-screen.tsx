"use client";

import {
  ButtonLink,
  Button,
  TextField,
  TextArea,
  Select,
  Checkbox,
  Card,
  ListLayout,
  StatusTag,
  SystemState,
  type SystemStateKind,
} from "@ice24/ui";

export interface MaintenanceReviewProps {
  embedded?: boolean;
  title: string;
  screen: string;
  state?: SystemStateKind | undefined;
  simulation?: string | undefined;
  rows: readonly {
    id: string;
    code: string;
    activity: string;
    status: string;
    order: string;
    ticket: string;
    assignee: string;
  }[];
}

export function MaintenanceReview({
  title,
  screen,
  state,
  simulation,
  rows,
  embedded = false,
}: MaintenanceReviewProps) {
  const Root = embedded ? "section" : "main";
  return (
    <Root id={embedded ? undefined : "main-content"} className="private-shell">
      <ListLayout
        title={title}
        eyebrow={screen}
        description="Maqueta — sin lógica. Datos ficticios para revisión; no guarda ni descarga órdenes."
      >
        <nav aria-label="Pantallas de mantenimiento" className="maintenance-review-nav">
          <ButtonLink variant="secondary" href="/maintenance?view=calendar">
            Calendario
          </ButtonLink>{" "}
          <ButtonLink variant="secondary" href="/maintenance?view=list">
            Actividades
          </ButtonLink>{" "}
          <ButtonLink variant="secondary" href="/maintenance/review/UI-TKT-01">
            Ticket
          </ButtonLink>{" "}
          <ButtonLink variant="secondary" href="/maintenance/review/UI-WO-01">
            Órdenes
          </ButtonLink>{" "}
          <ButtonLink variant="secondary" href="/maintenance/review/UI-SYNC-01">
            Sincronización
          </ButtonLink>
        </nav>
        {simulation && (
          <Card title={simulation}>
            <p>Simulación provisional: ninguna operación se envió al servidor.</p>
          </Card>
        )}
        {state && <SystemState kind={state} />}
        {(!state || state === "read_only" || state === "conflict" || state === "offline") &&
          (screen === "UI-WO-01" ? rows : rows.slice(0, 1)).map((row) => (
            <Card
              key={row.id}
              title={`${row.code} · ${row.activity}`}
              description={`${row.ticket} · ${row.order} · ${row.assignee}`}
            >
              <StatusTag
                tone={
                  row.status === "Vencida" || row.status === "No conforme"
                    ? "danger"
                    : row.status === "Completada"
                      ? "success"
                      : "info"
                }
              >
                {row.status}
              </StatusTag>
              <p>
                Procedimiento: desconectar alimentación, revisar filtro y registrar prueba final.
              </p>
              <p>Evidencia propuesta: foto antes/después, lectura y confirmación del técnico.</p>
              {screen === "UI-TKT-01" && (
                <>
                  <TextField label="Máquina" defaultValue={row.code} readOnly />
                  <Select
                    label="Sistema"
                    options={[
                      { value: "water", label: "Tratamiento de agua" },
                      { value: "cooling", label: "Refrigeración" },
                    ]}
                  />
                  <Select
                    label="Prioridad"
                    options={[
                      { value: "normal", label: "Normal" },
                      { value: "critical", label: "Crítica" },
                    ]}
                  />
                  <TextArea
                    label="Descripción"
                    defaultValue="El filtro requiere revisión."
                    readOnly={state === "read_only"}
                  />
                  <Button disabled>Crear ticket (disponible en P2)</Button>{" "}
                  <ButtonLink href="/maintenance/review/UI-TKT-02">
                    Ver ejemplo de ticket
                  </ButtonLink>
                </>
              )}
              {screen === "UI-TKT-02" && (
                <>
                  <p>Diagnóstico preliminar: caudal bajo. Técnico propuesto: Ana Torres.</p>
                  <ButtonLink href="/maintenance/review/UI-WO-01">
                    Ver órdenes de ejemplo
                  </ButtonLink>
                </>
              )}
              {screen === "UI-WO-01" && (
                <ButtonLink variant="secondary" href="/maintenance/review/UI-WO-02">
                  Ver ejecución de ejemplo
                </ButtonLink>
              )}
              {screen === "UI-WO-02" && (
                <>
                  <Checkbox label="Desconectar alimentación" defaultChecked disabled />
                  <Checkbox label="Revisar filtro" disabled />
                  <TextArea
                    label="Diagnóstico"
                    defaultValue="Reemplazo del filtro recomendado."
                    readOnly
                  />
                  <TextField label="Piezas previstas" value="1 filtro de agua" readOnly />
                  <p>Fotos: 1 de 2 requeridas. Firma pendiente.</p>
                  <ButtonLink href="/maintenance/review/UI-WO-03">
                    Revisar cierre de ejemplo
                  </ButtonLink>
                </>
              )}
              {screen === "UI-WO-03" && (
                <>
                  <p>Falta foto después y confirmación del técnico para cerrar.</p>
                  <Button disabled>Confirmar cierre (disponible en P4)</Button>
                </>
              )}
              {screen === "UI-WO-04" && (
                <>
                  <p>
                    Original: lectura 10. Corrección propuesta: 12. Motivo pendiente. Disponible en
                    P5.
                  </p>
                  <TextArea label="Motivo de corrección o anulación" readOnly />
                  <Button disabled>Guardar corrección (disponible en P5)</Button>
                </>
              )}
              {screen === "UI-SYNC-01" && (
                <>
                  <p>
                    Servidor: lectura 10. Dispositivo: lectura 12. Ambas versiones se conservarán;
                    resolución disponible en P10.
                  </p>
                  <Select
                    label="Resolución propuesta"
                    options={[
                      { value: "server", label: "Conservar servidor" },
                      { value: "local", label: "Conservar dispositivo" },
                      { value: "merge", label: "Combinar campos" },
                    ]}
                  />
                  <TextArea label="Motivo de resolución" readOnly />
                  <Button disabled>Resolver (disponible en P10)</Button>
                </>
              )}
            </Card>
          ))}
      </ListLayout>
    </Root>
  );
}
