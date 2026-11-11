import { readOfflinePresentation, PRESENTATION_KEY } from "../navigation/offline-presentation";
import { LocalSynchronizationCenter } from "./synchronization-center";
import { OFFLINE_TAB_NOTICE, readOfflineScope } from "./offline-scope";
import { DownloadedOrders } from "./downloaded-orders";
import { verifyOfflineAccess, watchOfflineAccess, PURGED_EVENT } from "./lifecycle";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, ButtonLink, PhotoCapture, PageHeader } from "@ice24/ui";
import { OfflineStatus } from "./offline-status";
import {
  workOrderExecutionSchema,
  type WorkOrderExecution,
  type OfflineOrderPackage,
  type ExecutionEvidence,
} from "@ice24/contracts";
import {
  readProtectedRecord,
  saveOfflineBundle,
  watchPendingOperations,
  retryQueuedOperation,
  OfflineStorageError,
  type PendingOperation,
  type OfflineOwner,
} from "@ice24/offline";
import {
  offlineDb,
  readLocalOrder,
  saveLocalDraft,
  queueLocalClosure,
  localMetadata,
  jsonBlob,
} from "./local-orders";
import { synchronizeLocal } from "./synchronize";
import { ExecutionScreen } from "../work-orders/execution-screen";
import { useUnsavedChanges } from "../context/unsaved-changes";
import "@ice24/ui/styles.css";
import "../work-orders/execution.css";
import "../maintenance/tickets.css";
import "./offline-work.css";
const empty: WorkOrderExecution = {
  checklist: [],
  fields: {},
  diagnosis: "",
  activitiesPerformed: "",
  parts: [],
  tests: "",
  recommendation: "",
  evidence: [],
  result: "conforming",
  followup: "",
};
function LocalPhoto({
  packet,
  code,
  label,
  onVerified,
  evidence = [],
}: {
  evidence?: ExecutionEvidence[];
  packet: OfflineOrderPackage;
  code: string;
  label: string;
  onVerified: (e: ExecutionEvidence) => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const photos = evidence.filter((e) => e.type === "photo" && e.requirementCode === code);
  const minimum =
    packet.order.definition.evidenceRules.requirements?.find((r) => r.code === code)?.minimum ??
    packet.order.definition.evidenceRules.minimumFiles;
  async function persist(original: File, prepared: File) {
    setBusy(true);
    setMessage("Guardando foto en este dispositivo…");
    try {
      const storage = await navigator.storage.estimate();
      // Reserve both the original and its compressed derivative; IndexedDB still enforces
      // the actual quota atomically if another tab consumes space after this estimate.
      if (
        storage.quota !== undefined &&
        storage.quota - (storage.usage ?? 0) < original.size + prepared.size + 4096
      )
        throw new OfflineStorageError("storage_full");
      const id = crypto.randomUUID();
      const sha256 = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", await prepared.arrayBuffer())),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
      await saveOfflineBundle(
        offlineDb,
        [
          { store: "evidence", input: localMetadata(packet, id), payload: prepared },
          { store: "evidence", input: localMetadata(packet, `${id}:original`), payload: original },
          {
            store: "operations",
            input: localMetadata(packet, id),
            payload: jsonBlob({
              localId: id,
              machineId: packet.order.machineId,
              fileName: prepared.name,
              mediaType: prepared.type,
              sha256,
            }),
          },
        ],
        {
          id,
          accountId: packet.accountId,
          userId: packet.userId,
          action: "work-order-photo",
          createdAt: new Date().toISOString(),
          state: "pending",
          href: `/offline-work.html?order=${packet.order.id}`,
        },
      );
      const evidence = {
        type: "photo" as const,
        requirementCode: code,
        fileId: id,
        fileVersionId: id,
      };
      onVerified(evidence);
      setMessage("Foto y original guardados en este dispositivo. Pendiente de subir y verificar.");
    } catch {
      setMessage(
        "No fue posible guardar la foto. Comprueba el espacio disponible e inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <p aria-live="polite">
        {photos.length} de {minimum} fotos
      </p>
      <div className="offline-work__photos">
        {photos.map(
          (e) =>
            e.type === "photo" && (
              <LocalThumbnail key={e.fileId} owner={packet} id={e.fileId} label={label} />
            ),
        )}
      </div>
      <PhotoCapture
        key={photos.map((e) => (e.type === "photo" ? e.fileId : "")).join(":")}
        label={label}
        disabled={busy}
        onError={setMessage}
        onPrepared={(original, prepared) => void persist(original, prepared)}
      />
      <p role="status">{message}</p>
    </section>
  );
}
function LocalThumbnail({ owner, id, label }: { owner: OfflineOwner; id: string; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    void readProtectedRecord(
      offlineDb,
      "evidence",
      { accountId: owner.accountId, userId: owner.userId },
      id,
    )
      .then(async (blob) => {
        if (!blob || !active) return;
        const bitmap = await createImageBitmap(blob);
        if (active && canvas.current) {
          canvas.current.width = 120;
          canvas.current.height = Math.round((120 * bitmap.height) / bitmap.width);
          canvas.current
            .getContext("2d")
            ?.drawImage(bitmap, 0, 0, canvas.current.width, canvas.current.height);
        }
        bitmap.close();
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [owner.accountId, owner.userId, id]);
  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={`Foto guardada: ${label}`}
      style={{ maxWidth: "100%" }}
    />
  );
}
function OfflineEditor({
  packet,
  initial,
}: {
  packet: OfflineOrderPackage;
  initial: WorkOrderExecution;
}) {
  const [mode, setMode] = useState<"execute" | "close">("execute"),
    [message, setMessage] = useState("Guardado en este dispositivo"),
    [saving, setSaving] = useState(false);
  const [operations, setOperations] = useState<PendingOperation[]>([]),
    [online, setOnline] = useState(navigator.onLine),
    [expired, setExpired] = useState(false),
    [finished, setFinished] = useState(false),
    [saveError, setSaveError] = useState<false | "storage_full" | "storage_unavailable">(false);
  const writes = useRef(Promise.resolve());
  const revision = useRef(0);
  useUnsavedChanges(Boolean(saving || saveError));
  useEffect(() => {
    if (!saving && !saveError) return;
    const preventLoss = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [saving, saveError]);
  const owner = { accountId: packet.accountId, userId: packet.userId };
  useEffect(
    () =>
      watchPendingOperations(
        offlineDb,
        packet.accountId,
        setOperations,
        () => setMessage("Almacenamiento no disponible."),
        packet.userId,
      ),
    [packet.accountId, packet.userId],
  );
  useEffect(() => {
    let stopped = false,
      running = false;
    const tick = async () => {
      if (stopped) return;
      setOnline(navigator.onLine);
      setExpired(Date.now() >= localMetadata(packet).expiresAt);
      const closed = await offlineDb.pendingOperations
        .where("accountId")
        .equals(packet.accountId)
        .filter(
          (op) =>
            op.userId === packet.userId &&
            op.action === "work-order-close" &&
            op.state === "loaded" &&
            op.expectedVersion === packet.order.rowVersion &&
            op.href === `/offline-work.html?order=${packet.order.id}`,
        )
        .count();
      if (!stopped) setFinished(closed > 0);
      if (!navigator.onLine || running) return;
      running = true;
      try {
        for (let i = 0; i < 10 && !stopped; i++)
          if (!(await synchronizeLocal({ accountId: packet.accountId, userId: packet.userId })))
            break;
      } catch (error) {
        if (!stopped) setOnline(false);
        if (!stopped)
          setMessage(
            error instanceof Error
              ? "No fue posible conectar con el servidor. Tus cambios siguen guardados en este dispositivo."
              : "No fue posible conectar; los datos siguen guardados.",
          );
      } finally {
        running = false;
      }
    };
    const timer = window.setInterval(() => void tick(), 10_000);
    window.addEventListener("online", tick);
    window.addEventListener("offline", tick);
    void tick();
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("online", tick);
      window.removeEventListener("offline", tick);
    };
  }, [packet]);
  const closing =
    finished ||
    operations.some(
      (op) =>
        op.action === "work-order-close" &&
        op.href === `/offline-work.html?order=${packet.order.id}`,
    );
  function save(data: WorkOrderExecution) {
    const current = ++revision.current;
    setSaving(true);
    setMessage("Guardando en este dispositivo…");
    writes.current = writes.current.catch(() => undefined).then(() => saveLocalDraft(packet, data));
    void writes.current.then(
      () => {
        if (revision.current === current) {
          setSaving(false);
          setSaveError(false);
          setMessage("Guardado en este dispositivo");
        }
      },
      (cause: unknown) => {
        if (revision.current === current) {
          setSaving(false);
          const full = cause instanceof OfflineStorageError && cause.code === "storage_full";
          setSaveError(full ? "storage_full" : "storage_unavailable");
          setMessage(
            full
              ? "No se guardó el último cambio. Libera espacio antes de cerrar esta página."
              : "Almacenamiento no disponible. No cierres esta página hasta recuperar el guardado.",
          );
        }
      },
    );
  }
  return (
    <div className="offline-work">
      <p role="note">{OFFLINE_TAB_NOTICE}</p>
      <nav
        className="offline-work__actions offline-work__navigation"
        aria-label="Navegación de la orden descargada"
      >
        <ButtonLink icon="chevron-left" href="/maintenance/work-orders" variant="secondary">
          Volver a las órdenes
        </ButtonLink>
        <ButtonLink icon="sync" href="/maintenance/synchronization" variant="secondary">
          Centro de sincronización
        </ButtonLink>
      </nav>
      <header>
        <h2>Trabajo en campo</h2>
        <p>
          {packet.order.folio} · {packet.order.machineCode} ·{" "}
          {online ? "Con conexión" : "Sin conexión"}
        </p>
        <OfflineStatus
          state={
            saveError
              ? saveError
              : !online
                ? "offline"
                : operations.some((op) => op.state === "conflict")
                  ? "conflict"
                  : operations.some((op) => op.state === "failed")
                    ? "error"
                    : operations.some((op) => op.state === "synchronizing")
                      ? "syncing"
                      : operations.length
                        ? "pending"
                        : finished
                          ? "synced"
                          : "saved_locally"
          }
          pending={operations.length}
          message={message}
        />
        {finished && (
          <p role="status">Cierre sincronizado. El resultado quedó registrado en el servidor.</p>
        )}
        {expired && (
          <p role="alert">
            La descarga venció. Reconecta y solicita revisión; no se enviarán cambios
            automáticamente.
          </p>
        )}
        <Button
          icon="refresh"
          variant="secondary"
          disabled={!online || expired}
          onClick={() =>
            void synchronizeLocal(owner).catch(() =>
              setMessage("No se pudo sincronizar. Conservamos tus datos."),
            )
          }
        >
          Sincronizar ahora
        </Button>
      </header>
      <section aria-label="Pendientes de esta cuenta">
        <h2>Sincronización</h2>
        {operations.map((op) => (
          <article key={op.id}>
            <p>
              {op.action === "work-order-photo" ? "Foto" : "Cierre de orden"} ·{" "}
              {
                {
                  pending: "Pendiente",
                  synchronizing: "Sincronizando",
                  loaded: "Cargada",
                  failed: "Error",
                  conflict: "Conflicto",
                  resolved: "Resuelta",
                }[op.state]
              }{" "}
              · Intentos: {op.attempts ?? 0}
            </p>
            {op.error && <p>{op.error}</p>}
            {op.state === "failed" && (
              <Button
                icon="refresh"
                variant="secondary"
                disabled={!online}
                onClick={() => void retryQueuedOperation(offlineDb, owner, op.id)}
              >
                Reintentar
              </Button>
            )}
          </article>
        ))}
      </section>
      {mode === "close" && (
        <Button
          icon="edit"
          variant="secondary"
          disabled={closing}
          onClick={() => setMode("execute")}
        >
          Volver a editar
        </Button>
      )}
      <ExecutionScreen
        order={packet.order}
        contextId="offline"
        csrfToken=""
        mode={mode}
        detail={{
          revisions: [
            {
              id: packet.lease.id,
              version: 1,
              kind: "draft",
              actorId: packet.userId,
              createdAt: packet.lease.downloadedAt,
              reason: "Borrador local",
              execution: initial,
            },
          ],
          reviews: [],
          missing: [],
          outOfRange: [],
          canExecute: true,
          canReview: false,
          canRequestCorrection: false,
          canReopen: false,
        }}
        local={{
          blocked: expired || closing,
          onChange: save,
          onReview: () => setMode("close"),
          onEditField: (field) => {
            setMode("execute");
            requestAnimationFrame(() => {
              const target = document.getElementById(field);
              if (!target) return;
              const control =
                target.querySelector<HTMLElement>("input, textarea, select, button") ?? target;
              if (!control.matches("input, textarea, select, button, a")) control.tabIndex = -1;
              control.focus();
              control.scrollIntoView({ block: "center", behavior: "auto" });
            });
          },
          onClose: async (data) => {
            await writes.current;
            await queueLocalClosure(packet, data);
            setMessage("Cierre pendiente de sincronizar.");
          },
          renderPhoto: (code, label, onVerified, evidence) => (
            <LocalPhoto
              packet={packet}
              code={code}
              label={label}
              onVerified={onVerified}
              evidence={evidence}
            />
          ),
        }}
      />
    </div>
  );
}
function OfflineApp() {
  const [loaded, setLoaded] = useState<{
      packet: OfflineOrderPackage;
      initial: WorkOrderExecution;
    }>(),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void (async () => {
      const owner = readOfflineScope();
      const id =
        new URL(location.href).searchParams.get("order") ??
        /^\/maintenance\/work-orders\/([0-9a-f-]{36})(?:\/execute)?$/.exec(location.pathname)?.[1];
      if (!id) return;
      await verifyOfflineAccess(owner);
      const packet = await readLocalOrder(owner, id);
      if (!packet) throw new Error("No hay una descarga de esta orden para tu usuario y cuenta.");
      const draft = await readProtectedRecord(offlineDb, "drafts", owner, id);
      const initial = draft
        ? workOrderExecutionSchema.parse(JSON.parse(await draft.text()))
        : (packet.execution ?? empty);
      if (live) setLoaded({ packet, initial });
    })().catch((cause) => {
      if (live)
        setError(
          cause instanceof Error ? cause.message : "No fue posible leer el almacenamiento local.",
        );
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(
    () =>
      watchOfflineAccess(undefined, (count) => {
        setLoaded(undefined);
        setError(
          `El acceso o la vigencia cambió. Se eliminaron las descargas afectadas y ${count} operaciones pendientes. Las versiones del servidor se conservan.`,
        );
      }),
    [],
  );
  const hasOrder =
    new URL(location.href).searchParams.has("order") ||
    /^\/maintenance\/work-orders\/[0-9a-f-]{36}(?:\/execute)?$/.test(location.pathname);
  const synchronization =
    location.pathname === "/maintenance/synchronization" ||
    new URL(location.href).searchParams.get("view") === "sync";
  return synchronization ? (
    <LocalSynchronizationCenter />
  ) : !hasOrder ? (
    <main className="offline-work">
      <PageHeader title="Órdenes descargadas" />
      <DownloadedOrders />
    </main>
  ) : loaded ? (
    <OfflineEditor {...loaded} />
  ) : (
    <main className="offline-work">
      <PageHeader title="Órdenes descargadas" />
      <p role={error ? "alert" : "status"}>
        {error || "Abriendo los datos protegidos de este dispositivo…"}
      </p>
      <ButtonLink href="/maintenance/work-orders">Volver a las órdenes</ButtonLink>
    </main>
  );
}
function OfflinePresentationShell() {
  const [saved, setSaved] = useState(readOfflinePresentation);
  useEffect(() => {
    const clear = () => {
      sessionStorage.removeItem(PRESENTATION_KEY);
      setSaved(undefined);
    };
    window.addEventListener(PURGED_EVENT, clear);
    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(PURGED_EVENT) : undefined;
    if (channel) channel.onmessage = clear;
    return () => {
      window.removeEventListener(PURGED_EVENT, clear);
      channel?.close();
    };
  }, []);
  return (
    <>
      {saved && (
        <header className="offline-work offline-work__identity">
          <strong>
            {saved.current.accountName} · {saved.current.roles}
          </strong>
          <span>{saved.userName} · Sin conexión</span>
          <details open={innerWidth >= 768}>
            <summary>Menú sin conexión</summary>
            <nav aria-label="Último menú conocido" className="offline-work__actions">
              {saved.destinations.map((item) => (
                <ButtonLink
                  key={item.href}
                  href={item.href}
                  variant="secondary"
                  size="sm"
                  icon={item.icon}
                >
                  {item.label}
                </ButtonLink>
              ))}
            </nav>
          </details>
          <small>Último contexto conocido. Cada acceso se vuelve a verificar al conectar.</small>
        </header>
      )}
      <OfflineApp />
    </>
  );
}
createRoot(document.getElementById("offline-root")!).render(<OfflinePresentationShell />);
