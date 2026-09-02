export interface SupabaseSessionResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly user?: { readonly id?: string };
}

export const getSupabaseConfiguration = () => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (url === undefined || anonKey === undefined)
    throw new Error("Supabase Auth is not configured");
  return { url: url.replace(/\/$/, ""), anonKey };
};

export const supabaseHeaders = (accessToken?: string): Readonly<Record<string, string>> => {
  const { anonKey } = getSupabaseConfiguration();
  return {
    accept: "application/json",
    apikey: anonKey,
    "content-type": "application/json",
    ...(accessToken === undefined ? {} : { authorization: `Bearer ${accessToken}` }),
  };
};

export const parseSupabaseSession = async (
  response: Response,
): Promise<SupabaseSessionResponse> => {
  if (!response.ok) throw new Error("Authentication request failed");
  const body = (await response.json()) as Partial<SupabaseSessionResponse>;
  if (
    typeof body.access_token !== "string" ||
    typeof body.refresh_token !== "string" ||
    typeof body.expires_in !== "number"
  ) {
    throw new Error("Invalid authentication response");
  }
  return body as SupabaseSessionResponse;
};

export const readIdentitySubject = (accessToken: string): string | undefined => {
  try {
    const payload = accessToken.split(".")[1];
    if (payload === undefined) return undefined;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
    };
    return typeof claims.sub === "string" ? claims.sub : undefined;
  } catch {
    return undefined;
  }
};

export const callPrivateApi = async (
  path: string,
  session: { readonly accessToken: string; readonly contextId?: string | undefined },
  init: RequestInit = {},
): Promise<Response> => {
  const baseUrl = process.env.PRIVATE_API_URL ?? "http://127.0.0.1:3001/v1";
  return fetch(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${session.accessToken}`,
      ...(session.contextId === undefined ? {} : { "x-ice24-context-id": session.contextId }),
      ...init.headers,
    },
    cache: "no-store",
  });
};

export const recordSecurityEvent = async (input: {
  readonly eventType: string;
  readonly result: "SUCCESS" | "DENIED" | "FAILED";
  readonly identitySubject?: string | undefined;
  readonly reason?: string | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}): Promise<void> => {
  const key = process.env.BFF_API_SHARED_SECRET;
  if (key === undefined) return;
  const baseUrl = process.env.PRIVATE_API_URL ?? "http://127.0.0.1:3001/v1";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/internal/security-events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ice24-bff-key": key,
    },
    body: JSON.stringify({ ...input, correlationId: crypto.randomUUID() }),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("Security event was not accepted");
};
