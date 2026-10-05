import { createHmac, timingSafeEqual } from "node:crypto";
import { emailProviderEventSchema, type EmailProviderEvent } from "@ice24/contracts";
import {
  EmailWebhookVerifier,
  InvalidEmailWebhookSignature,
} from "../application/email-tracking.port.js";

export const LOCAL_EMAIL_SIGNATURE_HEADER = "x-ice24-email-signature";
const TOLERANCE_SECONDS = 300;
const MAX_EVENTS = 100;

/** Body of the local double: `{ "events": EmailProviderEvent[] }` with 1 to 100 events. */
function parseBody(body: string): EmailProviderEvent[] {
  const parsed = JSON.parse(body) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    throw new TypeError("Invalid body");
  const keys = Object.keys(parsed);
  const events = (parsed as { events?: unknown }).events;
  if (
    keys.length !== 1 ||
    !Array.isArray(events) ||
    events.length < 1 ||
    events.length > MAX_EVENTS
  )
    throw new TypeError("Invalid body");
  return events.map((event) => emailProviderEventSchema.parse(event));
}

/** Builds the header the local provider double sends: `t=<unix seconds>,v1=<hex HMAC>`. */
export function signLocalEmailWebhook(rawBody: string, secret: string, timestamp: number): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

/**
 * Verifier for the local/test provider double (development and test only). HMAC-SHA256 over
 * `timestamp.body` with a shared secret, constant-time comparison and a 5-minute window
 * against replays. The approved provider (ADR-019) brings its own verifier behind the same
 * port.
 */
export class LocalEmailWebhookVerifier extends EmailWebhookVerifier {
  readonly provider = "local";

  constructor(
    private readonly secret: string,
    private readonly now: () => number = () => Date.now(),
  ) {
    super();
  }

  verify(
    rawBody: Uint8Array,
    headers: Readonly<Record<string, string | undefined>>,
  ): EmailProviderEvent[] {
    const header = headers[LOCAL_EMAIL_SIGNATURE_HEADER];
    const match = header ? /^t=(\d{1,12}),v1=([0-9a-f]{64})$/u.exec(header) : null;
    if (!match) throw new InvalidEmailWebhookSignature();
    const timestamp = Number(match[1]);
    if (Math.abs(this.now() / 1000 - timestamp) > TOLERANCE_SECONDS)
      throw new InvalidEmailWebhookSignature();
    const body = Buffer.from(rawBody).toString("utf8");
    const expected = createHmac("sha256", this.secret).update(`${timestamp}.${body}`).digest();
    const received = Buffer.from(match[2]!, "hex");
    if (received.length !== expected.length || !timingSafeEqual(received, expected))
      throw new InvalidEmailWebhookSignature();
    return parseBody(body);
  }
}

/**
 * `EMAIL_WEBHOOK_PROVIDER=local` with `EMAIL_WEBHOOK_SECRET` (32+ characters) in development
 * or test. Anything else returns null: the endpoint answers 503 until a provider is approved.
 */
export function emailWebhookVerifierFromEnvironment(
  env: NodeJS.ProcessEnv,
): EmailWebhookVerifier | null {
  const kind = env.EMAIL_WEBHOOK_PROVIDER?.trim().toLowerCase();
  const environment = env.NODE_ENV ?? "development";
  const secret = env.EMAIL_WEBHOOK_SECRET ?? "";
  if (kind !== "local" || (environment !== "development" && environment !== "test")) return null;
  return secret.length >= 32 ? new LocalEmailWebhookVerifier(secret) : null;
}
