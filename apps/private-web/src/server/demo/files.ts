import {
  fileCursorSchema,
  fileListQuerySchema,
  fileObjectSchema,
  type FileObject,
} from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { demoIds, demoUserId } from "./fixtures";

export function demoFiles(request: DemoRequest): FileObject[] {
  if (request.state.scenario === "empty") return [];
  const { account, now } = request;
  const names = [
    "Acta de entrega",
    "Análisis de agua",
    "Condensador después de limpieza",
    "Filtro de agua",
    "Diagrama eléctrico",
    "Evidencia de fuga",
    "Garantía del compresor",
    "Revisión de conexiones",
  ];
  const statuses = [
    "available",
    "available",
    "processing",
    "available",
    "quarantined",
    "rejected",
    "available",
    "pending",
  ] as const;
  const rows = names.map((name, index) => {
    const machine = account.machines[index % account.machines.length]!;
    const relatedResource =
      index === 0
        ? { type: "account" as const, id: account.id }
        : index === 1
          ? { type: "branch" as const, id: account.branches[0]!.id }
          : { type: "machine" as const, id: machine.id };
    const pdf = [0, 1, 4, 6].includes(index);
    const createdAt = new Date(now - index * 86_400_000 - 3_600_000).toISOString();
    return fileObjectSchema.parse({
      id: demoIds.request(12000 + index + (account.key === "polar" ? 0 : 100)),
      ownerAccountId: account.id,
      fileName: `${name}${index > 1 ? ` · ${machine.code}` : ""}.${pdf ? "pdf" : "jpg"}`,
      mediaType: pdf ? "application/pdf" : "image/jpeg",
      sizeBytes: [148503, 382001, 2401345, 875630, 127450, 3419200, 214508, 962345][index],
      purpose:
        index === 1 ? "laboratory_analysis_original" : pdf ? "document_original" : "machine_photo",
      relatedResource,
      visibility: "private",
      status: statuses[index],
      audit: {
        createdAt,
        updatedAt: createdAt,
        createdBy: demoUserId(index % 2 ? "technician" : "owner"),
        rowVersion: 1,
      },
    });
  });
  return rows.filter((file) =>
    file.relatedResource.type === "account"
      ? request.subject.accountWide && request.can("files.read")
      : request.can(
          "files.read",
          file.relatedResource.type === "branch"
            ? { branchId: file.relatedResource.id }
            : { machineId: file.relatedResource.id },
        ),
  );
}

export function demoFilesResponse(
  request: DemoRequest,
  route: string,
  params: URLSearchParams,
): Response {
  const error = (status: number, code: string) =>
    Response.json(
      {
        error: {
          code,
          message: "Consulta de archivos no disponible",
          correlationId: demoIds.correlation(999),
          timestamp: new Date(request.now).toISOString(),
        },
      },
      { status },
    );
  if (!request.can("files.read")) return error(403, "FORBIDDEN");
  const files = demoFiles(request);
  if (route !== "files") {
    const file = files.find((item) => route === `files/${item.id}`);
    return file ? Response.json(file) : error(404, "NOT_FOUND");
  }
  const query = fileListQuerySchema.safeParse(Object.fromEntries(params));
  if (!query.success) return error(400, "VALIDATION_FAILED");
  let rows = files;
  if (query.data.cursor) {
    try {
      const before = fileCursorSchema.parse(
        JSON.parse(Buffer.from(query.data.cursor, "base64url").toString("utf8")),
      );
      rows = rows.filter(
        (file) =>
          file.audit.createdAt < before.createdAt ||
          (file.audit.createdAt === before.createdAt && file.id < before.id),
      );
    } catch {
      return error(400, "VALIDATION_FAILED");
    }
  }
  rows.sort(
    (a, b) => b.audit.createdAt.localeCompare(a.audit.createdAt) || b.id.localeCompare(a.id),
  );
  const items = rows.slice(0, query.data.limit);
  const last = items.at(-1);
  return Response.json({
    items,
    nextCursor:
      rows.length > items.length && last
        ? Buffer.from(JSON.stringify({ createdAt: last.audit.createdAt, id: last.id })).toString(
            "base64url",
          )
        : null,
  });
}
