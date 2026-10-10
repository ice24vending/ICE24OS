import { request } from "../account-shell/failure";

export interface SendOptions {
  readonly method?: "POST" | "PUT" | "PATCH";
  /** Expected row version, sent as If-Match (F4-19/F4-20 answer 412 when it is stale). */
  readonly version?: number | undefined;
  /** Idempotency-Key; reuse it when retrying the same body (API.md §6.1). */
  readonly key?: string;
}

/** Equipment BFF calls of the component and frequency screens (TASK-F4-22). */
export interface EquipmentClient {
  get<T>(path: string): Promise<T>;
  send<T>(path: string, body: unknown, options?: SendOptions): Promise<T>;
}

/**
 * Calls `/api/equipment` with the workspace context and CSRF token. Failures are thrown as
 * `FailureError` with their screen state (forbidden, conflict, read-only, offline…) and the
 * API.md code the BFF forwards, e.g. WARRANTY_WARNING_CONFIRMATION_REQUIRED (RA-01-D1).
 */
export function createEquipmentClient(contextId: string, csrfToken: string): EquipmentClient {
  const headers = { "x-ice24-workspace-context": contextId };
  return {
    async get<T>(path: string) {
      const response = await request(
        `/api/equipment?path=${encodeURIComponent(path)}`,
        { cache: "no-store", headers },
        "No fue posible cargar la información.",
      );
      return (await response.json()) as T;
    },
    async send<T>(path: string, body: unknown, options: SendOptions = {}) {
      const form = new FormData();
      form.set("csrfToken", csrfToken);
      form.set("path", path);
      form.set("method", options.method ?? "POST");
      form.set("body", JSON.stringify(body));
      form.set("key", options.key ?? crypto.randomUUID());
      if (options.version) form.set("version", String(options.version));
      const response = await request(
        "/api/equipment",
        { method: "POST", body: form, headers },
        "No fue posible guardar el cambio.",
      );
      return (await response.json()) as T;
    },
  };
}
