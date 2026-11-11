"use client";
import { useCallback, useEffect, useState } from "react";
import { Button, ButtonLink, Comparator, Dialog, SyncStatus, PageHeader } from "@ice24/ui";
import {
  conflictFields,
  synchronizationConflictSchema,
  type ConflictResolution,
  type SynchronizationConflict,
} from "@ice24/contracts";
import {
  discardQueuedOperation,
  retryQueuedOperation,
  type OfflineOwner,
  type PendingOperation,
} from "@ice24/offline";
import { useOnline } from "../account-shell/access-provider";
import { MaintenanceNavigation } from "../maintenance/maintenance-navigation";
import { readOfflineScope } from "./offline-scope";
import { verifyOfflineAccess } from "./lifecycle";
import { offlineDb } from "./local-orders";
import { synchronizeLocal } from "./synchronize";
import "./synchronization-center.css";
const labels: Record<(typeof conflictFields)[number], string> = {
  checklist: "Checklist",
  fields: "Lecturas y campos",
  diagnosis: "Diagnóstico",
  activitiesPerformed: "Actividades realizadas",
  parts: "Refacciones",
  tests: "Pruebas",
  recommendation: "Recomendación",
  evidence: "Evidencia",
  result: "Resultado",
  followup: "Seguimiento",
};
const localDate = (value: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
const text = (value: unknown): string =>
  value == null
    ? "Sin registro"
    : typeof value === "string"
      ? value || "Sin valor"
      : Array.isArray(value)
        ? value.map(text).join(" · ") || "Sin elementos"
        : typeof value === "object"
          ? Object.entries(value)
              .map(([key, v]) => `${key}: ${text(v)}`)
              .join("; ")
          : String(value);
export function ConflictComparison({
  conflict,
  canResolve,
  onResolve,
  busy = false,
}: {
  conflict: SynchronizationConflict;
  canResolve: boolean;
  onResolve: (value: ConflictResolution, reviewedVersion: number) => Promise<void>;
  busy?: boolean;
}) {
  const [strategy, setStrategy] = useState<ConflictResolution["strategy"] | "">("");
  const [reason, setReason] = useState("");
  const [choices, setChoices] = useState<
    Partial<Record<(typeof conflictFields)[number], "server" | "local">>
  >({});
  const [confirm, setConfirm] = useState(false);
  const [reviewedVersion, setReviewedVersion] = useState<number>();
  const [resolutionError, setResolutionError] = useState("");
  const server = conflict.current ?? conflict.server;
  const valid =
    !!strategy &&
    reason.trim().length >= 5 &&
    (strategy !== "combine" || conflictFields.every((field) => choices[field]));
  return (
    <section className="sync-center__conflict">
      <h2>Conflicto · {conflict.server.order.folio}</h2>
      <SyncStatus state={conflict.state === "resolved" ? "synced" : "conflict"} />
      <p>
        Detectado: {localDate(conflict.createdAt)} · Dispositivo: {conflict.deviceId}
      </p>
      {conflict.state === "resolved" && (
        <p>
          Resuelta: {conflict.resolution?.reason} · Versión {conflict.resolution?.orderVersion}
        </p>
      )}
      <Comparator
        title="Comparar versiones"
        before={{
          label: "Versión actual del servidor",
          meta: `Versión ${server.order.rowVersion}`,
        }}
        after={{
          label: "Versión del dispositivo",
          meta: `Versión de descarga ${conflict.local.expectedVersion} · ${conflict.actorId}`,
        }}
        fields={conflictFields.map((field) => ({
          id: field,
          label: labels[field],
          before: text(server.execution?.[field]),
          after: text(conflict.local.execution[field]),
        }))}
      />
      <details>
        <summary>Versiones originales conservadas</summary>
        <p>
          Servidor al detectar el conflicto: versión {conflict.server.order.rowVersion} ·{" "}
          {localDate(conflict.server.capturedAt)}
        </p>
        <Comparator
          title="Registro original del conflicto"
          before={{ label: "Servidor al detectar" }}
          after={{ label: "Dispositivo al enviar" }}
          fields={conflictFields.map((field) => ({
            id: field,
            label: labels[field],
            before: text(conflict.server.execution?.[field]),
            after: text(conflict.local.execution[field]),
          }))}
        />
      </details>
      {!canResolve && conflict.state !== "resolved" && (
        <p role="status">
          Modo consulta: solicita a un Dueño o Administrador de tu sucursal que revise este
          conflicto.
        </p>
      )}
      {canResolve && conflict.state !== "resolved" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setReviewedVersion(server.order.rowVersion);
            setConfirm(true);
          }}
          className="sync-center__resolution"
        >
          <label>
            Resolución
            <select
              value={strategy}
              required
              onChange={(event) => setStrategy(event.target.value as typeof strategy)}
            >
              <option value="">Elige cómo resolver</option>
              <option value="server" disabled={!server.execution}>
                Conservar versión del servidor
              </option>
              <option value="local">Usar versión del dispositivo</option>
              <option value="combine" disabled={!server.execution}>
                Crear corrección combinada
              </option>
            </select>
          </label>
          {strategy === "combine" && (
            <fieldset>
              <legend>Origen de cada campo</legend>
              {conflictFields.map((field) => (
                <label key={field}>
                  {labels[field]}
                  <select
                    required
                    value={choices[field] ?? ""}
                    onChange={(e) =>
                      setChoices({ ...choices, [field]: e.target.value as "server" | "local" })
                    }
                  >
                    <option value="">Elige una versión</option>
                    <option value="server">Servidor</option>
                    <option value="local">Dispositivo</option>
                  </select>
                </label>
              ))}
            </fieldset>
          )}
          <label>
            Motivo
            <textarea
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <p>
            Se creará una versión nueva. Las dos versiones originales permanecerán en el historial.{" "}
            {conflict.local.action === "close"
              ? "La orden se cerrará solo si cumple los requisitos de evidencia."
              : "Se guardará la ejecución elegida."}
          </p>
          <Button type="submit" icon="check-circle" disabled={!valid || busy}>
            Revisar resolución
          </Button>
        </form>
      )}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Confirmar resolución"
        description="Se aplicará la versión elegida y quedará registrado tu motivo. Ninguna versión original se eliminará."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={busy}>
              Volver
            </Button>
            <Button
              icon="check-circle"
              loading={busy}
              onClick={() => {
                if (strategy && reviewedVersion !== undefined)
                  void onResolve(
                    {
                      strategy,
                      reason,
                      confirmed: true,
                      ...(strategy === "combine"
                        ? { choices: choices as NonNullable<ConflictResolution["choices"]> }
                        : {}),
                    },
                    reviewedVersion,
                  )
                    .then(() => setConfirm(false))
                    .catch(() =>
                      setResolutionError(
                        "No se aplicó la resolución. Cierra este diálogo y actualiza la comparación antes de reintentar.",
                      ),
                    );
              }}
            >
              Confirmar resolución
            </Button>
          </>
        }
      >
        {resolutionError && <p role="alert">{resolutionError}</p>}
      </Dialog>
    </section>
  );
}
export function SynchronizationCenter({
  owner,
  contextId,
  csrfToken,
  canExecute,
  localOnly = false,
}: {
  owner: OfflineOwner;
  contextId: string;
  csrfToken: string;
  canExecute: boolean;
  localOnly?: boolean;
}) {
  const online = useOnline() && !localOnly;
  const [operations, setOperations] = useState<PendingOperation[]>([]),
    [conflicts, setConflicts] = useState<SynchronizationConflict[]>([]);
  const [selected, setSelected] = useState<string>(),
    [canResolve, setCanResolve] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [discard, setDiscard] = useState<string>();
  const [retry, setRetry] = useState<string>();
  const refresh = useCallback(async () => {
    if (!online) {
      setLoading(false);
      setMessage("");
      setCanResolve(false);
      return;
    }
    try {
      const response = await fetch("/api/synchronization/conflicts", { cache: "no-store" });
      if ([401, 403, 404].includes(response.status)) {
        setConflicts([]);
        setCanResolve(false);
        setSelected(undefined);
      }
      if (!response.ok)
        throw new Error(
          [401, 403, 404].includes(response.status)
            ? "No tienes permiso para consultar los conflictos en este contexto."
            : "El servidor no respondió. Reintenta cuando se restablezca el servicio.",
        );
      const data = (await response.json()) as { items: unknown[]; canResolve: boolean };
      const items = data.items.map((item) => synchronizationConflictSchema.parse(item));
      setConflicts(items);
      setCanResolve(data.canResolve);
      for (const item of items.filter(
        (c) => c.state === "resolved" && c.actorId === owner.userId,
      )) {
        const op = await offlineDb.pendingOperations.get(item.local.id);
        if (
          op &&
          op.accountId === owner.accountId &&
          op.userId === owner.userId &&
          op.state === "conflict"
        )
          await offlineDb.pendingOperations.put({ ...op, state: "resolved" });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Servicio no disponible.");
    } finally {
      setLoading(false);
    }
  }, [owner.accountId, owner.userId, online]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const update = () =>
      void offlineDb.pendingOperations
        .where("accountId")
        .equals(owner.accountId)
        .filter((op) => op.userId === owner.userId)
        .sortBy("createdAt")
        .then((items) =>
          setOperations(
            items.sort(
              (a, b) =>
                a.createdAt.localeCompare(b.createdAt) ||
                Number(b.action === "work-order-photo") - Number(a.action === "work-order-photo") ||
                a.id.localeCompare(b.id),
            ),
          ),
        )
        .catch(() => setMessage("Almacenamiento local no disponible."));
    update();
    const timer = setInterval(update, 1500);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, [owner.accountId, owner.userId, refresh]);
  async function act(action: () => Promise<unknown>) {
    if (!online) {
      setMessage("Necesitas conexión para realizar esta acción. Tus datos locales se conservan.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible completar la acción.");
    } finally {
      setBusy(false);
    }
  }
  const conflict = conflicts.find((item) => item.id === selected);
  return (
    <main className="sync-center" aria-busy={loading}>
      <header>
        <PageHeader
          title="Centro de sincronización"
          description="Revisa cambios de este dispositivo y conflictos de tu contexto."
        />
        <MaintenanceNavigation current="orders" />
        <div className="sync-center__actions">
          {online && (
            <Button
              variant="secondary"
              icon="sync"
              onClick={() => void refresh()}
              disabled={busy || !online}
              disabledReason={
                !online ? "Conéctate para enviar cambios o consultar el servidor." : undefined
              }
            >
              Actualizar
            </Button>
          )}
        </div>
      </header>
      {!online && (
        <p role="status">
          Sin conexión · Solo consulta de la cola local. Los cambios y conflictos del servidor se
          comprobarán al reconectar.
        </p>
      )}
      {!online && (
        <Button
          icon="sync"
          disabled
          disabledReason="Necesitas conexión para sincronizar; tus cambios permanecen en este dispositivo."
        >
          Sincronizar
        </Button>
      )}
      {online && (
        <p>
          Un Dueño o Administrador de sucursal puede resolver conflictos indicando un motivo; las
          versiones se conservan.
        </p>
      )}
      {message && <p role="alert">{message}</p>}
      {loading && <p role="status">Consultando sincronización…</p>}
      <section aria-label="Operaciones locales">
        <h2>En este dispositivo</h2>
        {!operations.length && (
          <p>No hay operaciones guardadas en este dispositivo para tu cuenta.</p>
        )}
        {operations.map((op) => (
          <article key={op.id} className="sync-center__operation">
            <h3>{op.action === "work-order-photo" ? "Foto pendiente" : "Ejecución de orden"}</h3>
            <p>
              {localDate(op.createdAt)} · Intentos: {op.attempts ?? 0} · Archivos vinculados:{" "}
              {op.dependencies?.length ?? (op.action === "work-order-photo" ? 1 : 0)}
            </p>
            <SyncStatus
              state={
                op.state === "loaded" || op.state === "resolved"
                  ? "synced"
                  : op.state === "synchronizing"
                    ? "syncing"
                    : op.state === "failed"
                      ? "error"
                      : op.state === "conflict"
                        ? "conflict"
                        : "pending"
              }
            />
            <p>{op.state === "resolved" ? (op.error ?? "Resuelta") : op.error}</p>
            <div className="sync-center__actions">
              {op.href && (
                <ButtonLink href={op.href} variant="secondary" icon="tool">
                  Abrir orden
                </ButtonLink>
              )}
              {canExecute && op.state === "failed" && (
                <Button
                  variant="secondary"
                  icon="sync"
                  disabled={busy || !online}
                  disabledReason={
                    !online ? "Conéctate para enviar cambios o consultar el servidor." : undefined
                  }
                  onClick={() => setRetry(op.id)}
                >
                  Reintentar
                </Button>
              )}
              {!["loaded", "resolved", "synchronizing"].includes(op.state) && (
                <Button
                  variant="tertiary"
                  icon="close"
                  disabled={busy || !online}
                  disabledReason={
                    !online ? "Conéctate para enviar cambios o consultar el servidor." : undefined
                  }
                  onClick={() => setDiscard(op.id)}
                >
                  Descartar
                </Button>
              )}
            </div>
          </article>
        ))}
      </section>
      {online && (
        <section aria-label="Conflictos del contexto">
          <h2>Conflictos del contexto</h2>
          {!loading && !conflicts.length && <p>No hay conflictos registrados en tu contexto.</p>}
          {conflicts.map((item) => (
            <Button
              key={item.id}
              variant="secondary"
              icon="conflict"
              onClick={() => setSelected(item.id)}
            >
              {item.server.order.folio} ·{" "}
              {item.state === "resolved" ? "Resuelta" : "Revisar conflicto"}
            </Button>
          ))}
        </section>
      )}
      {online && conflict && (
        <ConflictComparison
          key={conflict.id}
          conflict={conflict}
          canResolve={canResolve}
          busy={busy}
          onResolve={async (value, reviewedVersion) => {
            setBusy(true);
            setMessage("");
            try {
              const body = new FormData();
              body.set("csrfToken", csrfToken);
              body.set("key", crypto.randomUUID());
              body.set("version", String(reviewedVersion));
              body.set("data", JSON.stringify(value));
              const response = await fetch(
                `/api/synchronization/conflicts/${conflict.id}/resolve`,
                { method: "POST", headers: { "x-ice24-workspace-context": contextId }, body },
              );
              if (!response.ok)
                throw new Error(
                  "No se pudo resolver. Actualiza la comparación antes de confirmar de nuevo.",
                );
              await refresh();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "No se pudo resolver.");
              throw error;
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      <Dialog
        open={!!retry && online}
        onClose={() => setRetry(undefined)}
        title="Reintentar sincronización"
        description="Se reenviará la misma operación y se conservarán tus datos locales. Un conflicto seguirá necesitando revisión."
        footer={
          <>
            <Button
              variant="secondary"
              icon="close"
              onClick={() => setRetry(undefined)}
              disabled={busy || !online}
              disabledReason={
                !online ? "Conéctate para enviar cambios o consultar el servidor." : undefined
              }
            >
              Cancelar
            </Button>
            <Button
              icon="sync"
              loading={busy}
              onClick={() =>
                void act(async () => {
                  if (retry) {
                    await retryQueuedOperation(offlineDb, owner, retry);
                    await synchronizeLocal(owner);
                  }
                  setRetry(undefined);
                })
              }
            >
              Confirmar reintento
            </Button>
          </>
        }
      />
      <Dialog
        open={!!discard && online}
        onClose={() => setDiscard(undefined)}
        title="Descartar operación local"
        description="Esta operación dejará de enviarse. No elimina las versiones ni conflictos que ya conserva el servidor."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscard(undefined)}>
              Conservar
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                void act(async () => {
                  if (discard) await discardQueuedOperation(offlineDb, owner, discard);
                  setDiscard(undefined);
                })
              }
            >
              Confirmar descarte
            </Button>
          </>
        }
      />
    </main>
  );
}

/** Generic public shell: scope is a hint, lifecycle and protected storage still enforce validity. */
export function LocalSynchronizationCenter() {
  const [owner, setOwner] = useState<OfflineOwner>();
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void (async () => {
      const identity = readOfflineScope();
      await verifyOfflineAccess(identity);
      if (live) setOwner(identity);
    })().catch(() => {
      if (live) setError("Reconecta e inicia sesión para verificar tu acceso a la cola local.");
    });
    return () => {
      live = false;
    };
  }, []);
  return owner ? (
    <SynchronizationCenter
      owner={owner}
      contextId="offline"
      csrfToken=""
      canExecute={false}
      localOnly
    />
  ) : (
    <main className="sync-center">
      <PageHeader title="Centro de sincronización" />
      <MaintenanceNavigation current="orders" />
      <p role="status">{error || "Consultando la cola local…"}</p>
    </main>
  );
}
