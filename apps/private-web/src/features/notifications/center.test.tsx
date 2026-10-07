import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Notification, NotificationPage } from "@ice24/contracts";
import { NotificationCenter } from "./center";

const id = "11111111-1111-4111-8111-111111111111";
const now = "2026-10-06T12:00:00.000Z";
const critical: Notification = {
  id,
  type: "subscription.payment_failed",
  priority: "critical",
  title: "Pago de suscripción rechazado",
  message: "Stripe rechazó el cobro; la cuenta pasó a modo lectura.",
  recipientUserId: id,
  relatedResource: { type: "subscription", id },
  status: "read",
  pinned: true,
  sentChannels: ["in_app", "email"],
  escalationLevel: 0,
  occurredAt: now,
  readAt: now,
  acknowledgedAt: null,
  inProgressAt: null,
  resolvedAt: null,
  attentionResource: null,
  resolutionResource: null,
  conditionOpen: true,
  emailDelivery: { status: "delivered", updatedAt: now },
  audit: { createdAt: now, createdBy: id, updatedAt: now, updatedBy: id, version: 2 },
};
const page = (items: Notification[]): NotificationPage => ({
  items,
  page: { hasMore: false, nextCursor: null },
});
const center = (
  pinned: Notification[],
  items: Notification[],
  failure: { kind: "forbidden" | "error"; message: string } | null = null,
) =>
  renderToStaticMarkup(
    <NotificationCenter
      contextId="c"
      csrfToken="t"
      initialSummary={{
        badge: pinned.length,
        unread: 0,
        pinned: pinned.length,
        acknowledged: 0,
        inProgress: 0,
        resolved: 0,
      }}
      initialPinned={failure ? null : page(pinned)}
      initialPage={failure ? null : page(items)}
      initialFailure={failure}
    />,
  );

describe("notification center states (F5-11, F5-12)", () => {
  it("keeps a read critical alert pinned until «Enterado»", () => {
    const html = center([critical], [critical]);
    expect(html).toContain("Críticas sin enterado");
    expect(html).toContain("Fijada hasta que marques «Enterado»");
    expect(html).toContain(">Marcar enterado</button>");
    expect(html).toContain("Leída");
  });
  it("explains that «Resuelta» waits for the linked condition", () => {
    const acknowledged = {
      ...critical,
      status: "acknowledged" as const,
      pinned: false,
      acknowledgedAt: now,
    };
    const html = center([], [acknowledged]);
    expect(html).toMatch(
      /<button type="button" disabled="" aria-describedby="[^"]+-blocked">Marcar resuelta<\/button>/u,
    );
    expect(html).toContain("Se podrá resolver cuando la causa esté cerrada");
  });
  it("shows an empty state that is not mistaken for an error", () => {
    const html = center([], []);
    expect(html).toContain("No tienes alertas pendientes.");
    expect(html).toContain('data-state="empty"');
    expect(html).not.toContain('role="alert"');
  });
  it("shows no alerts without permission and an error with retry otherwise", () => {
    const forbidden = center([], [], {
      kind: "forbidden",
      message: "No tienes permiso para consultar avisos en este contexto.",
    });
    expect(forbidden).toContain("Sin permiso");
    expect(forbidden).not.toContain("Filtrar alertas");
    const failed = center([], [], { kind: "error", message: "No fue posible cargar las alertas." });
    expect(failed).toContain(">Reintentar consulta</button>");
  });
});
