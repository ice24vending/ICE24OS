"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  Button,
  ButtonLink,
  EmptyState,
  KpiCard,
  ListLayout,
  Pagination,
  ReadOnlyIndicator,
  Select,
  StatusTag,
  Table,
  TextField,
  type TableColumn,
} from "@ice24/ui";

import { useAccountAccess } from "../account-shell/access-provider";
import { withOrigin } from "../navigation/deep-links";
import { OPERATION, useTemplateStatus, type TemplateData, type TemplateMachine } from "./shared";

const PAGE_SIZE = 4;

const COLUMNS: readonly TableColumn<TemplateMachine>[] = [
  {
    id: "code",
    header: "Código",
    cell: (m) => m.code,
    sortValue: (m) => m.code,
    mono: true,
    mobile: "title",
  },
  { id: "name", header: "Máquina", cell: (m) => m.name, sortValue: (m) => m.name },
  { id: "branch", header: "Sucursal", cell: (m) => m.branch, sortValue: (m) => m.branch },
  {
    id: "operation",
    header: "Operación",
    cell: (m) => (
      <StatusTag tone={OPERATION[m.operation].tone}>{OPERATION[m.operation].label}</StatusTag>
    ),
  },
  {
    id: "production",
    header: "Hielo hoy",
    numeric: true,
    sortValue: (m) => m.productionKg,
    cell: (m) => (m.productionKg === null ? "Sin datos" : `${m.productionKg} kg`),
  },
  { id: "service", header: "Último servicio", cell: (m) => m.lastService, priority: "low" },
];

/**
 * List template (F6-09): filters, table → cards on mobile, pagination and every state. Filters
 * and page live in the URL (F6-11): a shared link, «Regresar» from the detail and the browser's
 * back button all show the list as it was.
 */
export function ListScreen({ data }: { data: TemplateData }) {
  const { canWrite, blockedText } = useAccountAccess();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const search = params.get("q") ?? "";
  const branch = params.get("ubicacion") ?? "";
  const page = Math.max(1, Number.parseInt(params.get("pagina") ?? "1", 10) || 1);
  // Replace, not push: typing a filter must not fill the history; the origin stays one entry.
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(changes))
      if (value && value !== "1") next.set(name, value);
      else next.delete(name);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const setPage = (value: number) => update({ pagina: String(value) });
  const here = `${pathname}${params.size ? `?${params.toString()}` : ""}`;
  const branches = [...new Set(data.machines.map((m) => m.branch))];
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.machines.filter(
      (m) =>
        (!branch || m.branch === branch) &&
        (!term || `${m.code} ${m.name}`.toLowerCase().includes(term)),
    );
  }, [data.machines, search, branch]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount); // A shared link may name a page that no longer exists.
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const clear = () => update({ q: "", ubicacion: "", pagina: "" });
  const request = canWrite ? (
    <ButtonLink href={withOrigin("/plantillas/asistente", here)} icon="plus">
      Solicitar alta
    </ButtonLink>
  ) : (
    <Button icon="plus" disabledReason={blockedText}>
      Solicitar alta
    </Button>
  );
  const status = useTemplateStatus(data, {
    title: "Aún no hay máquinas activas en esta cuenta.",
    message: "Cuando ICE24 valide una solicitud de alta, la máquina aparecerá aquí.",
    action: canWrite ? request : undefined,
  });
  const available = data.machines.filter((m) => m.operation === "available").length;
  return (
    <main id="main-content" className="private-shell template-screen">
      <ListLayout
        eyebrow={`Plantilla de lista · ${data.accountName}`}
        title="Máquinas"
        description="Equipos de la cuenta con su estado de operación y la producción de hoy."
        actions={request}
        summary={
          status ? undefined : (
            <>
              <KpiCard label="Equipos" value={data.machines.length} period="Ahora" />
              <KpiCard label="Disponibles" value={available} period="Ahora" />
            </>
          )
        }
        filters={
          <>
            <TextField
              label="Buscar"
              placeholder="Código o nombre"
              value={search}
              onChange={(event) => update({ q: event.target.value, pagina: "" })}
            />
            <Select
              label="Sucursal"
              placeholder="Todas"
              options={branches.map((name) => ({ value: name, label: name }))}
              value={branch}
              onChange={(event) => update({ ubicacion: event.target.value, pagina: "" })}
            />
          </>
        }
        activeFilters={(search ? 1 : 0) + (branch ? 1 : 0)}
        banner={data.readOnly ? <ReadOnlyIndicator /> : undefined}
        status={status}
        pagination={
          <Pagination
            page={current}
            pageCount={pageCount}
            totalItems={rows.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        }
      >
        <Table
          caption="Máquinas de la cuenta"
          captionHidden
          columns={COLUMNS}
          rows={shown}
          getRowId={(m) => m.id}
          getRowLabel={(m) => m.code}
          rowActions={(m) => (
            <ButtonLink
              href={withOrigin(`/plantillas/detalle?machine=${m.id}`, here)}
              variant="tertiary"
              size="sm"
            >
              Ver<span className="ids-visually-hidden"> {m.code}</span>
            </ButtonLink>
          )}
          empty={
            <EmptyState
              title="No hay máquinas que coincidan con los filtros."
              action={
                <Button variant="secondary" onClick={clear}>
                  Limpiar filtros
                </Button>
              }
            />
          }
        />
      </ListLayout>
    </main>
  );
}
