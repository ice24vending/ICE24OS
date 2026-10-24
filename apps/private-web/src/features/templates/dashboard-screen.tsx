"use client";
import { useRouter } from "next/navigation";
import { Banner, Button, ButtonLink, Card, DashboardLayout, ReadOnlyIndicator } from "@ice24/ui";

import { ActionFeedback, useTemplateAction, useTemplateStatus, type TemplateData } from "./shared";

/** Dashboard template (F6-09): KPIs with period and completeness, alerts and today's tasks. */
export function DashboardScreen({ data }: { data: TemplateData }) {
  const router = useRouter();
  const acknowledge = useTemplateAction(data, "reading");
  const status = useTemplateStatus(data, {
    title: "Sin datos disponibles todavía.",
    message: "Los indicadores aparecen cuando la cuenta tiene máquinas activas que reporten.",
  });
  const { machines } = data;
  const reported = machines.filter((m) => m.productionKg !== null);
  const production = reported.reduce((sum, m) => sum + (m.productionKg ?? 0), 0);
  const alerts = machines.filter(
    (m) => m.operation === "out_of_service" || m.technical === "critical",
  );
  const branches = new Set(machines.map((m) => m.branch)).size;
  return (
    <main id="main-content" className="private-shell template-screen">
      <DashboardLayout
        eyebrow={`Plantilla de dashboard · ${data.accountName}`}
        title="Inicio"
        description="Lo que pasa hoy en tus sucursales."
        actions={
          <ButtonLink href="/plantillas/lista" variant="secondary">
            Ver máquinas
          </ButtonLink>
        }
        banner={
          <>
            {data.readOnly && <ReadOnlyIndicator />}
            {acknowledge.result && (
              <Banner tone="success" role="status" title="Alerta marcada como enterada" titleAs="p">
                Folio {acknowledge.result.folio}.
              </Banner>
            )}
            <ActionFeedback
              failure={acknowledge.failure}
              onRetry={() => void acknowledge.send()}
              onRefresh={() => {
                acknowledge.reset();
                router.refresh();
              }}
            />
          </>
        }
        status={status}
        kpis={[
          {
            label: "Hielo producido",
            value: reported.length ? production.toLocaleString("es-MX") : null,
            unit: "kg",
            period: "Hoy",
            context: `${branches} ${branches === 1 ? "sucursal" : "sucursales"}`,
            completeness: reported.length < machines.length ? "partial" : "complete",
          },
          {
            label: "Máquinas disponibles",
            value: `${machines.filter((m) => m.operation === "available").length} de ${machines.length}`,
            period: "Ahora",
          },
          { label: "Alertas abiertas", value: alerts.length, period: "Ahora" },
          { label: "Ventas", value: null, period: "Hoy", context: "Sin importación" },
        ]}
      >
        <Card
          title="Alertas"
          titleAs="h2"
          tone={alerts.length ? "danger" : "success"}
          icon={alerts.length ? "danger" : "check-circle"}
        >
          {alerts.length === 0 ? (
            <p>No tienes alertas pendientes.</p>
          ) : (
            <>
              <ul>
                {alerts.map((m) => (
                  <li key={m.id}>
                    {m.code} · {m.name}:{" "}
                    {m.operation === "out_of_service"
                      ? "fuera de servicio"
                      : "estado técnico crítico"}
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                onClick={() => void acknowledge.send()}
                loading={acknowledge.sending}
                loadingLabel="Enviando…"
                disabledReason={acknowledge.blocked}
              >
                Marcar enterado
              </Button>
            </>
          )}
        </Card>
        <Card title="Tareas de hoy" titleAs="h2" icon="tool">
          <ul>
            {machines.slice(0, 3).map((m, index) => (
              <li key={m.id}>
                {["Limpieza de área", "Lectura de proceso", "Cambio de filtro"][index]} · {m.code} ·{" "}
                {["09:00", "13:00", "17:30"][index]}
              </li>
            ))}
          </ul>
          <ButtonLink href="/plantillas/campo" size="sm">
            Iniciar orden de campo
          </ButtonLink>
        </Card>
      </DashboardLayout>
    </main>
  );
}
