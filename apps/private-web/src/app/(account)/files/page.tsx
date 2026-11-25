import { redirect } from "next/navigation";
import { fileObjectSchema, filePageSchema, type FileObject, type FilePage } from "@ice24/contracts";
import { PageWidth, PageHeader } from "@ice24/ui";
import { randomUUID } from "node:crypto";
import { upstreamCorrelation } from "../../../server/bff/responses";
import { demoStateOf } from "../../../server/demo/session";
import { demoIds } from "../../../server/demo/fixtures";
import type { Failure } from "../../../components/system-state/failure";
import { readBrowserSession, type BrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { FileUploader, type ResourceOption } from "../../../features/files/uploader";
import { UUID } from "../../../features/files/bff";
import {
  ServiceState,
  type ServiceStateKind,
} from "../../../components/system-state/service-state";
import "../../../features/files/files.css";
import { guardDestination, loadAccountShell } from "../../../server/account/shell";
import { DestinationDenied } from "../../../features/navigation/destination-denied";

export const metadata = { title: "Archivos privados" };

export const dynamic = "force-dynamic";

/** Branches the user may attach files to (best effort: the equipment module may be absent). */
async function branchOptions(session: BrowserSession) {
  try {
    const response = await callPrivateApi("branches", session, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row: { id?: unknown; data?: { name?: unknown } }) =>
      typeof row.id === "string" && UUID.test(row.id)
        ? [
            {
              type: "branch" as const,
              id: row.id,
              label: `Sucursal ${typeof row.data?.name === "string" ? row.data.name : row.id.slice(0, 8)}`,
            },
          ]
        : [],
    );
  } catch {
    return [];
  }
}

/** FIL-003 for a file opened from a link; the API enforces account and scope. */
interface LinkedFile {
  file?: FileObject;
  state?: { kind: ServiceStateKind; message: string };
}

async function accountFiles(
  session: BrowserSession,
): Promise<{ page?: FilePage; failure?: Failure }> {
  const demo = demoStateOf(session);
  const folio = demo ? demoIds.correlation(999) : randomUUID();
  try {
    const response = await callPrivateApi("files", session, { signal: AbortSignal.timeout(8000) });
    if (response.ok) return { page: filePageSchema.parse(await response.json()) };
    return {
      failure: {
        kind: response.status === 403 ? "forbidden" : "error",
        status: response.status,
        message: "No fue posible consultar los archivos de la cuenta.",
        correlationId: (await upstreamCorrelation(response)) ?? folio,
      },
    };
  } catch {
    return {
      failure: {
        kind: demo?.network === "offline" ? "offline" : "error",
        status: 503,
        message: "No fue posible consultar los archivos de la cuenta.",
        correlationId: folio,
      },
    };
  }
}

async function linkedFile(session: BrowserSession, fileId: string): Promise<LinkedFile> {
  try {
    const response = await callPrivateApi(`files/${fileId}`, session, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) return { file: fileObjectSchema.parse(await response.json()) };
    return {
      state:
        response.status === 403
          ? { kind: "forbidden", message: "No tienes permiso para consultar este archivo." }
          : response.status === 404
            ? {
                kind: "not_found",
                message: "No encontramos el archivo o no pertenece a la cuenta activa.",
              }
            : {
                kind: "error",
                message: "No fue posible consultar el archivo. Intenta nuevamente.",
              },
    };
  } catch {
    return {
      state: { kind: "error", message: "No fue posible consultar el archivo. Intenta nuevamente." },
    };
  }
}

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("files");
  if (denied) return <DestinationDenied denied={denied} />;
  const shell = await loadAccountShell(session);
  const permissions = shell.capabilities?.permissions ?? [];
  const canUpload = permissions.includes("files.upload") && permissions.includes("files.read");
  const query = await searchParams;
  const type = query.resourceType,
    id = query.resourceId,
    fileId = query.fileId;
  const resources: ResourceOption[] = [];
  if ((type === "branch" || type === "machine") && typeof id === "string" && UUID.test(id))
    resources.push({
      type,
      id,
      label: `${type === "branch" ? "Sucursal" : "Máquina"} ${id.slice(0, 8)}`,
    });
  const [branches, linked, listed] = await Promise.all([
    branchOptions(session),
    typeof fileId === "string" && UUID.test(fileId)
      ? linkedFile(session, fileId)
      : Promise.resolve<LinkedFile>(
          fileId === undefined
            ? {}
            : { state: { kind: "not_found", message: "El enlace del archivo no es válido." } },
        ),
    accountFiles(session),
  ]);
  for (const option of branches)
    if (!resources.some((existing) => existing.id === option.id)) resources.push(option);
  return (
    <PageWidth
      as="main"
      id="main-content"
      className="file-layout file-layout--polished"
      data-page-ready="true"
    >
      <PageHeader
        title="Archivos privados"
        eyebrow="Evidencias y documentos"
        description="Consulta los archivos de tu cuenta disponibles para tu rol y sucursal. Las descargas son privadas."
      />
      {linked.state && <ServiceState kind={linked.state.kind} message={linked.state.message} />}
      <FileUploader
        key={session.contextId}
        contextId={session.contextId}
        csrfToken={session.csrfToken}
        resources={resources}
        initialFile={linked.file}
        canUpload={canUpload}
        enhancedControls
        initialFiles={listed.page?.items}
        nextCursor={listed.page?.nextCursor}
        listFailure={listed.failure}
      />
    </PageWidth>
  );
}
