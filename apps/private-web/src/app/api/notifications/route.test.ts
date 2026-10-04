import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn(), csrf: vi.fn() }));
vi.mock("../../../server/session/session", () => ({
  readBrowserSession: fixtures.session,
  requireValidCsrf: fixtures.csrf,
}));
vi.mock("../../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
import { GET } from "./route";
import { POST } from "./[notificationId]/[action]/route";

const id = "11111111-1111-4111-8111-111111111111";
const now = "2026-10-03T12:00:00.000000Z";
const notification = {
  id,
  type: "subscription.payment_failed",
  priority: "critical",
  title: "Pago de suscripción rechazado",
  message: "El cobro fue rechazado.",
  recipientUserId: id,
  relatedResource: { type: "subscription", id },
  status: "in_progress",
  pinned: false,
  sentChannels: ["in_app"],
  escalationLevel: 0,
  occurredAt: now,
  readAt: now,
  acknowledgedAt: now,
  inProgressAt: now,
  resolvedAt: null,
  attentionResource: { type: "subscription", id },
  resolutionResource: null,
  conditionOpen: true,
  audit: { createdAt: now, createdBy: id, updatedAt: now, updatedBy: id, version: 4 },
};
const get = (query = "", context = "current") =>
  new Request(`https://private.test/api/notifications?${query}`, {
    headers: { "x-ice24-workspace-context": context },
  });
const post = (action: string, fields: Record<string, string>, context = "current") => {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return [
    new Request(`https://private.test/api/notifications/${id}/${action}`, {
      method: "POST",
      body,
      headers: { "x-ice24-workspace-context": context, origin: "https://private.test" },
    }),
    { params: Promise.resolve({ notificationId: id, action }) },
  ] as const;
};
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.session.mockResolvedValue({
    contextId: "current",
    accessToken: "secret",
    csrfToken: "t",
  });
  fixtures.api.mockResolvedValue(
    Response.json({ items: [], page: { hasMore: false, nextCursor: null } }),
  );
});

describe("notification center BFF", () => {
  it("rejects stale contexts and expired sessions before forwarding", async () => {
    expect((await GET(get("", "old"))).status).toBe(409);
    expect((await POST(...post("acknowledge", { key: "ack-key-0001" }, "old"))).status).toBe(409);
    fixtures.session.mockResolvedValue(null);
    expect((await GET(get())).status).toBe(401);
    expect(fixtures.api).not.toHaveBeenCalled();
  });

  it("forwards only validated filters and the summary view", async () => {
    for (const query of [
      "view=raw",
      "status=RESOLVED",
      "limit=500",
      "userId=x",
      "view=summary&x=1",
    ])
      expect((await GET(get(query))).status).toBe(400);
    expect(fixtures.api).not.toHaveBeenCalled();
    expect((await GET(get("pinned=true&limit=20"))).status).toBe(200);
    expect(fixtures.api).toHaveBeenLastCalledWith(
      "notifications?pinned=true&limit=20",
      expect.anything(),
      expect.anything(),
    );
    fixtures.api.mockResolvedValue(
      Response.json({
        badge: 2,
        unread: 1,
        pinned: 1,
        acknowledged: 0,
        inProgress: 0,
        resolved: 3,
      }),
    );
    const summary = await GET(get("view=summary"));
    expect(await summary.json()).toMatchObject({ badge: 2, pinned: 1 });
    expect(summary.headers.get("cache-control")).toBe("no-store");
  });

  it("requires CSRF, an idempotency key, a known action and the linked resource", async () => {
    fixtures.csrf.mockImplementationOnce(() => {
      throw new Error("csrf");
    });
    expect((await POST(...post("acknowledge", { key: "ack-key-0001" }))).status).toBe(403);
    expect((await POST(...post("acknowledge", { key: "x" }))).status).toBe(400);
    expect((await POST(...post("archive", { key: "ack-key-0001" }))).status).toBe(400);
    expect((await POST(...post("resolve", { key: "res-key-0001" }))).status).toBe(400);
    expect(fixtures.api).not.toHaveBeenCalled();

    fixtures.api.mockResolvedValue(Response.json(notification));
    const response = await POST(
      ...post("start-attention", {
        key: "att-key-0001",
        csrfToken: "t",
        resourceType: "subscription",
        resourceId: id,
      }),
    );
    expect(response.status).toBe(200);
    expect(fixtures.api).toHaveBeenCalledWith(
      `notifications/${id}/start-attention`,
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "idempotency-key": "att-key-0001" }),
        body: JSON.stringify({ relatedResource: { type: "subscription", id } }),
      }),
    );
  });

  it("translates API.md error codes into safe Spanish messages", async () => {
    fixtures.api.mockResolvedValue(
      Response.json(
        {
          error: {
            code: "RELATED_CONDITION_NOT_RESOLVED",
            message: "upstream detail",
            correlationId: id,
            timestamp: now,
          },
        },
        { status: 409 },
      ),
    );
    const response = await POST(
      ...post("resolve", { key: "res-key-0002", resourceType: "subscription", resourceId: id }),
    );
    expect(response.status).toBe(409);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain("la causa de la alerta sigue abierta");
    expect(body.message).not.toContain("upstream");
  });
});
