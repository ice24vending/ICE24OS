// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FileObject } from "@ice24/contracts";

import FilesPage from "../../app/(account)/files/page";
import { ROLE_PERMISSIONS, type DemoRoleCode } from "../../server/demo/personas";
import { FileUploader } from "./uploader";

let permissions: readonly string[] | null = [];
const branchId = "b0000000-0000-4000-8000-000000000001";
const fileId = "f0000000-0000-4000-8000-000000000001";
const file: FileObject = {
  id: fileId,
  ownerAccountId: branchId,
  fileName: "analisis-centro.pdf",
  mediaType: "application/pdf",
  sizeBytes: 12345,
  purpose: "laboratory_analysis_original",
  relatedResource: { type: "branch", id: branchId },
  visibility: "private",
  status: "available",
  audit: {
    createdAt: "2026-10-06T12:00:00.000Z",
    createdBy: branchId,
    updatedAt: "2026-10-06T12:00:00.000Z",
    rowVersion: 1,
  },
};

vi.mock("../../server/session/session", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readBrowserSession: async () => ({
    accessToken: "demo",
    refreshToken: "demo",
    expiresAt: Date.now() + 60_000,
    contextId: "context-1",
    csrfToken: "csrf",
  }),
}));
vi.mock("../../server/account/shell", () => ({
  guardDestination: async () => null,
  loadAccountShell: async () => ({
    capabilities:
      permissions === null ? null : { permissions, mfaVerified: true, accountWide: true },
  }),
}));
vi.mock("../../server/session/supabase-auth", () => ({
  callPrivateApi: async (path: string) =>
    Response.json(
      path === `files/${fileId}` ? file : [{ id: branchId, data: { name: "Centro Monterrey" } }],
    ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const renderLinkedFile = async () =>
  render(await FilesPage({ searchParams: Promise.resolve({ fileId }) }));

describe("Files page upload permission", () => {
  it.each([
    ["AU", false],
    ["OW", true],
    ["OP", true],
    ["TC", true],
  ] satisfies [DemoRoleCode, boolean][])("%s: upload visible = %s", async (role, allowed) => {
    permissions = ROLE_PERMISSIONS[role];
    await renderLinkedFile();
    expect(screen.queryByRole("form", { name: "Subir archivo privado" }) !== null).toBe(allowed);
    expect(screen.queryByRole("button", { name: "Subir archivo" }) !== null).toBe(allowed);
    expect(screen.queryByLabelText("Archivo a subir") !== null).toBe(allowed);
    expect(screen.getByRole("heading", { name: "Archivos privados", level: 1 })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Archivos cargados" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Archivos cargados en esta sesión" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: `Versiones de «${file.fileName}»` })).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: `Descargar ${file.fileName}` }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it.each([{ codes: null }, { codes: [] }, { codes: ["files.read"] }, { codes: ["files.upload"] }])(
    "requires both confirmed permissions: $codes",
    async ({ codes }) => {
      permissions = codes;
      render(await FilesPage({ searchParams: Promise.resolve({}) }));
      expect(screen.queryByRole("form", { name: "Subir archivo privado" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Subir archivo" })).toBeNull();
      expect(screen.queryByLabelText("Archivo a subir")).toBeNull();
      expect(screen.getByRole("region", { name: "Archivos cargados" })).toBeTruthy();
    },
  );

  it("keeps upload controls by default for existing consumers", () => {
    render(
      <FileUploader
        contextId="context-1"
        csrfToken="csrf"
        resources={[{ type: "branch", id: branchId, label: "Sucursal Centro Monterrey" }]}
      />,
    );
    expect(screen.getByRole("form", { name: "Subir archivo privado" })).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Subir archivo" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("keeps the empty resource panel and list identical without upload permission", () => {
    const before = renderToStaticMarkup(
      <FileUploader contextId="context-1" csrfToken="csrf" resources={[]} />,
    );
    const after = renderToStaticMarkup(
      <FileUploader contextId="context-1" csrfToken="csrf" resources={[]} canUpload={false} />,
    );
    expect(after).toBe(before);
    expect(after).toContain("Sin recursos para vincular archivos");
    expect(after).toContain("Archivos cargados");
  });

  it("allows AU to download an approved linked file without upload controls", async () => {
    permissions = ROLE_PERMISSIONS.AU;
    const url = "https://storage.example.test/temporary-download";
    const fetchMock = vi.fn(async () =>
      Response.json({ url, expiresAt: "2026-11-21T12:05:00.000Z" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const opened: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      opened.push(this.href);
    });
    await renderLinkedFile();

    fireEvent.click(screen.getByRole("button", { name: `Descargar ${file.fileName}` }));
    await waitFor(() => expect(opened).toEqual([url]));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/files/${fileId}/download`,
      expect.objectContaining({
        method: "POST",
        headers: { "x-ice24-workspace-context": "context-1" },
        body: expect.any(FormData),
      }),
    );
    expect(
      screen.getByText(/Descarga temporal autorizada para «analisis-centro.pdf»/u),
    ).toBeTruthy();
    expect(document.querySelector(`a[href="${url}"]`)).toBeNull();
    expect(screen.queryByRole("form", { name: "Subir archivo privado" })).toBeNull();
  });

  it("keeps download errors visible without upload controls", async () => {
    permissions = ROLE_PERMISSIONS.AU;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "No fue posible descargar." }, { status: 503 })),
    );
    await renderLinkedFile();

    fireEvent.click(screen.getByRole("button", { name: `Descargar ${file.fileName}` }));
    expect(await screen.findByText("No fue posible descargar.")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Archivos cargados" })).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Subir archivo privado" })).toBeNull();
  });
});
