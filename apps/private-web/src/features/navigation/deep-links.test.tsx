// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ContextSelectorData } from "../context/model";
import { hasUnsavedChanges, useUnsavedChanges } from "../context/unsaved-changes";
import {
  backHref,
  contextLocation,
  decideLink,
  linkContext,
  loginLocation,
  nextPath,
  shareableLink,
  withOrigin,
} from "./deep-links";
import { DeepLinkPrompt } from "./deep-link-prompt";
import { UnsavedChangesGuard } from "./unsaved-guard";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const ACCOUNT_A = "a0000000-0000-4000-8000-000000000001";
const ACCOUNT_B = "a0000000-0000-4000-8000-000000000002";
const BRANCH = { id: "b0000000-0000-4000-8000-000000000001", name: "Centro" };
const account = (accountId: string, accountName: string) => ({
  accountId,
  accountName,
  roles: "Técnico",
  readOnly: false,
});
const SELECTOR: ContextSelectorData = {
  current: account(ACCOUNT_A, "Hielo Polar"),
  accounts: [account(ACCOUNT_A, "Hielo Polar"), account(ACCOUNT_B, "Hielo del Bajío")],
  options: { branches: [BRANCH], machines: [] },
  branch: null,
  machine: null,
  focusLost: false,
};

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe("deep links (F6-11)", () => {
  it("sends to the login with an internal page to come back to, never an external one", () => {
    expect(loginLocation("/files?x=1", null)).toBe("/?next=%2Ffiles%3Fx%3D1");
    expect(loginLocation("/files", "expired")).toBe("/?error=expired&next=%2Ffiles");
    expect(loginLocation("//evil.test", "access")).toBe("/?error=access");
    expect(loginLocation(null, null)).toBe("/");
    for (const unsafe of ["//evil.test", "/\t/evil.test", "/api/auth/logout", "/access/mfa", "/"])
      expect(nextPath(unsafe)).toBeNull();
    expect(nextPath("/plantillas/lista?q=M")).toBe("/plantillas/lista?q=M");
    expect(contextLocation("/files")).toBe("/access/context?next=%2Ffiles");
    expect(contextLocation(null)).toBe("/access/context");
  });

  it("asks to switch only to an account or branch within reach, else the same «sin permiso»", () => {
    const decide = (path: string, selector = SELECTOR) => decideLink(linkContext(path), selector);
    expect(decide("/files")).toBeNull();
    expect(decide(`/files?cuenta=${ACCOUNT_A}`)).toBeNull();
    expect(decide(`/files?cuenta=${ACCOUNT_B}`)).toEqual({
      kind: "switch-account",
      accountId: ACCOUNT_B,
      accountName: "Hielo del Bajío",
    });
    // Unknown and foreign accounts or branches look alike: nothing tells whether they exist.
    expect(decide("/files?cuenta=a0000000-0000-4000-8000-000000000099")).toEqual({
      kind: "denied",
    });
    expect(decide("/files?cuenta=x")).toEqual({ kind: "denied" });
    expect(decide(`/files?sucursal=${BRANCH.id}`)).toEqual({
      kind: "switch-branch",
      branchId: BRANCH.id,
      branchName: "Centro",
    });
    expect(decide("/files?sucursal=otra")).toEqual({ kind: "denied" });
    expect(decide(`/files?sucursal=${BRANCH.id}`, { ...SELECTOR, options: "forbidden" })).toEqual({
      kind: "denied",
    });
    // A failed load proves nothing: neither switch nor deny.
    expect(decide(`/files?cuenta=${ACCOUNT_B}`, { ...SELECTOR, accounts: null })).toEqual({
      kind: "unavailable",
    });
  });

  it("shares the page with its account and keeps the origin for «Regresar»", () => {
    expect(
      shareableLink(`http://web.test/plantillas/detalle?machine=m1&desde=%2Fx`, ACCOUNT_A, null),
    ).toBe(`http://web.test/plantillas/detalle?machine=m1&cuenta=${ACCOUNT_A}`);
    const href = withOrigin("/plantillas/detalle?machine=m1", "/plantillas/lista?q=M&pagina=2");
    const from = new URL(href, "http://web.test").searchParams.get("desde");
    expect(backHref(from, "/plantillas/lista")).toBe("/plantillas/lista?q=M&pagina=2");
    expect(backHref("https://evil.test", "/plantillas/lista")).toBe("/plantillas/lista");
  });
});

describe("DeepLinkPrompt (F6-11)", () => {
  it("posts the switch with the link to open and denies without naming anything", () => {
    const { container, unmount } = render(
      <DeepLinkPrompt
        decision={{ kind: "switch-account", accountId: ACCOUNT_B, accountName: "Hielo del Bajío" }}
        path={`/files?cuenta=${ACCOUNT_B}`}
        csrfToken="csrf"
      />,
    );
    const form = container.querySelector("form")!;
    expect(form.getAttribute("action")).toBe("/api/session-context");
    expect(Object.fromEntries(new FormData(form))).toEqual({
      csrfToken: "csrf",
      accountId: ACCOUNT_B,
      next: `/files?cuenta=${ACCOUNT_B}`,
    });
    expect(screen.getByRole("button", { name: "Cambiar a Hielo del Bajío" })).toBeTruthy();
    unmount();
    render(<DeepLinkPrompt decision={{ kind: "denied" }} path="/files" csrfToken="csrf" />);
    expect(screen.getByText("No tienes acceso a este enlace")).toBeTruthy();
    expect(document.querySelector("form")).toBeNull();
  });
});

describe("UnsavedChangesGuard (F6-11)", () => {
  const dirty = () => renderHook(({ on }) => useUnsavedChanges(on), { initialProps: { on: true } });

  it("confirms an in-app link with unsaved changes and goes on only when discarded", async () => {
    const user = userEvent.setup();
    render(
      <>
        <UnsavedChangesGuard expiresAt={Date.now() + 60_000} />
        <a href="/files">Archivos</a>
      </>,
    );
    const form = dirty();
    await user.click(screen.getByRole("link", { name: "Archivos" }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "Tienes cambios sin guardar" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(hasUnsavedChanges()).toBe(true);
    await user.click(screen.getByRole("link", { name: "Archivos" }));
    await user.click(screen.getByRole("button", { name: "Descartar y salir" }));
    expect(push).toHaveBeenCalledWith("/files");
    expect(hasUnsavedChanges()).toBe(false);
    form.unmount();
  });

  it("lets links through without changes and warns before closing the tab with them", () => {
    render(
      <>
        <UnsavedChangesGuard expiresAt={Date.now() + 60_000} />
        <a href="/files">Archivos</a>
      </>,
    );
    // After the guard's capture listener: jsdom cannot navigate.
    document.addEventListener("click", (event) => event.preventDefault(), { once: true });
    const clean = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("link", { name: "Archivos" }).dispatchEvent(clean);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    const form = dirty();
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    form.unmount();
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it("traps the back button once and warns when the session ends with unsaved changes", () => {
    vi.useFakeTimers();
    try {
      const before = window.history.length;
      render(<UnsavedChangesGuard expiresAt={Date.now() + 1_000} />);
      const form = dirty();
      expect(window.history.length).toBe(before + 1);
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
      expect(screen.getByRole("alertdialog", { name: "Tienes cambios sin guardar" })).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      expect(screen.getByRole("alertdialog", { name: "Tu sesión terminó" })).toBeTruthy();
      form.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
