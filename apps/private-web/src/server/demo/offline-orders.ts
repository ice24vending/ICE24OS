import { demoConflictResponse, provokeDemoConflict, recordDemoConflict } from "./conflicts";
import { randomUUID } from "node:crypto";
import {
  offlineRoutePlanSchema,
  offlineRouteQuerySchema,
  offlinePurgeReportSchema,
  offlineDownloadSchema,
  offlineOrderPackageSchema,
  offlineSyncOperationSchema,
  offlineReleaseSchema,
} from "@ice24/contracts";
import { assessWorkOrderExecution } from "@ice24/domain";
import type { DemoRequest } from "./api";
import { demoWorkOrders } from "./work-orders";
import {
  demoOfflinePackages as packages,
  demoOfflineReceipts as receipts,
  demoOfflineKey,
  demoReleasedLeases,
} from "./offline-state";
// Only fictitious demo data. Bounded and discarded when the demo server restarts.
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "no-store" } });
export function demoOfflineResponse(
  request: DemoRequest,
  route: string,
  init: RequestInit,
  params = new URLSearchParams(),
): Response {
  if (route === "synchronization/route-plan") {
    const parsed = offlineRouteQuerySchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return json({ message: "Dispositivo inválido." }, 400);
    if (!request.authorize("maintenance.orders-execute", "WRITE").allowed)
      return json({ message: "No puedes descargar órdenes en este contexto." }, 403);
    const day = (date: string) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(date));
    const today = day(new Date(request.now).toISOString());
    const items = demoWorkOrders(request)
      .filter(
        (order) =>
          order.assigneeId === request.subject.userId &&
          ["scheduled", "upcoming", "overdue", "in_progress"].includes(order.state) &&
          (order.state === "in_progress" || (order.dueAt && day(order.dueAt) <= today)),
      )
      .sort(
        // All existing fictitious source tickets have the same high priority.
        (a, b) =>
          Number(b.state === "in_progress") - Number(a.state === "in_progress") ||
          (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
          a.id.localeCompare(b.id),
      )
      .map((order) => ({
        order:
          request.state.maintenance === "route-stale"
            ? { ...order, rowVersion: order.rowVersion + 1 }
            : order,
        timeZone: "America/Mexico_City",
        reservedElsewhere: (() => {
          const packet = packages.get(demoOfflineKey(request, order.id));
          return (
            !!packet &&
            !demoReleasedLeases.has(packet.lease.id) &&
            Date.parse(packet.lease.expiresAt) > request.now &&
            (packet.lease.userId !== request.subject.userId ||
              packet.lease.deviceId !== parsed.data.deviceId)
          );
        })(),
        estimatedBytes: Buffer.byteLength(JSON.stringify({ order, execution: null })) + 2048,
      }));
    return json(
      offlineRoutePlanSchema.parse({
        accountId: request.account.id,
        userId: request.subject.userId,
        asOf: new Date(request.now).toISOString(),
        items,
      }),
    );
  }
  if (route === "synchronization/access") {
    if (
      request.state.maintenance === "deactivated" ||
      !request.authorize("maintenance.orders-read", "READ").allowed
    )
      return json({ message: "Acceso revocado." }, 403);
    const visible = demoWorkOrders(request),
      permitted = request.authorize("maintenance.orders-execute", "READ").allowed;
    return json({
      accountId: request.account.id,
      userId: request.subject.userId,
      serverNow: new Date(request.now).toISOString(),
      orderIds: permitted
        ? [...packages.entries()]
            .filter(
              ([key, p]) =>
                key === demoOfflineKey(request, p.order.id) &&
                p.userId === request.subject.userId &&
                Date.parse(p.lease.expiresAt) > request.now &&
                visible.some((o) => o.id === p.order.id),
            )
            .map(([, p]) => p.order.id)
        : [],
    });
  }
  if (route === "synchronization/purge-receipts") {
    const parsed = offlinePurgeReportSchema.safeParse(
      JSON.parse(typeof init.body === "string" ? init.body : "null"),
    );
    if (!parsed.success) return json({ message: "Recibo inválido." }, 400);
    const owned = [...packages.entries()]
      .filter(
        ([key, p]) =>
          key === demoOfflineKey(request, p.order.id) && p.userId === request.subject.userId,
      )
      .map(([, p]) => p.lease.id);
    if (parsed.data.leaseIds.some((id) => !owned.includes(id)))
      return json({ message: "Descarga ajena." }, 403);
    const receiptKey = JSON.stringify([
      request.state.csrf,
      request.subject.userId,
      "purge",
      parsed.data.id,
    ]);
    const input = JSON.stringify(parsed.data),
      prior = receipts.get(receiptKey);
    if (prior && prior.input !== input) return json({ message: "Recibo ya utilizado." }, 409);
    receipts.set(receiptKey, { input, value: { recorded: true } });
    return json({ recorded: true });
  }
  const conflictResponse = demoConflictResponse(request, route, init);
  if (conflictResponse) return conflictResponse;
  const releaseId = /^synchronization\/orders\/([^/]+)\/release$/.exec(route)?.[1];
  if (
    !request.authorize(
      releaseId ? "maintenance.orders-assign" : "maintenance.orders-execute",
      "WRITE",
    ).allowed
  )
    return json({ message: "Sin permiso para trabajo offline." }, 403);
  const body: unknown = JSON.parse(typeof init.body === "string" ? init.body : "null");
  const headers = new Headers(init.headers),
    key = headers.get("idempotency-key");
  if (!key) return json({ message: "Falta clave idempotente." }, 400);
  const receiptKey = JSON.stringify([
    request.state.csrf,
    request.account.id,
    request.subject.userId,
    route,
    key,
  ]);
  const fingerprint = JSON.stringify([body, headers.get("if-match")]);
  const prior = receipts.get(receiptKey);
  if (prior)
    return prior.input === fingerprint
      ? json(prior.value)
      : json({ message: "Clave usada con otros datos." }, 409);
  if (packages.size > 500) {
    packages.clear();
    receipts.clear();
    demoReleasedLeases.clear();
  }
  const id = /^synchronization\/orders\/([^/]+)\/download$/.exec(route)?.[1];
  let result: unknown;
  if (releaseId) {
    const parsed = offlineReleaseSchema.safeParse(body);
    const packet = packages.get(demoOfflineKey(request, releaseId));
    if (!parsed.success) return json({ message: "Motivo obligatorio." }, 400);
    if (!packet || !demoWorkOrders(request).some((o) => o.id === releaseId))
      return json({ message: "Orden fuera del contexto." }, 404);
    if (headers.get("if-match") !== `W/"${packet.order.rowVersion}"`)
      return json({ message: "La versión cambió." }, 409);
    demoReleasedLeases.add(packet.lease.id);
    result = packet.order;
  } else if (id) {
    const parsed = offlineDownloadSchema.safeParse(body);
    if (!parsed.success) return json({ message: "Datos inválidos." }, 400);
    const order = demoWorkOrders(request).find((o) => o.id === id);
    if (!order) return json({ message: "Orden fuera de tu contexto." }, 404);
    if (order.assigneeId !== request.subject.userId)
      return json({ message: "Solo el técnico asignado puede descargar." }, 403);
    if (headers.get("if-match") !== `W/"${order.rowVersion}"`)
      return json({ message: "La versión cambió." }, 409);
    const existing = packages.get(demoOfflineKey(request, id));
    if (
      existing &&
      !demoReleasedLeases.has(existing.lease.id) &&
      Date.parse(existing.lease.expiresAt) > request.now
    )
      return json({ message: "Orden ya descargada. Usa el mismo dispositivo." }, 409);
    if (!["scheduled", "upcoming", "overdue", "in_progress"].includes(order.state))
      return json({ message: "La orden no admite descarga." }, 409);
    const packet = offlineOrderPackageSchema.parse({
      formatVersion: 1,
      accountId: request.account.id,
      userId: request.subject.userId,
      order: {
        ...order,
        state: "in_progress",
        rowVersion: order.state === "in_progress" ? order.rowVersion : order.rowVersion + 1,
      },
      execution: null,
      lease: {
        id: randomUUID(),
        deviceId: parsed.data.deviceId,
        userId: request.subject.userId,
        downloadedAt: new Date(request.now).toISOString(),
        expiresAt: new Date(
          request.now + (request.state.maintenance === "lease-expired" ? 30_000 : 72 * 3600_000),
        ).toISOString(),
      },
      policy: "F7-D03-proposal",
    });
    packages.set(demoOfflineKey(request, id), packet);
    result = packet;
  } else if (route === "synchronization/operations") {
    const parsed = offlineSyncOperationSchema.safeParse(body);
    if (!parsed.success) return json({ message: "Datos inválidos." }, 400);
    const data = parsed.data,
      packet = packages.get(demoOfflineKey(request, data.orderId));
    if (!packet || packet.userId !== request.subject.userId)
      return json({ message: "Orden no disponible." }, 404);
    if (data.id !== key || headers.get("if-match") !== `W/"${data.expectedVersion}"`)
      return json({ message: "Clave o versión inválida." }, 400);
    if (packet.lease.id !== data.leaseId || packet.lease.deviceId !== data.deviceId)
      return json({ message: "Descarga ajena al dispositivo." }, 403);
    provokeDemoConflict(request, packet, data);
    if (
      packet.order.rowVersion !== data.expectedVersion ||
      demoReleasedLeases.has(packet.lease.id) ||
      Date.parse(packet.lease.expiresAt) <= request.now
    ) {
      const value = recordDemoConflict(request, packet, data);
      receipts.set(receiptKey, { input: fingerprint, value });
      return json(value);
    }
    const assessment = assessWorkOrderExecution(packet.order.definition, data.execution);
    if (data.action === "close" && !assessment.complete)
      return json({ status: "permanent_error", message: "Faltan requisitos para cerrar." });
    const state =
      data.action === "save"
        ? "in_progress"
        : data.execution.result === "conforming"
          ? "completed"
          : data.execution.result === "observations"
            ? "with_observations"
            : "nonconforming";
    packet.execution = structuredClone(data.execution);
    packet.order = { ...packet.order, state, rowVersion: packet.order.rowVersion + 1 };
    result = { status: "accepted", order: packet.order };
  } else return json({ message: "Operación demo no disponible." }, 404);
  receipts.set(receiptKey, { input: fingerprint, value: structuredClone(result) });
  return json(result);
}
