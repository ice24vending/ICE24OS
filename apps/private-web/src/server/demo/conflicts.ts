import { randomUUID } from "node:crypto";
import {
  conflictFields,
  conflictExecution,
  conflictResolutionSchema,
  synchronizationConflictSchema,
  type OfflineSyncOperation,
  type OfflineOrderPackage,
} from "@ice24/contracts";
import { assessWorkOrderExecution } from "@ice24/domain";
import type { DemoRequest } from "./api";
import { demoWorkOrders } from "./work-orders";
import { conflictFixture } from "./conflict-fixture";
import {
  demoSyncConflicts as conflicts,
  demoProvokedOrders,
  demoOfflinePackages as packages,
  demoOfflineReceipts as receipts,
  demoOfflineKey,
  demoReleasedLeases,
} from "./offline-state";
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "no-store" } });
export function recordDemoConflict(
  request: DemoRequest,
  packet: OfflineOrderPackage,
  local: OfflineSyncOperation,
) {
  const id = randomUUID(),
    server = {
      order: structuredClone(packet.order),
      execution: structuredClone(packet.execution),
      actorId: request.subject.userId,
      capturedAt: new Date(request.now).toISOString(),
    };
  conflicts.set(
    request.state.csrf + ":" + id,
    synchronizationConflictSchema.parse({
      id,
      accountId: request.account.id,
      orderId: local.orderId,
      actorId: request.subject.userId,
      deviceId: local.deviceId,
      createdAt: new Date(request.now).toISOString(),
      local: structuredClone(local),
      server,
      fields: conflictFields.filter(
        (field) =>
          JSON.stringify(local.execution[field]) !== JSON.stringify(server.execution?.[field]),
      ),
      state: "conflict",
      resolution: null,
    }),
  );
  return {
    status: "conflict",
    conflictId: id,
    message: "Ambas versiones se conservaron para revisión.",
  };
}
export function provokeDemoConflict(
  request: DemoRequest,
  packet: OfflineOrderPackage,
  local: OfflineSyncOperation,
) {
  const key = demoOfflineKey(request, packet.order.id);
  if (request.state.maintenance !== "conflict" || demoProvokedOrders.has(key)) return;
  demoProvokedOrders.add(key);
  packet.order = { ...packet.order, rowVersion: packet.order.rowVersion + 1 };
  packet.execution = {
    ...structuredClone(local.execution),
    diagnosis: "Diagnóstico actualizado por el administrador durante el trabajo en campo.",
  };
}
export function demoConflictResponse(
  request: DemoRequest,
  route: string,
  init: RequestInit,
): Response | undefined {
  const resolveId = /^synchronization\/conflicts\/([^/]+)\/resolve$/.exec(route)?.[1];
  const list = route === "synchronization/conflicts" && (init.method ?? "GET") === "GET";
  if (!list && !resolveId) return;
  if (
    !request.authorize(
      list ? "maintenance.orders-read" : "maintenance.orders-review",
      list ? "READ" : "WRITE",
    ).allowed
  )
    return json({ message: "Sin permiso." }, 403);
  const visible = demoWorkOrders(request);
  if (list && request.state.maintenance === "review-conflict") {
    const order = visible.find((o) => o.state === "in_progress");
    if (order) {
      const fixture = { ...conflictFixture(order), accountId: request.account.id };
      const key = request.state.csrf + ":" + fixture.id;
      if (!conflicts.has(key)) {
        conflicts.set(key, fixture);
        packages.set(demoOfflineKey(request, order.id), {
          formatVersion: 1,
          accountId: request.account.id,
          userId: fixture.actorId,
          order: fixture.server.order,
          execution: fixture.server.execution,
          policy: "F7-D03-proposal",
          lease: {
            id: fixture.local.leaseId,
            deviceId: fixture.deviceId,
            userId: fixture.actorId,
            downloadedAt: fixture.createdAt,
            expiresAt: new Date(request.now + 72 * 3600_000).toISOString(),
          },
        });
      }
    }
  }
  if (list)
    return json({
      items: [...conflicts.entries()]
        .filter(
          ([key, c]) =>
            key.startsWith(request.state.csrf + ":") &&
            c.accountId === request.account.id &&
            visible.some((o) => o.id === c.orderId),
        )
        .map(([, c]) => ({
          ...c,
          current: {
            order:
              packages.get(demoOfflineKey(request, c.orderId))?.order ??
              visible.find((o) => o.id === c.orderId)!,
            execution:
              packages.get(demoOfflineKey(request, c.orderId))?.execution ?? c.server.execution,
          },
        })),
      canResolve: request.authorize("maintenance.orders-review", "WRITE").allowed,
      policy: "F7-D02-proposal",
    });
  const conflict = conflicts.get(request.state.csrf + ":" + resolveId);
  if (!conflict || !visible.some((o) => o.id === conflict.orderId))
    return json({ message: "Conflicto no disponible." }, 404);
  const headers = new Headers(init.headers),
    key = headers.get("idempotency-key");
  if (!key) return json({ message: "Clave requerida." }, 400);
  const body: unknown = JSON.parse(typeof init.body === "string" ? init.body : "null"),
    parsed = conflictResolutionSchema.safeParse(body);
  if (!parsed.success)
    return json({ message: "Motivo, confirmación y resolución obligatorios." }, 400);
  const receiptKey = JSON.stringify([
      request.state.csrf,
      request.account.id,
      request.subject.userId,
      route,
      key,
    ]),
    input = JSON.stringify([body, headers.get("if-match")]);
  const prior = receipts.get(receiptKey);
  if (prior)
    return prior.input === input
      ? json(prior.value)
      : json({ message: "Clave usada con otros datos." }, 409);
  const packet = packages.get(demoOfflineKey(request, conflict.orderId));
  if (
    !packet ||
    conflict.state === "resolved" ||
    headers.get("if-match") !== `W/"${packet.order.rowVersion}"`
  )
    return json({ message: "La versión cambió." }, 409);
  let execution;
  try {
    execution = conflictExecution(
      { ...conflict, current: { execution: packet.execution } },
      parsed.data,
    );
  } catch {
    return json({ message: "Selecciona todos los campos." }, 400);
  }
  if (
    conflict.local.action === "close" &&
    !assessWorkOrderExecution(packet.order.definition, execution).complete
  )
    return json({ message: "Faltan requisitos de cierre." }, 409);
  packet.execution = execution;
  packet.order = {
    ...packet.order,
    rowVersion: packet.order.rowVersion + 1,
    state:
      conflict.local.action === "close"
        ? execution.result === "conforming"
          ? "completed"
          : execution.result === "observations"
            ? "with_observations"
            : "nonconforming"
        : "in_progress",
  };
  conflicts.set(request.state.csrf + ":" + resolveId, {
    ...conflict,
    state: "resolved",
    resolution: {
      actorId: request.subject.userId,
      reason: parsed.data.reason,
      strategy: parsed.data.strategy,
      orderVersion: packet.order.rowVersion,
      resolvedAt: new Date(request.now).toISOString(),
    },
  });
  demoReleasedLeases.add(packet.lease.id);
  receipts.set(receiptKey, { input, value: structuredClone(packet.order) });
  return json(packet.order);
}
