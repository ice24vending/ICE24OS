import type { SynchronizationConflict, OfflineOrderPackage } from "@ice24/contracts";
import type { DemoRequest } from "./api";
// Fictitious writes are isolated per demo browser session; never shared with visual fixtures.
// Next loads route handlers and server components through separate module graphs.
// Keep their fictitious state together within this demo server process.
const runtime = globalThis as typeof globalThis & {
  ice24DemoOffline?: {
    packages: Map<string, OfflineOrderPackage>;
    receipts: Map<string, { input: string; value: unknown }>;
    released: Set<string>;
    conflicts: Map<string, SynchronizationConflict>;
    provoked: Set<string>;
  };
};
const state = (runtime.ice24DemoOffline ??= {
  packages: new Map(),
  receipts: new Map(),
  released: new Set(),
  conflicts: new Map(),
  provoked: new Set(),
});
export const demoOfflinePackages = state.packages;
export const demoOfflineReceipts = state.receipts;
export const demoReleasedLeases = state.released;
export const demoOfflineKey = (request: DemoRequest, id: string) =>
  JSON.stringify([request.state.csrf, request.account.id, id]);

export const demoSyncConflicts = state.conflicts;
export const demoProvokedOrders = state.provoked;
