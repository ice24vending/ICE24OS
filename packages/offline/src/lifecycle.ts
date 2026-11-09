import type { Ice24OfflineDatabase } from "./index.js";
import type { OfflineOwner } from "./protected-store.js";
/** Remove a revoked package, including dependent operations and encrypted upload checkpoints. */
export async function purgeOfflineOrders(
  db: Ice24OfflineDatabase,
  owner: OfflineOwner,
  orderIds: readonly string[],
) {
  const scope = JSON.stringify([owner.accountId, owner.userId]);
  return db.transaction("rw", db.tables, async () => {
    const operationIds: string[] = [];
    for (const table of [db.orders, db.drafts, db.evidence, db.operations, db.metadata]) {
      const rows = await table
        .where("scope")
        .equals(scope)
        .filter((row) => orderIds.includes(row.orderId))
        .toArray();
      if (table === db.operations)
        for (const row of rows) {
          const id: unknown = JSON.parse(row.key)[2];
          if (typeof id === "string") operationIds.push(id);
        }
      await table.bulkDelete(rows.map((row) => row.key));
    }
    const pending = await db.pendingOperations
      .filter(
        (op) =>
          op.accountId === owner.accountId &&
          op.userId === owner.userId &&
          (operationIds.includes(op.id) ||
            orderIds.some((id) => op.href === `/offline-work.html?order=${id}`)),
      )
      .toArray();
    await db.pendingOperations.bulkDelete(pending.map((op) => op.id));
    if (!(await db.orders.where("scope").equals(scope).count())) await db.keys.delete(scope);
    return pending.filter((op) => !["loaded", "resolved"].includes(op.state)).map((op) => op.id);
  });
}
