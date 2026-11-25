import { describe, expect, it } from "vitest";
import { fileObjectSchema, filePageSchema } from "@ice24/contracts";
import { demoApiResponse } from "./api";
import { defaultDemoState } from "./state";
import { DEMO_ACCOUNTS } from "./fixtures";

describe("account files demo", () => {
  const now = Date.parse("2026-10-20T16:00:00Z");
  it.each(["owner", "admin", "technician", "readonly"] as const)(
    "%s lists persistent varied files that open individually",
    async (persona) => {
      const state = { ...defaultDemoState(), persona };
      const page = filePageSchema.parse(
        await (await demoApiResponse("files", {}, state, now)).json(),
      );
      expect(page.items.length).toBeGreaterThan(0);
      expect(new Set(page.items.map((file) => file.fileName)).size).toBe(page.items.length);
      for (const file of page.items) {
        const detail = await demoApiResponse(`files/${file.id}`, {}, state, now);
        expect(detail.status).toBe(200);
        expect(fileObjectSchema.parse(await detail.json())).toEqual(file);
        if (persona === "technician" || persona === "admin") {
          expect(file.relatedResource.type).not.toBe("account");
          if (file.relatedResource.type === "machine")
            expect(
              DEMO_ACCOUNTS.polar.machines.find((machine) => machine.id === file.relatedResource.id)
                ?.branchId,
            ).toBe(state.branch);
        }
      }
    },
  );
  it("paginates and keeps empty and read-only states", async () => {
    const state = { ...defaultDemoState(), mode: "READ_ONLY" as const };
    const first = filePageSchema.parse(
      await (await demoApiResponse("files?limit=2", {}, state, now)).json(),
    );
    const next = filePageSchema.parse(
      await (
        await demoApiResponse(`files?limit=2&cursor=${first.nextCursor}`, {}, state, now)
      ).json(),
    );
    expect(first.items).toHaveLength(2);
    expect(next.items).toHaveLength(2);
    expect(next.items.some((file) => first.items.some((item) => item.id === file.id))).toBe(false);
    expect(
      filePageSchema.parse(
        await (await demoApiResponse("files", {}, { ...state, scenario: "empty" }, now)).json(),
      ).items,
    ).toEqual([]);
  });
});
