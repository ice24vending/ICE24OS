import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DemoRequest, demoApiResponse } from "./api";
import { defaultDemoState } from "./state";
import { demoBranchAudit } from "./branches";
import type { BranchOverview } from "@ice24/contracts";

describe("UXD-02 demo branches", () => {
  const state = () => ({ ...defaultDemoState(), csrf: randomBytes(24).toString("base64url") });
  it("provides varied scoped summaries and redacts names outside account-users scope", async () => {
    const s = state();
    const owner = (await (
      await demoApiResponse("branches/overview", {}, s)
    ).json()) as BranchOverview[];
    expect(owner).toHaveLength(4);
    expect(new Set(owner.map((row) => row.data.address)).size).toBe(4);
    expect(owner.some((row) => row.status === "archived")).toBe(true);
    const adminState = { ...s, persona: "admin" as const };
    const admin = (await (
      await demoApiResponse("branches/overview", {}, adminState)
    ).json()) as BranchOverview[];
    expect(admin.map((row) => row.id)).toEqual([s.branch]);
    expect(admin[0]!.responsible).toBe("Asignado");
    expect(admin[0]!.machineCounts).toEqual(owner[0]!.machineCounts);
    expect(
      (await demoApiResponse(`branches/${owner[1]!.id}/overview`, {}, adminState)).status,
    ).toBe(404);
    expect(
      await (
        await demoApiResponse("branches/overview", {}, { ...s, persona: "technician" })
      ).json(),
    ).toEqual([]);
  });
  it("creates and patches per session, preserves metadata, validates version and audits once", async () => {
    const s = state();
    const rows = (await (
      await demoApiResponse("branches/overview", {}, s)
    ).json()) as BranchOverview[];
    const input = { ...rows[0]!.data, code: "NUEVA-01" };
    const post = {
      method: "POST",
      headers: { "idempotency-key": "create" },
      body: JSON.stringify(input),
    };
    const created = (await (await demoApiResponse("branches", post, s)).json()) as BranchOverview;
    expect(created.row_version).toBe(1);
    expect(await (await demoApiResponse("branches", post, s)).json()).toEqual(created);
    const edit = {
      method: "PATCH",
      headers: { "idempotency-key": "edit", "if-match": "1" },
      body: JSON.stringify({ name: "Nombre nuevo" }),
    };
    const updated = (await (
      await demoApiResponse(`branches/${created.id}`, edit, s)
    ).json()) as BranchOverview;
    expect(updated.data).toEqual({ ...input, name: "Nombre nuevo" });
    expect(
      (
        await demoApiResponse(
          `branches/${created.id}`,
          { ...edit, headers: { ...edit.headers, "idempotency-key": "stale" } },
          s,
        )
      ).status,
    ).toBe(409);
    expect((await demoApiResponse(`branches/${created.id}`, {}, state())).status).toBe(404);
    expect(demoBranchAudit(new DemoRequest(s, Date.now())).map((event) => event.operation)).toEqual(
      ["BRANCH_CREATED", "BRANCH_UPDATED"],
    );
  });
  it("rejects duplicates, writes without permission and account read-only mode", async () => {
    const s = state();
    const row = (
      (await (await demoApiResponse("branches/overview", {}, s)).json()) as BranchOverview[]
    )[0]!;
    const post = {
      method: "POST",
      headers: { "idempotency-key": "duplicate" },
      body: JSON.stringify(row.data),
    };
    const duplicate = await demoApiResponse("branches", post, s);
    expect(duplicate.status).toBe(400);
    expect((await duplicate.json()).error.details).toEqual({ field: "code", reason: "duplicate" });
    for (const persona of ["admin", "technician", "readonly"] as const)
      expect((await demoApiResponse("branches", post, { ...s, persona })).status).toBe(403);
    expect((await demoApiResponse("branches", post, { ...s, mode: "READ_ONLY" })).status).toBe(403);
    expect(
      await (await demoApiResponse("branches/overview", {}, { ...s, scenario: "empty" })).json(),
    ).toEqual([]);
  });
});
