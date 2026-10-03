import { NextResponse } from "next/server";
import { createUploadSessionRequestSchema, uploadSessionSchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { failure, guard, noStore, upstreamFailure } from "../../../../features/files/bff";

/** FIL-001 through the BFF. The file bytes never pass here: only the declared metadata. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const checked = await guard(request, form);
    if ("error" in checked) return checked.error;
    const body = createUploadSessionRequestSchema.safeParse({
      fileName: form.get("fileName"),
      mediaType: form.get("mediaType"),
      sizeBytes: Number(form.get("sizeBytes")),
      purpose: form.get("purpose"),
      relatedResource: { type: form.get("resourceType"), id: form.get("resourceId") },
    });
    if (!body.success) {
      const messages = body.error.issues.map((issue) => issue.message);
      if (messages.includes("PAYLOAD_TOO_LARGE"))
        return failure("El archivo supera el tamaño permitido para este propósito.", 413);
      if (messages.includes("UNSUPPORTED_MEDIA_TYPE"))
        return failure("Ese tipo de archivo no está permitido para este propósito.", 415);
      return failure("Revisa el nombre, el tipo y el propósito del archivo.", 400);
    }
    const response = await callPrivateApi("files/upload-sessions", checked.session, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": String(form.get("key")) },
      body: JSON.stringify(body.data),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return upstreamFailure(response);
    return NextResponse.json(uploadSessionSchema.parse(await response.json()), {
      status: 201,
      headers: noStore,
    });
  } catch {
    return failure("No fue posible autorizar la carga. Intenta nuevamente.", 503);
  }
}
