import { randomUUID } from "node:crypto";
import {
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
): Response {
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
        expiresAt: new Date(request.now + 72 * 3600_000).toISOString(),
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
    if (
      packet.lease.id !== data.leaseId ||
      packet.lease.deviceId !== data.deviceId ||
      packet.order.rowVersion !== data.expectedVersion ||
      demoReleasedLeases.has(packet.lease.id) ||
      Date.parse(packet.lease.expiresAt) <= request.now
    )
      return json({ status: "conflict", message: "La versión o dispositivo cambió." });
    if (data.id !== key || headers.get("if-match") !== `W/"${data.expectedVersion}"`)
      return json({ message: "Clave o versión inválida." }, 400);
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
    packet.order = { ...packet.order, state, rowVersion: packet.order.rowVersion + 1 };
    result = { status: "accepted", order: packet.order };
  } else return json({ message: "Operación demo no disponible." }, 404);
  receipts.set(receiptKey, { input: fingerprint, value: structuredClone(result) });
  return json(result);
}
