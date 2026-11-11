import type { OfflineRoutePlan } from "@ice24/contracts";
import { OFFLINE_LIMITS, OfflineStorageError } from "@ice24/offline";

export type RouteItem = OfflineRoutePlan["items"][number];
export type RouteDownloadResult = {
  id: string;
  status: "available" | "downloaded" | "excluded" | "failed";
  message: string;
};
export interface RouteCapacity {
  deviceBytes: number;
  orderBytes: Record<string, number>;
  browserFreeBytes?: number | undefined;
}
export function routeExclusion(item: RouteItem, usage: RouteCapacity): string | undefined {
  if (item.reservedElsewhere) return "Reservada en otro dispositivo";
  if ((usage.orderBytes[item.order.id] ?? 0) + item.estimatedBytes > OFFLINE_LIMITS.orderBytes)
    return "Fuera de la descarga: supera los 50 MB por orden.";
  if (
    usage.deviceBytes + item.estimatedBytes > OFFLINE_LIMITS.deviceBytes ||
    (usage.browserFreeBytes !== undefined && item.estimatedBytes * 3 > usage.browserFreeBytes)
  )
    return "Fuera de la descarga: no hay espacio disponible en el dispositivo.";
  return undefined;
}
/** Preview the exact set the user will authorize; quota is checked again for each write. */
export function planRouteDownload(
  items: readonly RouteItem[],
  capacity: RouteCapacity,
  availableIds: readonly string[] = [],
) {
  const usage = { ...capacity, orderBytes: { ...capacity.orderBytes } };
  const selected: RouteItem[] = [],
    excluded: { item: RouteItem; reason: string }[] = [],
    reserved: RouteItem[] = [];
  for (const item of items) {
    if (item.reservedElsewhere) {
      reserved.push(item);
      continue;
    }
    if (availableIds.includes(item.order.id)) continue;
    const reason = routeExclusion(item, usage);
    if (reason) {
      excluded.push({ item, reason });
      continue;
    }
    selected.push(item);
    usage.deviceBytes += item.estimatedBytes;
    usage.orderBytes[item.order.id] = (usage.orderBytes[item.order.id] ?? 0) + item.estimatedBytes;
    if (usage.browserFreeBytes !== undefined) usage.browserFreeBytes -= item.estimatedBytes;
  }
  return { selected, excluded, reserved };
}
/** Preserve server order (in progress, deadline, priority, id), including quota decisions. */
export async function downloadRoute(
  items: readonly RouteItem[],
  dependencies: {
    available: (item: RouteItem) => Promise<boolean>;
    capacity: () => Promise<RouteCapacity>;
    download: (item: RouteItem) => Promise<unknown>;
    progress: (result: RouteDownloadResult, completed: number) => void;
    signal?: AbortSignal;
  },
) {
  const results: RouteDownloadResult[] = [];
  for (const item of items) {
    if (dependencies.signal?.aborted) break;
    let result: RouteDownloadResult;
    try {
      if (await dependencies.available(item))
        result = {
          id: item.order.id,
          status: "available",
          message: "Ya disponible en este dispositivo; se conserva el trabajo local.",
        };
      else {
        const excluded = routeExclusion(item, await dependencies.capacity());
        if (excluded) result = { id: item.order.id, status: "excluded", message: excluded };
        else {
          dependencies.signal?.throwIfAborted();
          await dependencies.download(item);
          result = { id: item.order.id, status: "downloaded", message: "Disponible sin conexión." };
        }
      }
    } catch (error) {
      if (dependencies.signal?.aborted) break;
      result = {
        id: item.order.id,
        status: "failed",
        message:
          error instanceof OfflineStorageError
            ? {
                storage_full:
                  "No hay espacio disponible. Revisa el almacenamiento y reintenta esta orden.",
                storage_unavailable:
                  "El almacenamiento local no está disponible. Revisa los permisos del navegador.",
                expired:
                  "La descarga anterior venció. Revisa su sincronización antes de volver a descargar.",
                corrupt:
                  "No se pudo leer la descarga anterior. Revisa la sincronización; se conserva el trabajo local.",
              }[error.code]
            : error instanceof Error
              ? error.message
              : "No se descargó. Reintenta esta orden.",
      };
    }
    results.push(result);
    dependencies.progress(result, results.length);
  }
  return results;
}
