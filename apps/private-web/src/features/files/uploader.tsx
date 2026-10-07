"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  FILE_UPLOAD_PURPOSES,
  downloadSessionSchema,
  fileObjectSchema,
  publicJobSchema,
  uploadSessionSchema,
  type FileObject,
  type FileUploadPurpose,
} from "@ice24/contracts";
import { useAccountAccess } from "../account-shell/access-provider";
import { request, toFailure, type Failure } from "../account-shell/failure";
import { ServiceState } from "../account-shell/service-state";
import { FileCard, type TrackedFile } from "./file-card";
import { fileStatusLabels, formatSize } from "./model";

export { fileStatusLabels } from "./model";

export type ResourceType = "account" | "branch" | "machine";
export interface ResourceOption {
  type: ResourceType;
  id: string;
  label: string;
}

const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/** Direct PUT to the signed URL, with progress; the bytes never cross the BFF or the API. */
function putToStorage(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (percent: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const upload = new XMLHttpRequest();
    upload.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) upload.setRequestHeader(name, value);
    upload.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    upload.onload = () => resolve(upload.status >= 200 && upload.status < 300);
    upload.onerror = () => resolve(false);
    upload.ontimeout = () => resolve(false);
    upload.timeout = 120_000;
    upload.send(file);
  });
}

