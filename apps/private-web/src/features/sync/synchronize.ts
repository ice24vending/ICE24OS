"use client";
import {
  offlinePhotoOperationSchema,
  offlineSessionSchema,
  offlineSyncOperationSchema,
  offlineSyncResultSchema,
  uploadSessionSchema,
  fileObjectSchema,
} from "@ice24/contracts";
import {
  readProtectedRecord,
  saveOfflineBundle,
  synchronizeNext,
  type OfflineOwner,
  type QueueResult,
  type RecordInput,
} from "@ice24/offline";
import { offlineDb, jsonBlob } from "./local-orders";
type Session = ReturnType<typeof offlineSessionSchema.parse>;
function form(session: Session, key: string, values: Record<string, string>) {
  const body = new FormData();
  body.set("csrfToken", session.csrfToken);
  body.set("key", key);
  for (const [name, value] of Object.entries(values)) body.set(name, value);
  return body;
}
async function send(session: Session, path: string, key: string, values: Record<string, string>) {
  return fetch(path, {
    method: "POST",
    headers: { "x-ice24-workspace-context": session.contextId },
    body: form(session, key, values),
    signal: AbortSignal.timeout(30_000),
  });
}
async function failure(response: Response): Promise<QueueResult> {
  const value: unknown = await response.json().catch(() => null);
  const message =
    value && typeof value === "object" && "message" in value && typeof value.message === "string"
      ? value.message
      : "No fue posible sincronizar.";
  return {
    status:
      response.status === 409
        ? "conflict"
        : response.status >= 500 || response.status === 429
          ? "retryable_error"
          : "permanent_error",
    message,
  };
}
export async function synchronizeLocal(owner: OfflineOwner): Promise<boolean> {
  // An online event alone does not prove connectivity or a current permission.
  const health = await fetch("/api/synchronization/health", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!health.ok)
    throw new Error("Reconecta e inicia sesión con permiso vigente para sincronizar.");
  const session = offlineSessionSchema.parse(await health.json());
  if (session.accountId !== owner.accountId || session.userId !== owner.userId)
    throw new Error("Vuelve al usuario y cuenta de esta descarga.");
  return synchronizeNext(
    offlineDb,
    owner,
    async (operation, payload, dependencies) => {
      if (operation.action === "work-order-photo") {
        const photo = offlinePhotoOperationSchema.parse(payload);
        const record = await offlineDb.operations.get(
          JSON.stringify([owner.accountId, owner.userId, operation.id]),
        );
        if (!record) return { status: "permanent_error", message: "No se encontró la foto local." };
        const checkpointId = `${operation.id}:upload`;
        const checkpoint = await readProtectedRecord(offlineDb, "drafts", owner, checkpointId);
        let fileId = checkpoint ? String(JSON.parse(await checkpoint.text()).fileId) : undefined;
        async function inspect(): Promise<QueueResult | undefined> {
          if (!fileId) return undefined;
          const response = await fetch(`/api/files/${fileId}`, {
            cache: "no-store",
            headers: { "x-ice24-workspace-context": session.contextId },
            signal: AbortSignal.timeout(10_000),
          });
          if (!response.ok) return failure(response);
          const file = fileObjectSchema.parse(await response.json());
          if (file.status === "available" && file.currentVersionId) {
            if (file.sha256 !== photo.sha256)
              return {
                status: "permanent_error",
                message: "La integridad de la foto no coincide. Conservamos el original.",
              };
            return {
              status: "accepted",
              value: { fileId: file.id, fileVersionId: file.currentVersionId },
            };
          }
          if (file.status === "rejected")
            return {
              status: "permanent_error",
              message: "La foto fue rechazada durante su verificación. Conservamos el original.",
            };
          if (file.status === "processing" || file.status === "quarantined")
            return {
              status: "retryable_error",
              message: "Foto recibida; falta la verificación antivirus.",
            };
          return undefined;
        }
        const existing = await inspect();
        if (existing) return existing;
        const blob = await readProtectedRecord(offlineDb, "evidence", owner, photo.localId);
        if (!blob)
          return {
            status: "permanent_error",
            message: "La foto ya no está disponible localmente.",
          };
        const authorized = await send(
          session,
          "/api/files/upload-sessions",
          `${operation.id}-upload`,
          {
            fileName: photo.fileName,
            mediaType: photo.mediaType,
            sizeBytes: String(blob.size),
            purpose: "equipment_evidence",
            resourceType: "machine",
            resourceId: photo.machineId,
          },
        );
        if (!authorized.ok) return failure(authorized);
        const upload = uploadSessionSchema.parse(await authorized.json());
        fileId = upload.fileId;
        const metadata: RecordInput = { ...record, id: checkpointId };
        await saveOfflineBundle(offlineDb, [
          { store: "drafts", input: metadata, payload: jsonBlob({ fileId }) },
        ]);
        const put = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: upload.requiredHeaders,
          body: blob,
          signal: AbortSignal.timeout(60_000),
        });
        if (!put.ok)
          return {
            status: "retryable_error",
            message: "La subida se interrumpió. La foto sigue guardada.",
          };
        const completed = await send(
          session,
          `/api/files/${fileId}/complete`,
          `${operation.id}-complete`,
          { uploadToken: upload.uploadToken, sha256: photo.sha256 },
        );
        if (!completed.ok) return failure(completed);
        return (
          (await inspect()) ?? {
            status: "retryable_error",
            message: "Esperando verificación de la foto.",
          }
        );
      }
      const data = offlineSyncOperationSchema.parse(payload);
      data.execution.evidence = data.execution.evidence.map((item) => {
        if (item.type !== "photo" || item.fileId !== item.fileVersionId) return item;
        const result = dependencies.get(item.fileId);
        if (
          !result ||
          typeof result !== "object" ||
          !("fileId" in result) ||
          !("fileVersionId" in result) ||
          typeof result.fileId !== "string" ||
          typeof result.fileVersionId !== "string"
        )
          throw new Error("Falta una foto verificada.");
        return { ...item, fileId: result.fileId, fileVersionId: result.fileVersionId };
      });
      const response = await send(session, "/api/synchronization/operations", operation.id, {
        data: JSON.stringify(data),
        version: String(data.expectedVersion),
      });
      if (!response.ok) return failure(response);
      const result = offlineSyncResultSchema.parse(await response.json());
      return result.status === "accepted" ? { status: "accepted", value: result.order } : result;
    },
    Date.now(),
    ["work-order-photo", "work-order-close"],
  );
}
