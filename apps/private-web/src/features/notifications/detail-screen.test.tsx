// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "@ice24/contracts";
import { AccessProvider } from "../account-shell/access-provider";
import { readOnlyNotice } from "../account-shell/access";
import { NotificationDetailScreen } from "./detail-screen";

const id = "30000000-0000-4000-8000-000000000002";
const now = "2026-10-06T12:00:00.000Z";
const unread: Notification = {
  id,
  type: "machine.out_of_service",
  priority: "high",
  title: "Despachadora Centro está fuera de servicio",
  message: "El técnico reportó una falla en el compresor.",
  recipientUserId: id,
  relatedResource: { type: "machine", id },
  status: "unread",
  pinned: false,
  sentChannels: ["in_app"],
  escalationLevel: 0,
  occurredAt: now,
  readAt: null,
  acknowledgedAt: null,
  inProgressAt: null,
  resolvedAt: null,
  attentionResource: null,
  resolutionResource: null,
  conditionOpen: true,
  emailDelivery: null,
  audit: { createdAt: now, createdBy: id, updatedAt: now, updatedBy: id, version: 1 },
};
const fetchMock = vi.fn();
const posts = () =>
  fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST");
const screenFor = (initial: Notification | null, mode: "ACTIVE" | "READ_ONLY" = "ACTIVE") => (
  <AccessProvider initialMode={mode} initialNotice={readOnlyNotice(null, true)} billingOwner>
    <NotificationDetailScreen
      id={id}
      contextId="c"
      csrfToken="t"
      initial={initial}
      failure={null}
      backHref="/notifications?filtro=en-atencion"
    />
  </AccessProvider>
);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("alert detail route (UXD-05)", () => {
  it("records the read only after mounting, never while rendering on the server", async () => {
    const html = renderToString(screenFor(unread));
    expect(html).toContain('data-page-ready="false"');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockImplementation(async (url: string) =>
      Response.json(url.endsWith("/read") ? { ...unread, status: "read", readAt: now } : unread),
    );
    render(screenFor(unread));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]![0]).toBe(`/api/notifications/${id}/read`);
    expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(unread.title);
    expect(document.title).toBe(`${unread.title} · ICE24 OS`);
    expect(screen.getByRole("link", { name: "Volver a avisos" }).getAttribute("href")).toContain(
      "/notifications?filtro=en-atencion",
    );
  });

  it("still records the read in a read-only account and hides a rejection", async () => {
    // The API allows alert attention in read-only accounts (F5-11); if it refuses, say nothing.
    fetchMock.mockResolvedValue(
      Response.json({ message: "Sin permiso", code: "ACCOUNT_READ_ONLY" }, { status: 403 }),
    );
    render(screenFor(unread, "READ_ONLY"));
    await waitFor(() => expect(posts()).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Marcar enterado" })).toBeTruthy(),
    );
    expect(screen.queryByText(/Sin permiso|No fue posible/u)).toBeNull();
  });

  it("ignores a rejected read without showing an error", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "No disponible", code: "DEPENDENCY_UNAVAILABLE" }, { status: 503 }),
    );
    render(screenFor(unread));
    await waitFor(() => expect(posts()).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Marcar enterado" })).toBeTruthy(),
    );
    expect(screen.queryByText("No disponible")).toBeNull();
  });

  it("explains an alert that is no longer available, with the way back", () => {
    render(screenFor(null));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Aviso");
    expect(screen.getByText("Este aviso ya no está disponible.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver a avisos" })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
