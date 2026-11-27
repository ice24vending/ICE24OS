import { describe, expect, it } from "vitest";
import {
  jobPageSchema,
  jobDetailSchema,
  queueOverviewSchema,
  templateInputSchema,
} from "@ice24/contracts";
import { demoApiResponse } from "./api";
import { defaultDemoState } from "./state";
import { demoIds } from "./fixtures";
const state = { ...defaultDemoState(), persona: "platform" as const };
const get = (path: string, overrides = {}) => demoApiResponse(path, {}, { ...state, ...overrides });
describe("UXD-13 administrative demo", () => {
  it("supplies six job states, varied queues and filters before pagination", async () => {
    const all = jobPageSchema.parse(await (await get("admin/jobs")).json());
    expect(new Set(all.items.map((job) => job.status)).size).toBe(6);
    expect(new Set(all.items.map((job) => job.queue)).size).toBe(4);
    const filtered = jobPageSchema.parse(await (await get("admin/jobs?status=DEAD_LETTER")).json());
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]?.type).toBe("EMAIL_DELIVERY");
    const first = jobPageSchema.parse(await (await get("admin/jobs?limit=2")).json());
    const next = jobPageSchema.parse(
      await (await get(`admin/jobs?limit=2&cursor=${first.page.nextCursor}`)).json(),
    );
    expect(new Set([...first.items, ...next.items].map((job) => job.id)).size).toBe(4);
    const overview = queueOverviewSchema.parse(await (await get("admin/job-queues")).json());
    expect(Object.values(overview.jobs).reduce((a, b) => a + b, 0)).toBe(all.items.length);
    for (const job of all.items)
      expect(jobDetailSchema.parse(await (await get(`admin/jobs/${job.id}`)).json()).status).toBe(
        job.status,
      );
  });
  it("serves account, request and template shapes used by the real stores", async () => {
    const accounts = await (await get("admin/accounts")).json();
    expect(new Set(accounts.map((row: { access_mode: string }) => row.access_mode)).size).toBe(3);
    const requests = await (await get("admin/equipment-requests")).json();
    expect(new Set(requests.map((row: { status: string }) => row.status)).size).toBe(5);
    const versions = await (
      await get(`technical-models/${demoIds.model(1)}/template-versions`)
    ).json();
    expect(versions.map((row: { status: string }) => row.status)).toEqual([
      "draft",
      "published",
      "superseded",
    ]);
    for (const version of versions)
      expect(templateInputSchema.parse(version.definition)).toBeTruthy();
    expect((await get(`admin/accounts/${demoIds.account(999)}`)).status).toBe(404);
  });
  it.each(["owner", "technician", "readonly", "admin"])(
    "denies internal reads to %s",
    async (persona) => {
      for (const path of [
        "admin/jobs",
        `admin/jobs/${demoIds.job(3)}`,
        "admin/accounts",
        `admin/accounts/${demoIds.account(1)}`,
        "admin/equipment-requests",
        "admin/dashboard",
      ])
        expect((await get(path, { persona })).status).toBe(403);
    },
  );
  it("has empty, read-only, error with folio and offline states", async () => {
    for (const path of ["admin/accounts", "admin/equipment-requests"])
      expect(await (await get(path, { scenario: "empty" })).json()).toEqual([]);
    expect(
      jobPageSchema.parse(await (await get("admin/jobs", { scenario: "empty" })).json()).items,
    ).toEqual([]);
    expect((await get("admin/accounts", { mode: "READ_ONLY" })).status).toBe(200);
    const error = await (await get("admin/accounts", { network: "error" })).json();
    expect(error.error.correlationId).toBeTruthy();
    await expect(get("admin/accounts", { network: "offline" })).rejects.toThrow();
    const write = await demoApiResponse(
      `admin/jobs/${demoIds.job(3)}/retry`,
      { method: "POST", body: JSON.stringify({ reason: "Proveedor recuperado" }) },
      { ...state, mode: "READ_ONLY" },
    );
    expect(write.status).toBe(403);
  });
});
