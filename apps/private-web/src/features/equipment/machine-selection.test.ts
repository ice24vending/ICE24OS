import { describe, expect, it, vi } from "vitest";
import { resolveMachineSelection } from "./machine-selection";
import { demoApiResponse } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";
import { demoIds } from "../../server/demo/fixtures";

const id = demoIds.machine(1);
describe("authorized machine deep link", () => {
  it("normalizes UUID case before checking the authorized list", async () => {
    expect(await resolveMachineSelection(id.toUpperCase(), true, async () => [{ id }])).toBe(id);
  });
  it.each([undefined, "", "not-a-uuid", [id], [id, id]])(
    "ignores malformed or repeated values %j without querying",
    async (value) => {
      const read = vi.fn();
      expect(await resolveMachineSelection(value, true, read)).toBeUndefined();
      expect(read).not.toHaveBeenCalled();
    },
  );
  it("does not query without the read capability", async () => {
    const read = vi.fn();
    expect(await resolveMachineSelection(id, false, read)).toBeUndefined();
    expect(read).not.toHaveBeenCalled();
  });
  it("silently ignores foreign ids, malformed lists and unavailable services", async () => {
    expect(
      await resolveMachineSelection(id, true, async () => [{ id: demoIds.machine(2) }]),
    ).toBeUndefined();
    expect(await resolveMachineSelection(id, true, async () => null)).toBeUndefined();
    expect(
      await resolveMachineSelection(id, true, async () => {
        throw new Error("Unavailable");
      }),
    ).toBeUndefined();
  });
  it.each(["owner", "admin", "technician", "readonly"] as const)(
    "uses the real demo authorization and scope for %s",
    async (persona) => {
      const state = { ...defaultDemoState(), persona };
      const response = await demoApiResponse("machines", {}, state);
      expect(response.ok).toBe(true);
      const rows: { id: string }[] = await response.json();
      expect(rows.length).toBeGreaterThan(0);
      expect(await resolveMachineSelection(rows[0]!.id, true, async () => rows)).toBe(rows[0]!.id);
      expect(
        await resolveMachineSelection(demoIds.machine(999), true, async () => rows),
      ).toBeUndefined();
    },
  );
});
