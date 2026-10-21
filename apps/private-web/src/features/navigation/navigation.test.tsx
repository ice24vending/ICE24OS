import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DemoRequest, capabilities } from "../../server/demo/api";
import { DEMO_PERSONAS, type DemoPersonaKey } from "../../server/demo/personas";
import { defaultDemoState } from "../../server/demo/state";
import {
  BOTTOM_LIMIT,
  DESTINATIONS,
  authorizedDestinations,
  bottomDestinations,
  breadcrumbsFor,
} from "./destinations";
import { PrivateShell } from "./private-shell";

let pathname = "/audit";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

/** Capabilities of a persona, decided by the real `authorize()` over the seeded role grants. */
const capabilitiesOf = (persona: DemoPersonaKey, mode: "ACTIVE" | "SUSPENDED" = "ACTIVE") =>
  capabilities(new DemoRequest({ ...defaultDemoState(), persona, mode }, Date.now()));
const keysOf = (persona: DemoPersonaKey) =>
  authorizedDestinations(capabilitiesOf(persona)).map((destination) => destination.key);

describe("destination registry", () => {
  it("declares each destination once with its permission, module and placement", () => {
    expect(new Set(DESTINATIONS.map((d) => d.key)).size).toBe(DESTINATIONS.length);
    expect(new Set(DESTINATIONS.map((d) => d.href)).size).toBe(DESTINATIONS.length);
    for (const destination of DESTINATIONS) {
      expect(destination.permission).toMatch(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/);
      expect(destination.module).not.toBe("");
    }
  });

  // Positive and negative per role (AppFlow FL-02): what each persona sees and never sees.
  it.each<[DemoPersonaKey, string[]]>([
    ["owner", ["workspace", "notifications", "files", "subscription", "audit", "profile"]],
    ["admin", ["workspace", "notifications", "files", "profile"]],
    ["technician", ["workspace", "notifications", "files", "profile"]],
    ["readonly", ["workspace", "notifications", "files", "audit", "profile"]],
    ["ice24", ["workspace", "notifications", "subscription", "profile"]],
    [
      "platform",
      ["workspace", "notifications", "files", "subscription", "audit", "jobs", "profile"],
    ],
  ])("%s sees exactly its authorized destinations", (persona, expected) => {
    expect(keysOf(persona)).toEqual(expected);
  });

  it("covers every demo persona", () => {
    expect(Object.keys(DEMO_PERSONAS).sort()).toEqual(
      ["owner", "admin", "technician", "readonly", "ice24", "platform"].sort(),
    );
  });

  it("shows nothing for a suspended account (deny by default)", () => {
    expect(authorizedDestinations(capabilitiesOf("owner", "SUSPENDED"))).toEqual([]);
  });

  it("hides an MFA destination until the session is verified", () => {
    const granted = { permissions: ["jobs.admin-read"], mfaVerified: false };
    expect(authorizedDestinations(granted)).toEqual([]);
    expect(authorizedDestinations({ ...granted, mfaVerified: true }).map((d) => d.key)).toEqual([
      "jobs",
    ]);
  });

  it("sends the browser only drawing data, never permissions", () => {
    for (const destination of authorizedDestinations(capabilitiesOf("platform")))
      expect(Object.keys(destination).sort()).toEqual(
        ["href", "icon", "key", "label", "placement"].sort(),
      );
  });

  it("keeps the bottom bar within five items with «Más»", () => {
    for (const persona of Object.keys(DEMO_PERSONAS) as DemoPersonaKey[])
      expect(
        bottomDestinations(authorizedDestinations(capabilitiesOf(persona))).length,
      ).toBeLessThanOrEqual(BOTTOM_LIMIT);
    expect(BOTTOM_LIMIT + 1).toBeLessThanOrEqual(5);
  });

  it("builds breadcrumbs from the route under its destination", () => {
    const destinations = authorizedDestinations(capabilitiesOf("owner"));
    expect(breadcrumbsFor("/audit", destinations)).toEqual([
      { label: "Auditoría", href: "/audit" },
    ]);
    expect(breadcrumbsFor("/workspace/sucursal-centro", destinations)).toEqual([
      { label: "Cuentas y máquinas", href: "/workspace" },
      { label: "Sucursal centro", href: "/workspace/sucursal-centro" },
    ]);
    // A path of a destination the viewer cannot open gets no crumbs.
    expect(breadcrumbsFor("/jobs/abc", destinations)).toEqual([]);
  });
});

describe("PrivateShell", () => {
  const render = (persona: DemoPersonaKey, menuAvailable = true) =>
    renderToStaticMarkup(
      <PrivateShell
        destinations={authorizedDestinations(capabilitiesOf(persona))}
        menuAvailable={menuAvailable}
        userName="Laura Méndez"
        contextId="c"
        csrfToken="t"
        selector={{
          current: {
            accountId: "a",
            accountName: "Hielo Polar",
            roles: "Propietario de cuenta",
            readOnly: false,
          },
          accounts: [],
          options: { branches: [], machines: [] },
          branch: null,
          machine: null,
          focusLost: false,
        }}
      >
        <main id="main-content">Contenido</main>
      </PrivateShell>,
    );

  it("renders landmarks: header, main navigation, bottom navigation and the page main", () => {
    const html = render("owner");
    expect(html).toContain('<header class="shell-topbar"');
    expect(html.match(/aria-label="Navegación principal"/g)).toHaveLength(2); // sidebar + drawer
    expect(html).toContain('aria-label="Navegación inferior"');
    expect(html).toContain('<main id="main-content">');
  });

  it("marks the current destination with aria-current", () => {
    pathname = "/audit";
    const html = render("owner");
    expect(html).toMatch(
      /aria-current="page"[^>]*href="\/audit"|href="\/audit"[^>]*aria-current="page"/,
    );
  });

  it("does not render links to unauthorized destinations", () => {
    const html = render("technician");
    for (const href of ["/audit", "/jobs", "/subscription"])
      expect(html).not.toContain(`href="${href}"`);
    expect(html).toContain('href="/files"');
  });

  it("shows the context, the user and the controls with accessible names", () => {
    const html = render("owner");
    expect(html).toContain("Hielo Polar");
    expect(html).toContain("Laura Méndez");
    expect(html).toContain('aria-label="Abrir menú"');
    expect(html).toContain('aria-label="Cerrar menú"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(">Más<");
  });

  it("explains a menu that could not be loaded instead of guessing it", () => {
    const html = render("owner", false);
    expect(html).toContain("No fue posible cargar tu menú");
    expect(html).not.toContain('href="/audit"');
  });
});
