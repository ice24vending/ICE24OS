import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FileObject, FileStatus } from "@ice24/contracts";
import { AccessProvider } from "../account-shell/access-provider";
import { readOnlyNotice } from "../account-shell/access";
import { FileCard } from "./file-card";
import { verdictOf, versionsOf } from "./model";
import { FileUploader } from "./uploader";

const id = "11111111-1111-4111-8111-111111111111";
const meta = (status: FileStatus): FileObject => ({
  id,
  ownerAccountId: id,
  fileName: "analisis.pdf",
  mediaType: "application/pdf",
  sizeBytes: 2_621_440,
  sha256: "a".repeat(64),
  purpose: "laboratory_analysis_original",
  relatedResource: { type: "branch", id },
  visibility: "private",
  status,
  audit: {
    createdAt: "2026-10-06T12:00:00.000Z",
    createdBy: id,
    updatedAt: "2026-10-06T12:00:00.000Z",
    rowVersion: 2,
  },
});
const card = (status: FileStatus, disabled = false) =>
  renderToStaticMarkup(
    <FileCard
      file={{ id, name: "analisis.pdf", status, jobId: null, meta: meta(status) }}
      disabled={disabled}
      onRefresh={() => undefined}
      onDownload={() => undefined}
    />,
  );
const downloadButton = (html: string) =>
  /<button type="button"( disabled="")?>Descargar analisis\.pdf<\/button>/u.exec(html);

describe("private file states (quarantine, approved, rejected)", () => {
  it.each([
    ["processing", false],
    ["uploaded", false],
    ["quarantined", false],
    ["available", true],
    ["rejected", false],
  ] as const)("%s → download enabled: %s", (status, enabled) => {
    const html = card(status);
    expect(Boolean(downloadButton(html)?.[1])).toBe(!enabled);
  });
  it("labels each verdict with text, not only color", () => {
    expect(verdictOf("processing").label).toBe("En cuarentena");
    expect(verdictOf("available").label).toBe("Aprobado");
    expect(verdictOf("rejected").label).toBe("Rechazado");
    expect(card("quarantined")).toContain("Centro de trabajos");
    expect(card("rejected")).toContain("sus bytes se eliminaron");
  });
  it("lists the FIL-004 versions and never offers a derivative that does not exist", () => {
    expect(versionsOf("available").map((v) => [v.name, v.available])).toEqual([
      ["original", true],
      ["optimized", false],
      ["public", false],
    ]);
    expect(versionsOf("processing").every((version) => !version.available)).toBe(true);
    const html = card("available");
    expect(html).toContain("Versiones de «analisis.pdf»");
    expect(html).toContain("cada descarga queda auditada");
  });
  it("shows metadata but never a storage location or URL", () => {
    const html = card("available");
    expect(html).toContain("2.5 MB");
    expect(html).toContain("Sucursal 11111111");
    expect(html).not.toMatch(/https?:\/\//u);
    expect(html).not.toContain("quarantine/");
  });
  it("disables actions while offline", () => {
    expect(card("available", true)).toContain('disabled="">Consultar estado de analisis.pdf');
  });
});

describe("uploader with the account access mode", () => {
  const uploader = (mode: "ACTIVE" | "READ_ONLY", file?: FileObject) =>
    renderToStaticMarkup(
      <AccessProvider initialMode={mode} initialNotice={readOnlyNotice(null, true)} billingOwner>
        <FileUploader
          contextId="c"
          csrfToken="t"
          resources={[{ type: "branch", id, label: "Sucursal Centro" }]}
          initialFile={file}
        />
      </AccessProvider>,
    );
  it("blocks uploads in read-only mode from the start and keeps downloads", () => {
    const html = uploader("READ_ONLY", meta("available"));
    expect(html).toContain('<button type="submit" disabled="">Subir archivo</button>');
    expect(html).toContain("Las descargas de archivos aprobados siguen disponibles");
    expect(downloadButton(html)?.[1]).toBeUndefined();
  });
  it("allows uploads in active accounts and shows the size and type limits first", () => {
    const html = uploader("ACTIVE");
    expect(html).toContain('<button type="submit">Subir archivo</button>');
    expect(html).toContain("Máximo 10.0 MB");
    expect(html).toContain("Aún no has cargado archivos");
  });
  it("shows an empty state when there is nothing to link files to", () => {
    const html = renderToStaticMarkup(<FileUploader contextId="c" csrfToken="t" resources={[]} />);
    expect(html).toContain("Sin recursos para vincular archivos");
    expect(html).not.toContain("Subir archivo");
  });
});
