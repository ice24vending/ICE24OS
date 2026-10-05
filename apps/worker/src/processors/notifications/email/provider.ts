import { createHash } from "node:crypto";

/**
 * Email provider port (TRD 17, Architecture 45–47). The provider is not approved yet
 * (ADR-019 "en revisión", DEC-019), so the worker only depends on this interface. A real
 * adapter must:
 * - honor `idempotencyKey` so a retried send after an unrecorded success is not delivered twice;
 * - enforce a short timeout and map failures to `EmailProviderError` codes (never raw messages);
 * - keep its SDK inside the adapter and return only the provider message id.
 */
export interface OutboundEmail {
  readonly idempotencyKey: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  /** Technical correlation only (message id, template); never personal data. */
  readonly tags: Readonly<Record<string, string>>;
}

export interface EmailProvider {
  /** Stable lowercase name stored with the provider message id. */
  readonly name: string;
  send(email: OutboundEmail): Promise<{ readonly providerMessageId: string }>;
}

export type EmailProviderErrorCode =
  "PROVIDER_UNAVAILABLE" | "PROVIDER_TIMEOUT" | "PROVIDER_RATE_LIMITED" | "PROVIDER_REJECTED";

export class EmailProviderError extends Error {
  /** A permanent rejection (invalid address, refused content) is not retried automatically. */
  public readonly permanent: boolean;

  public constructor(public readonly code: EmailProviderErrorCode) {
    super(code);
    this.name = "EmailProviderError";
    this.permanent = code === "PROVIDER_REJECTED";
  }
}

export interface CapturedEmail extends OutboundEmail {
  readonly providerMessageId: string;
}

/**
 * Local/test double. Keeps accepted messages in memory, returns a deterministic id per
 * idempotency key (a repeated key returns the first id without capturing twice) and can be
 * told to fail. It never contacts the network, so it is refused outside development and test.
 */
export class LocalEmailProvider implements EmailProvider {
  public readonly name = "local";
  private readonly accepted = new Map<string, CapturedEmail>();
  private failure: EmailProviderErrorCode | null = null;
  /** Calls received, including failed ones and repeated idempotency keys. */
  public calls = 0;

  public failWith(code: EmailProviderErrorCode | null): void {
    this.failure = code;
  }

  public get outbox(): readonly CapturedEmail[] {
    return [...this.accepted.values()];
  }

  public send(email: OutboundEmail): Promise<{ readonly providerMessageId: string }> {
    this.calls += 1;
    if (this.failure !== null) return Promise.reject(new EmailProviderError(this.failure));
    const previous = this.accepted.get(email.idempotencyKey);
    if (previous) return Promise.resolve({ providerMessageId: previous.providerMessageId });
    const providerMessageId = `local-${createHash("sha256").update(email.idempotencyKey).digest("hex").slice(0, 32)}`;
    this.accepted.set(email.idempotencyKey, { ...email, providerMessageId });
    return Promise.resolve({ providerMessageId });
  }
}

export type EmailProviderSelection =
  { readonly provider: EmailProvider } | { readonly provider: null; readonly reason: string };

/**
 * `EMAIL_PROVIDER=local` (development and test only). No production adapter exists until
 * ADR-019 is accepted: any other value leaves the worker without a provider, so messages stay
 * QUEUED and visible instead of burning retries.
 */
export function emailProviderFromEnvironment(env: NodeJS.ProcessEnv): EmailProviderSelection {
  const kind = env.EMAIL_PROVIDER?.trim().toLowerCase() ?? "";
  const environment = env.NODE_ENV ?? "development";
  if (kind === "local") {
    if (environment !== "development" && environment !== "test")
      return { provider: null, reason: "LOCAL_EMAIL_PROVIDER_FORBIDDEN" };
    return { provider: new LocalEmailProvider() };
  }
  return {
    provider: null,
    reason: kind ? "EMAIL_PROVIDER_PENDING_DECISION" : "EMAIL_PROVIDER_NOT_CONFIGURED",
  };
}

/**
 * Origin used to build links in emails: `PRIVATE_WEB_URL` without path, query or credentials;
 * HTTPS is mandatory outside development and test.
 */
export function emailLinkBaseFromEnvironment(env: NodeJS.ProcessEnv): string | null {
  const raw = env.PRIVATE_WEB_URL?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const environment = env.NODE_ENV ?? "development";
  const secure =
    url.protocol === "https:" ||
    (url.protocol === "http:" && (environment === "development" || environment === "test"));
  if (!secure || url.username || url.password || url.search || url.hash) return null;
  return url.origin;
}
