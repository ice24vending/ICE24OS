import type { IntegrationTracer } from "@ice24/observability";
import type { MalwareScanner } from "./files/scanner.js";
import { StorageFailure, type ScanStorage } from "./files/storage.js";
import { EmailProviderError, type EmailProvider } from "./notifications/email/provider.js";
import {
  ObservationUnavailableError,
  type SubscriptionObservationSource,
} from "./scheduler/reconciliation.js";

const providerFailure = (code: string, retryable: boolean) => ({ errorCode: code, retryable });

/** Object storage of the scan worker, one `object_storage` log per operation. */
export function tracedScanStorage(storage: ScanStorage, tracer: IntegrationTracer): ScanStorage {
  const call = <T>(operation: string, bucket: string, objectKey: string, work: () => Promise<T>) =>
    tracer.trace(
      {
        integration: "object_storage",
        operation,
        provider: "supabase-storage",
        effectKey: `${bucket}/${objectKey}`,
        details: { bucket },
        onError: (error) =>
          providerFailure(
            error instanceof StorageFailure ? error.code : "STORAGE_UNAVAILABLE",
            !(error instanceof StorageFailure && error.code === "OBJECT_TOO_LARGE"),
          ),
      },
      work,
    );
  return {
    download: (bucket, objectKey, maxBytes) =>
      call("object.download", bucket, objectKey, () =>
        storage.download(bucket, objectKey, maxBytes),
      ),
    upload: (bucket, objectKey, bytes, mediaType) =>
      call("object.upload", bucket, objectKey, () =>
        storage.upload(bucket, objectKey, bytes, mediaType),
      ),
    remove: (bucket, objectKey) =>
      call("object.remove", bucket, objectKey, () => storage.remove(bucket, objectKey)),
  };
}

/** Antimalware engine: the verdict is recorded, the bytes and threat signature are not. */
export function tracedScanner(scanner: MalwareScanner, tracer: IntegrationTracer): MalwareScanner {
  return {
    engine: scanner.engine,
    scan: (bytes) =>
      tracer.trace(
        {
          integration: "antimalware",
          operation: "file.scan",
          provider: scanner.engine,
          details: { sizeBytes: bytes.length },
          onSuccess: (report) => ({ responseCode: report.verdict }),
          onError: (error) =>
            providerFailure(
              error instanceof Error && /^SCANNER_[A-Z_]+$/u.test(error.message)
                ? error.message
                : "SCANNER_UNAVAILABLE",
              true,
            ),
        },
        () => scanner.scan(bytes),
      ),
  };
}

/** Email provider: effect key = message idempotency key, so attempts of one email line up. */
export function tracedEmailProvider(
  provider: EmailProvider,
  tracer: IntegrationTracer,
): EmailProvider {
  return {
    name: provider.name,
    send: (email) =>
      tracer.trace(
        {
          integration: "email",
          operation: "message.send",
          provider: provider.name,
          effectKey: email.idempotencyKey,
          details: { template: email.tags.template ?? null },
          onSuccess: () => ({ responseCode: "accepted" }),
          onError: (error) =>
            error instanceof EmailProviderError
              ? providerFailure(error.code, !error.permanent)
              : providerFailure("PROVIDER_UNAVAILABLE", true),
        },
        () => provider.send(email),
      ),
  };
}

/** Stripe observations of the reconciliation task (fake source until validated remotely). */
export function tracedObservationSource(
  source: SubscriptionObservationSource,
  tracer: IntegrationTracer,
): SubscriptionObservationSource {
  return {
    name: source.name,
    observe: (reference) =>
      tracer.trace(
        {
          integration: "stripe",
          operation: "subscription.retrieve",
          provider: source.name,
          context: { accountId: reference.accountId },
          onSuccess: (observation) => ({ responseCode: observation === null ? "404" : "200" }),
          onError: (error) =>
            providerFailure(
              error instanceof ObservationUnavailableError
                ? "STRIPE_UNAVAILABLE"
                : "STRIPE_OBSERVATION_FAILED",
              error instanceof ObservationUnavailableError,
            ),
        },
        () => source.observe(reference),
      ),
  };
}
