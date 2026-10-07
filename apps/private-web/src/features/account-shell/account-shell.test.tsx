import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isBillingOwner, readOnlyNotice, writeBlockedText } from "./access";
import { AccessProvider, OfflineBanner, ReadOnlyBanner } from "./access-provider";
import { FailureError, failureKind, readFailure, request, toFailure } from "./failure";
import { ServiceState, type ServiceStateKind } from "./service-state";

afterEach(() => vi.unstubAllGlobals());

describe("ServiceState: one panel per screen state", () => {
  const kinds: [ServiceStateKind, string, "alert" | "status"][] = [
    ["loading", "Cargando", "status"],
    ["empty", "Sin resultados", "status"],
    ["error", "No fue posible completar la consulta", "alert"],
    ["forbidden", "Sin permiso", "alert"],
    ["offline", "Sin conexión", "alert"],
    ["conflict", "La información cambió", "alert"],
    ["read_only", "Cuenta en modo lectura", "alert"],
    ["session", "Sesión expirada", "alert"],
    ["not_found", "No disponible", "alert"],
  ];
  it.each(kinds)("renders %s with its title and live-region role", (kind, title, role) => {
    const html = renderToStaticMarkup(<ServiceState kind={kind} />);
    expect(html).toContain(`<h2>${title}</h2>`);
    expect(html).toContain(`role="${role}"`);
    expect(html).toContain(`data-state="${kind}"`);
  });
  it("explains a version conflict without suggesting an overwrite", () => {
    const html = renderToStaticMarkup(<ServiceState kind="conflict" />);
    expect(html).toContain("No se sobrescribió nada");
  });
  it("hides forbidden content details and offers sign-in for an expired session", () => {
    expect(renderToStaticMarkup(<ServiceState kind="forbidden" />)).toContain(
      "No tienes permiso para consultar este recurso",
    );
    expect(renderToStaticMarkup(<ServiceState kind="session" />)).toContain(
      'href="/?error=expired"',
    );
  });
  it("marks loading as busy and renders the retry action only when given", () => {
    expect(renderToStaticMarkup(<ServiceState kind="loading" />)).toContain('aria-busy="true"');
    expect(renderToStaticMarkup(<ServiceState kind="error" />)).not.toContain("<button");
    expect(
      renderToStaticMarkup(
        <ServiceState kind="error" onRetry={() => undefined} retryLabel="Otra vez" />,
      ),
    ).toContain(">Otra vez</button>");
  });
});

describe("read-only mode in the account shell", () => {
  const banner = (mode: "ACTIVE" | "READ_ONLY" | "SUSPENDED" | null, owner = true) =>
    renderToStaticMarkup(
      <AccessProvider
        initialMode={mode}
        initialNotice={readOnlyNotice({ status: "payment_failed", isDemo: false }, owner)}
        billingOwner={owner}
      >
        <ReadOnlyBanner />
        <OfflineBanner />
      </AccessProvider>,
    );
  it("shows the persistent banner with cause, consequence and next step", () => {
    const html = banner("READ_ONLY");
    expect(html).toContain("Cuenta en modo lectura");
    expect(html).toContain("no crear ni modificar");
    expect(html).toContain("Stripe rechazó el último pago");
    expect(html).toContain('href="/subscription"');
    expect(html).toContain('aria-live="polite"');
  });
  it("tells a non-owner to ask the owner instead of offering billing", () => {
    expect(banner("READ_ONLY", false)).toContain("Pide al propietario");
  });
  it("renders nothing in active accounts and an alert when suspended", () => {
    expect(banner("ACTIVE")).not.toContain("modo lectura");
    expect(banner(null)).not.toContain("modo lectura");
    const suspended = banner("SUSPENDED");
    expect(suspended).toContain("Acceso suspendido");
    expect(suspended).toContain('role="alert"');
  });
  it("assumes online while rendering on the server", () => {
    expect(banner("ACTIVE")).not.toContain("Sin conexión");
  });
  it("derives the reason from the subscription state and never invents one", () => {
    expect(readOnlyNotice({ status: "pending_activation", isDemo: false }, true).reason).toContain(
      "confirmación del pago",
    );
    expect(readOnlyNotice({ status: "read_only", isDemo: true }, true).reason).toContain("demo");
    expect(readOnlyNotice(null, false).reason).toBe(
      "La cuenta tiene restringidas las modificaciones.",
    );
    expect(writeBlockedText("READ_ONLY")).toContain("modo lectura");
    expect(writeBlockedText("SUSPENDED")).toContain("suspendido");
  });
  it("treats only an account-wide owner as billing owner", () => {
    expect(isBillingOwner({ roleCodes: ["OW"], branchIds: [], machineIds: [] })).toBe(true);
    expect(isBillingOwner({ roleCodes: ["OW"], branchIds: ["b"], machineIds: [] })).toBe(false);
    expect(isBillingOwner({ roleCodes: ["OP", "AU"], branchIds: [], machineIds: [] })).toBe(false);
  });
});

describe("failure classification", () => {
  it.each([
    [0, undefined, "offline"],
    [401, "AUTHENTICATION_REQUIRED", "session"],
    [403, "ACCOUNT_READ_ONLY", "read_only"],
    [403, "FORBIDDEN", "forbidden"],
    [404, "NOT_FOUND", "not_found"],
    [412, "PRECONDITION_FAILED", "conflict"],
    [409, "STATE_TRANSITION_INVALID", "conflict"],
    [409, "CONTEXT_CHANGED", "conflict"],
    [409, "RELATED_CONDITION_NOT_RESOLVED", "error"],
    [409, undefined, "conflict"],
    [503, undefined, "error"],
  ] as const)("status %i with %s is %s", (status, code, kind) => {
    expect(failureKind(status, code)).toBe(kind);
  });
  it("reads the BFF body and falls back to a safe message", async () => {
    const failure = await readFailure(
      Response.json({ message: "El aviso cambió.", code: "PRECONDITION_FAILED" }, { status: 412 }),
      "fallback",
    );
    expect(failure).toEqual({
      kind: "conflict",
      message: "El aviso cambió.",
      status: 412,
      code: "PRECONDITION_FAILED",
    });
    expect(
      (await readFailure(new Response("<html>", { status: 500 }), "Mensaje seguro")).message,
    ).toBe("Mensaje seguro");
  });
  it("reports a rejected fetch as offline and a non-2xx answer as a classified failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")));
    const offline = await request("/api/x", {}, "fallback").catch((error) => error);
    expect(offline).toBeInstanceOf(FailureError);
    expect(toFailure(offline, "x").kind).toBe("offline");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(Response.json({ message: "Sin permiso." }, { status: 403 })),
    );
    const forbidden = await request("/api/x", {}, "fallback").catch((error) => error);
    expect(toFailure(forbidden, "x")).toMatchObject({ kind: "forbidden", message: "Sin permiso." });
    expect(toFailure(new Error("boom"), "Seguro")).toMatchObject({
      kind: "error",
      message: "Seguro",
    });
  });
});
