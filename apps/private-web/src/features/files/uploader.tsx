"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  FILE_UPLOAD_PURPOSES,
  downloadSessionSchema,
  fileObjectSchema,
  publicJobSchema,
  uploadSessionSchema,
  type FileStatus,
  type FileUploadPurpose,
} from "@ice24/contracts";

export type ResourceType = "account" | "branch" | "machine";
export interface ResourceOption {
  type: ResourceType;
  id: string;
  label: string;
}
interface UploadedFile {
  id: string;
  name: string;
  status: FileStatus;
  jobId: string | null;
}

export const fileStatusLabels: Record<FileStatus, string> = {
  pending: "Pendiente de carga",
  uploaded: "Recibido",
  processing: "En verificación (cuarentena)",
  available: "Disponible",
  rejected: "Rechazado",
  quarantined: "En cuarentena",
  deleted_temporary: "Cancelado o expirado",
};
const MiB = 1_048_576;
const size = (bytes: number) =>
  bytes >= MiB ? `${(bytes / MiB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function messageOf(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  return typeof body?.message === "string" ? body.message : fallback;
}

/** Direct PUT to the signed URL, with progress; the bytes never cross the BFF or the API. */
function putToStorage(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (percent: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.ontimeout = () => resolve(false);
    request.timeout = 120_000;
    request.send(file);
  });
}

export function FileUploader({
  contextId,
  csrfToken,
  resources,
  initialMessage,
}: {
  contextId: string;
  csrfToken: string;
  resources: ResourceOption[];
  initialMessage: string;
}) {
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
  const [error, setError] = useState(initialMessage);
  const [notice, setNotice] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const busy = phase !== "idle";
  const headers = { "x-ice24-workspace-context": contextId };

  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    data.set("csrfToken", csrfToken);
    data.set("key", crypto.randomUUID());
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  };
  const update = (id: string, patch: Partial<UploadedFile>) =>
    setFiles((current) => current.map((file) => (file.id === id ? { ...file, ...patch } : file)));

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const file = input.current?.files?.[0];
    if (!resource || !policy || purpose === "")
      return setError("Selecciona el recurso y el propósito.");
    if (!file) return setError("Selecciona un archivo.");
    if (!(policy.mediaTypes as readonly string[]).includes(file.type))
      return setError("Ese tipo de archivo no está permitido para este propósito.");
    if (file.size === 0 || file.size > policy.maxSizeBytes)
      return setError(`El archivo debe pesar entre 1 byte y ${size(policy.maxSizeBytes)}.`);
    setPhase("authorizing");
    setProgress(0);
    let fileId: string | null = null;
    try {
      const sha256 = hex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
      const authorized = await fetch("/api/files/upload-sessions", {
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
      });
      if (!authorized.ok)
        return setError(await messageOf(authorized, "No fue posible autorizar la carga."));
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
        });
        return setError(
          "La subida al almacenamiento privado falló. La carga se canceló; intenta de nuevo.",
        );
      }
      setPhase("confirming");
      const confirmed = await fetch(`/api/files/${session.fileId}/complete`, {
        method: "POST",
        headers,
        body: form({ uploadToken: session.uploadToken, sha256 }),
      });
      if (!confirmed.ok) {
        const message = await messageOf(confirmed, "No fue posible confirmar la carga.");
        setFiles((current) => [
          { id: session.fileId, name: file.name, status: "rejected", jobId: null },
          ...current,
        ]);
        return setError(message);
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
    } catch {
      setError(
        fileId
          ? "La carga se interrumpió. Revisa el estado del archivo antes de reintentar."
          : "No fue posible iniciar la carga. Intenta nuevamente.",
      );
    } finally {
      setPhase("idle");
    }
  }

  async function refresh(file: UploadedFile) {
    setError("");
    const response = await fetch(`/api/files/${file.id}`, { headers, cache: "no-store" });
    if (!response.ok)
      return setError(await messageOf(response, "No fue posible consultar el archivo."));
    const value = fileObjectSchema.parse(await response.json());
    update(file.id, { status: value.status });
    setNotice(`Estado de «${file.name}»: ${fileStatusLabels[value.status]}.`);
  }

  async function download(file: UploadedFile) {
    setError("");
    const response = await fetch(`/api/files/${file.id}/download`, {
      method: "POST",
      headers,
      body: form({ purpose: "Consulta del archivo cargado" }),
    });
    if (!response.ok) return setError(await messageOf(response, "No fue posible descargar."));
    const { url, expiresAt } = downloadSessionSchema.parse(await response.json());
    const link = document.createElement("a");
    link.href = url;
    link.rel = "noopener noreferrer";
    link.dataset.testid = "signed-download";
    document.body.append(link);
    link.click();
    link.remove();
    setNotice(
      `Descarga temporal autorizada para «${file.name}» (vence a las ${new Date(expiresAt).toLocaleTimeString("es-MX")}).`,
    );
  }

  if (resources.length === 0)
    return (
      <p role="status">
        No hay recursos disponibles para vincular archivos. Abre esta pantalla desde una sucursal o
        máquina autorizada.
      </p>
    );
  return (
    <>
      <form
        onSubmit={(event) => void upload(event)}
        className="file-form"
        aria-label="Subir archivo privado"
      >
        <div className="file-field">
          <label htmlFor="file-resource">Vincular a</label>
          <select
            id="file-resource"
            value={resourceIndex}
            disabled={busy}
            onChange={(event) => {
              const next = Number(event.target.value);
              setResourceIndex(next);
              const type = resources[next]?.type;
              setPurpose(
                (Object.keys(FILE_UPLOAD_PURPOSES) as FileUploadPurpose[]).find((key) =>
                  (FILE_UPLOAD_PURPOSES[key].entityTypes as readonly string[]).includes(type ?? ""),
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
            disabled={busy}
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
            disabled={busy}
            accept={policy?.mediaTypes.join(",")}
            aria-describedby="file-rules"
          />
        </div>
        <p id="file-rules" className="file-hint">
          {policy
            ? `Formatos: ${policy.mediaTypes.map((type) => type.split("/")[1]!.toUpperCase()).join(", ")} · Máximo ${size(policy.maxSizeBytes)}. El archivo se sube directo al almacenamiento privado y queda en cuarentena hasta su verificación.`
            : "Selecciona un propósito."}
        </p>
        <button type="submit" disabled={busy}>
          {phase === "idle" ? "Subir archivo" : "Subiendo…"}
        </button>
      </form>
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
      {notice && (
        <p role="status" className="file-notice">
          {notice}
        </p>
      )}
      {files.length > 0 && (
        <section aria-label="Archivos cargados en esta sesión" className="file-list">
          <h2>Archivos cargados</h2>
          <ul>
            {files.map((file) => (
              <li key={file.id}>
                <span className="file-name">{file.name}</span>
                <span className={`file-status file-status--${file.status}`}>
                  {fileStatusLabels[file.status]}
                </span>
                <span className="file-actions">
                  <button type="button" onClick={() => void refresh(file)}>
                    Consultar estado de {file.name}
                  </button>
                  <button
                    type="button"
                    disabled={file.status !== "available"}
                    onClick={() => void download(file)}
                  >
                    Descargar {file.name}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
