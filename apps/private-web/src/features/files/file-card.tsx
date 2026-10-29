import type { FileObject, FileStatus } from "@ice24/contracts";
import { StatusTag, Table } from "@ice24/ui";
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

function FileDetails({ file, open }: { file: TrackedFile; open: boolean }) {
  const versionsId = `file-${file.id}-versions`;
  return (
    <details className="file-details" open={open}>
      <summary>
        Detalles<span className="ids-visually-hidden"> de {file.name}</span>
      </summary>
      <p className="file-hint">{verdictOf(file.status).explanation}</p>
      {file.meta && (
        <dl className="file-meta">
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
    </details>
  );
}

/**
 * Private files of the session: status, antimalware verdict, downloadable versions (FIL-004) and
 * actions. Downloads always request a new temporary URL; no URL is ever rendered or stored.
 */
export function FileTable({
  files,
  openId,
  disabled,
  onRefresh,
  onDownload,
}: {
  files: TrackedFile[];
  /** File opened from a link (job, alert or audit): its details start expanded. */
  openId?: string | undefined;
  disabled: boolean;
  onRefresh: (file: TrackedFile) => void;
  onDownload: (file: TrackedFile) => void;
}) {
  return (
    <Table
      caption="Archivos cargados en esta sesión"
      captionHidden
      rows={files}
      getRowId={(file) => file.id}
      getRowLabel={(file) => file.name}
      columns={[
        {
          id: "name",
          header: "Archivo",
          mobile: "title",
          cell: (file) => (
            <>
              <span className="file-name">{file.name}</span>
              <FileDetails file={file} open={file.id === openId} />
            </>
          ),
        },
        {
          id: "resource",
          header: "Vinculado a",
          cell: (file) => (file.meta ? resourceLabel(file.meta.relatedResource) : "—"),
        },
        { id: "status", header: "Estado", cell: (file) => fileStatusLabels[file.status] },
        {
          id: "verdict",
          header: "Verificación",
          cell: (file) => {
            const verdict = verdictOf(file.status);
            return (
              <StatusTag tone={verdict.tone} dimension="Verificación antimalware">
                {verdict.label}
              </StatusTag>
            );
          },
        },
      ]}
      rowActions={(file) => (
        <span className="file-actions">
          <button type="button" disabled={disabled} onClick={() => onRefresh(file)}>
            Consultar estado<span className="ids-visually-hidden"> de {file.name}</span>
          </button>
          <button
            type="button"
            disabled={disabled || file.status !== "available"}
            onClick={() => onDownload(file)}
          >
            Descargar<span className="ids-visually-hidden"> {file.name}</span>
          </button>
        </span>
      )}
    />
  );
}
