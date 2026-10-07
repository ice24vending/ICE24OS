import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SubscriptionStatus, SubscriptionView } from "@ice24/contracts";
import { AccessProvider } from "../account-shell/access-provider";
import { readOnlyNotice } from "../account-shell/access";
import { BillingActions } from "./billing-actions";
import { STATUS, billingOptions, statusExplanation } from "./model";
import { SubscriptionStatus as StatusView } from "./status";

const id = "11111111-1111-4111-8111-111111111111";
const now = "2026-10-06T12:00:00.000Z";
const view = (
  status: SubscriptionStatus,
  patch: Partial<SubscriptionView> = {},
): SubscriptionView => ({
  id,
  accountId: id,
  provider: "stripe",
  providerCustomerId: status === "demo" || status === "pending_activation" ? null : "cus_1",
  providerSubscriptionId: status === "demo" || status === "pending_activation" ? null : "sub_1",
  planCode: "ice24-monthly",
  price: { amountMinor: 39900, currency: "MXN" },
  status,
  currentPeriodStart: status === "demo" ? null : "2026-10-01T06:00:00.000Z",
  currentPeriodEnd: status === "demo" ? null : "2026-11-01T06:00:00.000Z",
  cancelAtPeriodEnd: status === "cancellation_scheduled",
  isDemo: status === "demo",
  demoExpiresAt: status === "demo" ? "2026-10-20T06:00:00.000Z" : null,
  version: 3,
  createdAt: now,
  updatedAt: now,
  audit: { createdAt: now, createdBy: id, updatedAt: now, updatedBy: id, version: 3 },
  accessMode: ["payment_failed", "read_only", "pending_activation", "cancelled"].includes(status)
    ? "READ_ONLY"
    : "ACTIVE",
  ...patch,
});
const ALL = Object.keys(STATUS) as SubscriptionStatus[];

describe("subscription states (RF-SUB-007)", () => {
  it.each(ALL)("renders %s with its label, access chip and explanation", (status) => {
    const html = renderToStaticMarkup(<StatusView subscription={view(status)} now={now} />);
    expect(html).toContain(STATUS[status].label);
    expect(html).toContain(statusExplanation(view(status)));
    expect(html).toContain("399.00");
  });
  it("shows the read-only explanation and keeps downloads available", () => {
    const html = renderToStaticMarkup(
      <StatusView subscription={view("payment_failed")} now={now} />,
    );
    expect(html).toContain("La cuenta está en modo lectura");
    expect(html).toContain("Solo lectura");
    expect(html).toContain("descargar documentos ya generados");
  });
  it("shows fictitious data and remaining days for a demo, and its expiry", () => {
    expect(renderToStaticMarkup(<StatusView subscription={view("demo")} now={now} />)).toContain(
      "14 días restantes",
    );
    const expired = renderToStaticMarkup(
      <StatusView subscription={view("demo")} now="2026-10-21T00:00:00.000Z" />,
    );
    expect(expired).toContain("Datos ficticios");
    expect(expired).toContain("La demo venció");
  });
  it("shows the paid-until date of a scheduled cancellation", () => {
    const html = renderToStaticMarkup(
      <StatusView subscription={view("cancellation_scheduled")} now={now} />,
    );
    expect(html).toContain("Acceso pagado hasta");
    expect(html).toContain("Conservas el acceso hasta el");
  });
  it("marks a suspended account", () => {
    const html = renderToStaticMarkup(
      <StatusView subscription={view("active", { accessMode: "SUSPENDED" })} now={now} />,
    );
    expect(html).toContain("Suspendida");
    expect(html).toContain("El acceso está suspendido");
  });
});

describe("billing actions by state and permission", () => {
  const actions = (status: SubscriptionStatus, owner: boolean | null = true) =>
    billingOptions(view(status), owner).options.map((option) => option.action);
  it.each([
    ["demo", ["checkout", "portal"]],
    ["pending_activation", ["checkout"]],
    ["active", ["portal"]],
    ["reactivated", ["portal"]],
    ["payment_failed", ["portal"]],
    ["read_only", ["portal"]],
    ["cancellation_scheduled", ["portal"]],
    ["cancelled", ["checkout", "portal"]],
  ] as const)("%s offers %j to the owner", (status, expected) => {
    expect(actions(status)).toEqual(expected);
  });
  it("offers nothing to non-owners or suspended accounts and says why", () => {
    expect(billingOptions(view("payment_failed"), false)).toMatchObject({
      options: [],
      note: expect.stringContaining("Solo el propietario"),
    });
    expect(billingOptions(view("active", { accessMode: "SUSPENDED" }), true)).toMatchObject({
      options: [],
      note: expect.stringContaining("suspendido"),
    });
  });
  it("never handles card data: every option goes to Stripe", () => {
    expect(billingOptions(view("payment_failed"), true).note).toContain(
      "nunca recibe ni guarda datos de tarjeta",
    );
  });
  const render = (
    status: SubscriptionStatus,
    mode: "ACTIVE" | "READ_ONLY" | null,
    owner: boolean,
  ) =>
    renderToStaticMarkup(
      <AccessProvider
        initialMode={mode}
        initialNotice={readOnlyNotice(null, owner)}
        billingOwner={owner}
      >
        <BillingActions subscription={view(status)} csrfToken="t" contextId="c" />
      </AccessProvider>,
    );
  it("renders the owner's buttons with their purpose", () => {
    const html = render("payment_failed", "READ_ONLY", true);
    expect(html).toContain(">Gestionar suscripción</button>");
    expect(html).toContain("Actualiza el método de pago");
    expect(html).not.toContain("Contratar con Stripe");
  });
  it("hides the buttons from a non-owner", () => {
    const html = render("payment_failed", "READ_ONLY", false);
    expect(html).not.toContain("<button");
    expect(html).toContain("Solo el propietario");
  });
  it("lets the API decide when the shell could not read the context", () => {
    expect(render("demo", null, false)).toContain(">Contratar con Stripe</button>");
  });
});
