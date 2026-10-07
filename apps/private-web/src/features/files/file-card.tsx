import type { FileObject, FileStatus } from "@ice24/contracts";
import { fileStatusLabels, formatSize, resourceLabel, verdictOf, versionsOf } from "./model";

export interface TrackedFile {
  id: string;
  name: string;
  status: FileStatus;
  jobId: string | null;
  /** Metadata from FIL-003 once consulted; never contains storage locations. */
  meta?: FileObject | undefined;
}

const utc = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";

/**
 * One private file: status, antimalware verdict, downloadable versions (FIL-004) and actions.
 * Downloads always request a new temporary URL; no URL is ever rendered or stored.
 */
export function FileCard({
  file,
  disabled,
  onRefresh,
  onDownload,
}: {
  file: TrackedFile;
  disabled: boolean;
  onRefresh: (file: TrackedFile) => void;
  onDownload: (file: TrackedFile) => void;
}) {
  const verdict = verdictOf(file.status);
  const versionsId = `file-${file.id}-versions`;
  return (
    <li className="file-card">
      <div className="file-card__head">
        <span className="file-name">{file.name}</span>
        <span className={`file-status file-status--${file.status}`}>
          {fileStatusLabels[file.status]}
        </span>
        <span className={`chip chip--${verdict.tone}`}>
          <span className="visually-hidden">Verificación antimalware: </span>
          {verdict.label}
        </span>
      </div>
      <p className="file-hint">{verdict.explanation}</p>
      {file.meta && (
        <dl className="file-meta">
          <div>
            <dt>Vinculado a</dt>
            <dd>{resourceLabel(file.meta.relatedResource)}</dd>
          </div>
          <div>
            <dt>Tamaño</dt>
            <dd>{formatSize(file.meta.sizeBytes)}</dd>
          </div>
          <div>
            <dt>Cargado</dt>
            <dd>{utc(file.meta.audit.createdAt)}</dd>
          </div>
          {file.meta.sha256 && (
            <div>
              <dt>Huella SHA-256</dt>
              <dd className="file-hash">{file.meta.sha256}</dd>
            </div>
          )}
        </dl>
      )}
      <section aria-labelledby={versionsId} className="file-versions">
        <h3 id={versionsId}>Versiones de «{file.name}»</h3>
        <ul>
          {versionsOf(file.status).map((version) => (
            <li key={version.name}>
              <strong>{version.label}</strong>
              <span>{version.available ? "Disponible" : "No disponible"}</span>
              <small>{version.note}</small>
            </li>
          ))}
        </ul>
      </section>
      <span className="file-actions">
        <button type="button" disabled={disabled} onClick={() => onRefresh(file)}>
          Consultar estado de {file.name}
        </button>
        <button
          type="button"
          disabled={disabled || file.status !== "available"}
          onClick={() => onDownload(file)}
        >
          Descargar {file.name}
        </button>
      </span>
    </li>
  );
}
