import { describe, expect, it, vi } from "vitest";

import {
  clearProtectedLocalData,
  OFFLINE_SCHEMA_VERSION,
  queueOperation,
  type Ice24OfflineDatabase,
  type PendingOperation,
} from "./index.js";

describe("offline foundation", () => {
  it("starts with an explicit schema version", () => {
    expect(OFFLINE_SCHEMA_VERSION).toBe(1);
  });

  it("clears protected data when a session or permission is revoked", async () => {
    const clear = vi.fn<() => Promise<void>>().mockResolvedValue();
    await clearProtectedLocalData({ clear });
    expect(clear).toHaveBeenCalledOnce();
  });

  it("queues by id, so saving the same operation twice keeps one entry", async () => {
    const put = vi.fn<(operation: PendingOperation) => Promise<string>>().mockResolvedValue("op");
    const db = { pendingOperations: { put } } as unknown as Ice24OfflineDatabase;
    const operation: PendingOperation = {
      id: "op-1",
      accountId: "a",
      action: "work-order.complete",
      createdAt: "2026-10-22T10:00:00.000Z",
      state: "pending",
    };
    await queueOperation(db, operation);
    await queueOperation(db, operation);
    expect(put.mock.calls.map(([saved]) => saved.id)).toEqual(["op-1", "op-1"]);
  });
});