export function FileUploader({
  contextId,
  csrfToken,
  resources,
  initialFile,
}: {
  contextId: string;
  csrfToken: string;
  resources: ResourceOption[];
  /** File opened from a link (job, alert or audit), shown with its versions. */
  initialFile?: FileObject | undefined;
}) {
  const access = useAccountAccess();
  const [resourceIndex, setResourceIndex] = useState(0);
  const resource = resources[resourceIndex];
  const purposes = (Object.keys(FILE_UPLOAD_PURPOSES) as FileUploadPurpose[]).filter((purpose) =>
    resource
      ? (FILE_UPLOAD_PURPOSES[purpose].entityTypes as readonly string[]).includes(resource.type)
      : false,
  );
  const [purpose, setPurpose] = useState<FileUploadPurpose | "">(purposes[0] ?? "");
  const policy = purpose === "" ? undefined : FILE_UPLOAD_PURPOSES[purpose];
  const [phase, setPhase] = useState<"idle" | "authorizing" | "uploading" | "confirming">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [notice, setNotice] = useState("");
  const [files, setFiles] = useState<TrackedFile[]>(
    initialFile
      ? [
          {
            id: initialFile.id,
            name: initialFile.fileName,
            status: initialFile.status,
            jobId: null,
            meta: initialFile,
          },
        ]
      : [],
  );
  const input = useRef<HTMLInputElement>(null);
  const busy = phase !== "idle";
  const uploadBlocked = !access.canWrite || !access.online;
  const headers = { "x-ice24-workspace-context": contextId };

  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    data.set("csrfToken", csrfToken);
    data.set("key", crypto.randomUUID());
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  };
  const update = (id: string, patch: Partial<TrackedFile>) =>
    setFiles((current) => current.map((file) => (file.id === id ? { ...file, ...patch } : file)));
  /** Shows a classified failure; a late ACCOUNT_READ_ONLY also updates the shell banner. */
  function fail(cause: unknown, fallback: string) {
    const classified = toFailure(cause, fallback);
    if (classified.kind === "read_only") access.markReadOnly();
    if (classified.kind === "conflict" || classified.kind === "offline") setFailure(classified);
    else setError(classified.message);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFailure(null);
    setNotice("");
    if (uploadBlocked)
      return setError(
        access.online ? access.blockedText : "Necesitas conexión para subir archivos.",
      );
    const file = input.current?.files?.[0];
    if (!resource || !policy || purpose === "")
      return setError("Selecciona el recurso y el propósito.");
    if (!file) return setError("Selecciona un archivo.");
    if (!(policy.mediaTypes as readonly string[]).includes(file.type))
      return setError("Ese tipo de archivo no está permitido para este propósito.");
    if (file.size === 0 || file.size > policy.maxSizeBytes)
      return setError(`El archivo debe pesar entre 1 byte y ${formatSize(policy.maxSizeBytes)}.`);
    setPhase("authorizing");
    setProgress(0);
    let fileId: string | null = null;
    try {
      const sha256 = hex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
      const authorized = await request(
        "/api/files/upload-sessions",
        {
          method: "POST",
          headers,
          body: form({
            fileName: file.name,
            mediaType: file.type,
            sizeBytes: String(file.size),
            purpose,
            resourceType: resource.type,
            resourceId: resource.id,
          }),
        },
        "No fue posible autorizar la carga.",
      );
      const session = uploadSessionSchema.parse(await authorized.json());
      fileId = session.fileId;
      setPhase("uploading");
      const stored = await putToStorage(
        session.uploadUrl,
        session.requiredHeaders,
        file,
        setProgress,
      );
      if (!stored) {
        await fetch(`/api/files/${session.fileId}/abort`, {
          method: "POST",
          headers,
          body: form({}),
        }).catch(() => undefined);
        return setError(
          "La subida al almacenamiento privado falló. La carga se canceló; intenta de nuevo.",
        );
      }
      setPhase("confirming");
      let confirmed: Response;
      try {
        confirmed = await request(
          `/api/files/${session.fileId}/complete`,
          {
            method: "POST",
            headers,
            body: form({ uploadToken: session.uploadToken, sha256 }),
          },
          "No fue posible confirmar la carga.",
        );
      } catch (cause) {
        setFiles((current) => [
          { id: session.fileId, name: file.name, status: "rejected", jobId: null },
          ...current,
        ]);
        throw cause;
      }
      const job = publicJobSchema.parse(await confirmed.json());
      setFiles((current) => [
        { id: session.fileId, name: file.name, status: "processing", jobId: job.id },
        ...current,
      ]);
      setNotice(
        `Archivo «${file.name}» recibido. Quedó en cuarentena en espera de la verificación antivirus.`,
      );
      if (input.current) input.current.value = "";
    } catch (cause) {
      fail(
        cause,
        fileId
          ? "La carga se interrumpió. Revisa el estado del archivo antes de reintentar."
          : "No fue posible iniciar la carga. Intenta nuevamente.",
      );
    } finally {
      setPhase("idle");
    }
  }

  /** FIL-003. `quiet` only updates the status, keeping the message that triggered it. */
  async function refresh(file: TrackedFile, quiet = false) {
    if (!quiet) {
      setError("");
      setFailure(null);
    }
    try {
      const response = await request(
        `/api/files/${file.id}`,
        { headers, cache: "no-store" },
        "No fue posible consultar el archivo.",
      );
      const value = fileObjectSchema.parse(await response.json());
      update(file.id, { status: value.status, meta: value });
      if (!quiet) setNotice(`Estado de «${file.name}»: ${fileStatusLabels[value.status]}.`);
    } catch (cause) {
      if (!quiet) fail(cause, "No fue posible consultar el archivo.");
    }
  }

  async function download(file: TrackedFile) {
    setError("");
    setFailure(null);
    try {
      const response = await request(
        `/api/files/${file.id}/download`,
        { method: "POST", headers, body: form({ purpose: "Consulta del archivo cargado" }) },
        "No fue posible descargar.",
      );
      const { url, expiresAt } = downloadSessionSchema.parse(await response.json());
      // Hand the temporary URL to the browser and drop it: it is never rendered or kept.
      const link = document.createElement("a");
      link.href = url;
      link.rel = "noopener noreferrer";
      document.body.append(link);
      link.click();
      link.remove();
      setNotice(
        `Descarga temporal autorizada para «${file.name}» (vence a las ${new Date(expiresAt).toLocaleTimeString("es-MX")}).`,
      );
    } catch (cause) {
      fail(cause, "No fue posible descargar.");
      // The file may have changed state since it was listed (e.g. purged): show the current one.
      if (toFailure(cause, "").kind === "conflict") void refresh(file, true);
    }
  }

  return (
    <>
      {resources.length === 0 ? (
        <ServiceState
          kind="empty"
          title="Sin recursos para vincular archivos"
          message="Abre esta pantalla desde una sucursal o máquina autorizada para subir evidencias o documentos."
        />
      ) : (
        <form
          onSubmit={(event) => void upload(event)}
          className="file-form"
          aria-label="Subir archivo privado"
          aria-describedby={uploadBlocked ? "file-blocked" : undefined}
        >
          {uploadBlocked && (
            <p id="file-blocked" className="write-blocked">
              {access.online
                ? `${access.blockedText} Las descargas de archivos aprobados siguen disponibles.`
                : "Necesitas conexión para subir archivos."}
            </p>
          )}
          <div className="file-field">
            <label htmlFor="file-resource">Vincular a</label>
            <select
              id="file-resource"
              value={resourceIndex}
              disabled={busy || uploadBlocked}
              onChange={(event) => {
                const next = Number(event.target.value);
                setResourceIndex(next);
                const type = resources[next]?.type;
                setPurpose(
                  (Object.keys(FILE_UPLOAD_PURPOSES) as FileUploadPurpose[]).find((key) =>
                    (FILE_UPLOAD_PURPOSES[key].entityTypes as readonly string[]).includes(
                      type ?? "",
                    ),
                  ) ?? "",
                );
              }}
            >
              {resources.map((option, index) => (
                <option key={`${option.type}:${option.id}`} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="file-field">
            <label htmlFor="file-purpose">Propósito</label>
            <select
              id="file-purpose"
              value={purpose}
              disabled={busy || uploadBlocked}
              onChange={(event) => setPurpose(event.target.value as FileUploadPurpose)}
            >
              {purposes.map((key) => (
                <option key={key} value={key}>
                  {FILE_UPLOAD_PURPOSES[key].label}
                </option>
              ))}
            </select>
          </div>
          <div className="file-field">
            <label htmlFor="file-input">Archivo a subir</label>
            <input
              id="file-input"
              ref={input}
              type="file"
              disabled={busy || uploadBlocked}
              accept={policy?.mediaTypes.join(",")}
              aria-describedby="file-rules"
            />
          </div>
          <p id="file-rules" className="file-hint">
            {policy
              ? `Formatos: ${policy.mediaTypes.map((type) => type.split("/")[1]!.toUpperCase()).join(", ")} · Máximo ${formatSize(policy.maxSizeBytes)}. El archivo se sube directo al almacenamiento privado y queda en cuarentena hasta su verificación.`
              : "Selecciona un propósito."}
          </p>
          <button type="submit" disabled={busy || uploadBlocked}>
            {phase === "idle" ? "Subir archivo" : "Subiendo…"}
          </button>
        </form>
      )}
      {phase !== "idle" && (
        <div role="status" className="file-progress">
          {phase === "authorizing" && "Autorizando la carga…"}
          {phase === "uploading" && (
            <>
              Subiendo al almacenamiento privado…{" "}
              <progress max={100} value={progress} aria-label="Progreso de carga">
                {progress}%
              </progress>{" "}
              {progress}%
            </>
          )}
          {phase === "confirming" && "Confirmando la carga…"}
        </div>
      )}
      {error && (
        <p role="alert" className="file-error">
          {error}
        </p>
      )}
      {failure && <ServiceState kind={failure.kind} message={failure.message} />}
      {notice && (
        <p role="status" className="file-notice">
          {notice}
        </p>
      )}
      <section aria-labelledby="file-list-title" className="file-list">
        <h2 id="file-list-title">Archivos cargados</h2>
        {files.length > 0 ? (
          <ul>
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                disabled={!access.online}
                onRefresh={(target) => void refresh(target)}
                onDownload={(target) => void download(target)}
              />
            ))}
          </ul>
        ) : (
          <p className="file-hint">
            Aún no has cargado archivos en esta sesión. Cada archivo aparecerá aquí con su estado de
            verificación y sus versiones descargables.
          </p>
        )}
      </section>
    </>
  );
}
