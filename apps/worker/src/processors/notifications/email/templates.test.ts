import { describe, expect, it } from "vitest";
import { EMAIL_TEMPLATES } from "@ice24/contracts";
import {
  EmailTemplateError,
  RENDERED_TEMPLATE_VERSIONS,
  formatDate,
  renderEmail,
} from "./templates.js";

const context = { baseUrl: "https://app.ice24.test", timeZone: "America/Mexico_City" };
const alert = {
  accountName: "Synthetic <A> & Co",
  title: "Pago de suscripción rechazado",
  message: 'El cobro fue rechazado. <script>alert("x")</script>',
  occurredAt: "2026-10-03T18:00:00.000000Z",
  actionPath: "/subscription",
  actionLabel: "Ver suscripción",
};

describe("email templates (F5-12)", () => {
  it("has a renderer for exactly every catalogued template version", () => {
    const catalogued = Object.entries(EMAIL_TEMPLATES).flatMap(([key, versions]) =>
      Object.keys(versions).map((version) => `${key}@${version}`),
    );
    expect([...RENDERED_TEMPLATE_VERSIONS].sort()).toEqual(catalogued.sort());
  });

  it("renders the critical alert server side with escaped values and application links", () => {
    const email = renderEmail("alert.critical", 1, alert, context);
    expect(email.subject).toBe("[ICE24 OS] Alerta crítica: Pago de suscripción rechazado");
    expect(email.text).toContain("Cuenta: Synthetic <A> & Co");
    expect(email.text).toContain("Ver suscripción: https://app.ice24.test/subscription");
    expect(email.text).toContain("Abrir el centro de avisos: https://app.ice24.test/notifications");
    expect(email.html).toContain("Synthetic &lt;A&gt; &amp; Co");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    // Recipient zone, not the server zone: 18:00 UTC is 12:00 in Mexico City.
    expect(email.text).toContain(formatDate(alert.occurredAt, "America/Mexico_City"));
    expect(formatDate(alert.occurredAt, "America/Mexico_City")).toMatch(/12:00/u);
  });

  it("omits the action link when the alert has none and falls back to UTC for unknown zones", () => {
    const email = renderEmail(
      "alert.critical",
      1,
      { ...alert, actionPath: null, actionLabel: null },
      { ...context, timeZone: "Mars/Olympus" },
    );
    expect(email.text).not.toContain("Ver suscripción");
    expect(email.text).toContain("18:00");
  });

  it("renders the scheduled report as a link to the authenticated application, never a file", () => {
    const email = renderEmail(
      "report.scheduled",
      1,
      {
        accountName: "Synthetic A",
        reportName: "Bitácora mensual",
        periodLabel: "Septiembre 2026",
        reportPath: "/reports/123",
      },
      context,
    );
    expect(email.subject).toBe("[ICE24 OS] Reporte programado: Bitácora mensual");
    expect(email.text).toContain("Consultar el reporte: https://app.ice24.test/reports/123");
  });

  it("rejects unknown templates, versions and invalid variables", () => {
    expect(() => renderEmail("alert.unknown", 1, alert, context)).toThrow(EmailTemplateError);
    expect(() => renderEmail("alert.critical", 9, alert, context)).toThrow(EmailTemplateError);
    expect(() => renderEmail("alert.critical", 1, { ...alert, extra: "x" }, context)).toThrow(
      EmailTemplateError,
    );
    expect(() =>
      renderEmail("alert.critical", 1, { ...alert, actionPath: "//evil" }, context),
    ).toThrow(EmailTemplateError);
  });
});
