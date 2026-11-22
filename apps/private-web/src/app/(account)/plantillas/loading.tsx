"use client";

import { PageHeader, PageWidth } from "@ice24/ui";
import { usePathname, useSearchParams } from "next/navigation";

import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingTemplates() {
  const pathname = usePathname();
  const query = useSearchParams();
  const baseExample =
    query.get("ejemplo") === "base" || pathname.startsWith("/plantillas/detalle/");
  if (baseExample) {
    const detail = pathname.startsWith("/plantillas/detalle");
    const title = detail ? "Detalle" : "Máquinas";
    return (
      <PageWidth
        as="main"
        variant={detail ? "reading" : "full"}
        id="main-content"
        className="template-screen template-screen--base"
        aria-label={title}
        aria-busy="true"
        data-page-ready="false"
        data-page-breadcrumbs={pathname.startsWith("/plantillas/detalle/") ? "true" : undefined}
      >
        <PageHeader title={title} />
        <ServiceState kind="loading" skeleton="cards" title="Cargando registros…" />
      </PageWidth>
    );
  }
  return (
    <main id="main-content" className="private-shell template-screen">
      <ServiceState kind="loading" skeleton="cards" title="Cargando la plantilla…" />
    </main>
  );
}
