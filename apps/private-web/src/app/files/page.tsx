import { redirect } from "next/navigation";
import { readBrowserSession, type BrowserSession } from "../../server/session/session";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { FileUploader, type ResourceOption } from "../../features/files/uploader";
import { UUID } from "../../features/files/bff";
import "../../features/files/files.css";

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

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const query = await searchParams;
  const type = query.resourceType,
    id = query.resourceId;
  const resources: ResourceOption[] = [];
  if ((type === "branch" || type === "machine") && typeof id === "string" && UUID.test(id))
    resources.push({
      type,
      id,
      label: `${type === "branch" ? "Sucursal" : "Máquina"} ${id.slice(0, 8)}`,
    });
  for (const option of await branchOptions(session))
    if (!resources.some((existing) => existing.id === option.id)) resources.push(option);
  return (
    <main id="main-content" className="file-layout">
      <nav aria-label="Navegación de archivos">
        <a href="/workspace">← Espacio de trabajo</a>
      </nav>
      <header>
        <p className="eyebrow">Evidencias y documentos</p>
        <h1>Archivos privados</h1>
        <p>
          Los archivos se suben directo al almacenamiento privado de tu cuenta con una autorización
          temporal. No existen enlaces públicos: cada descarga genera un enlace que vence en minutos
          y queda auditada.
        </p>
      </header>
      <FileUploader
        key={session.contextId}
        contextId={session.contextId}
        csrfToken={session.csrfToken}
        resources={resources}
        initialMessage=""
      />
    </main>
  );
}
