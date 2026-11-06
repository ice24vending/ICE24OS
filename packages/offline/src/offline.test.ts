import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";

import {
  clearProtectedLocalData,
  OFFLINE_SCHEMA_VERSION,
  queueOperation,
  Ice24OfflineDatabase,
  type PendingOperation,
} from "./index.js";

describe("offline foundation", () => {
  it("starts with an explicit schema version", () => {
    expect(OFFLINE_SCHEMA_VERSION).toBe(2);
  });

  it("clears protected data when a session or permission is revoked", async () => {
    const clear = vi.fn<() => Promise<void>>().mockResolvedValue();
    await clearProtectedLocalData({ clear });
    expect(clear).toHaveBeenCalledOnce();
  });

  it("queues by id, so saving the same operation twice keeps one entry", async () => {
    const db = new Ice24OfflineDatabase(`queue-${crypto.randomUUID()}`);
    const operation: PendingOperation = {
      id: "op-1",
      accountId: "a",
      userId: "u",
      action: "work-order.complete",
      createdAt: "2026-10-22T10:00:00.000Z",
      state: "pending",
    };
    try {
      await queueOperation(db, operation);
      await queueOperation(db, operation);
      expect(await db.pendingOperations.count()).toBe(1);
      await expect(queueOperation(db, { ...operation, userId: "other" })).rejects.toThrow(
        "another context",
      );
      expect((await db.pendingOperations.get(operation.id))?.userId).toBe("u");
    } finally {
      await db.delete();
    }
  });
});
