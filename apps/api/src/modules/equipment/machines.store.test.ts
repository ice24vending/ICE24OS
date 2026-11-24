import { describe, expect, it, vi } from "vitest";
import { MachinesStore } from "./machines.store.js";
import type { EquipmentDatabase } from "./equipment.database.js";
import type { SecurityRequest } from "../../common/security/security-request.js";
describe("machine overview query", () => {
  it("makes one data query for all machines and uses the read gate and all scope parameters", async () => {
    const rows = [{ id: "machine-a", openTickets: 3 }];
    const query = vi.fn().mockResolvedValue({ rows });
    const run = vi.fn(async (_request, _operation, _body, _write, execute) =>
      execute(
        { query },
        {
          accountId: "account-a",
          subject: {
            accountWide: false,
            branchIds: new Set(["branch-a"]),
            machineIds: new Set(["machine-a"]),
          },
        },
      ),
    );
    const store = new MachinesStore({ run } as unknown as EquipmentDatabase);
    const request = {} as SecurityRequest;
    expect(await store.overview(request)).toBe(rows);
    expect(run).toHaveBeenCalledWith(
      request,
      "machines-overview",
      null,
      false,
      expect.any(Function),
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]![1]).toEqual(["account-a", false, ["branch-a"], ["machine-a"]]);
  });
});
