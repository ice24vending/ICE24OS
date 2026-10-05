import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import {
  emailProviderEventOutcomeSchema,
  type EmailProviderEvent,
  type EmailProviderEventOutcome,
} from "@ice24/contracts";
import { Pool } from "pg";
import {
  EmailProviderEventConflict,
  EmailTrackingPort,
} from "../application/email-tracking.port.js";

@Injectable()
export class EmailTrackingDatabase extends EmailTrackingPort implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  async onModuleDestroy() {
    await this.pool.end();
  }

  override async record(
    provider: string,
    event: EmailProviderEvent,
    payloadSha256: string,
    correlationId: string,
  ): Promise<EmailProviderEventOutcome> {
    try {
      const result = await this.pool.query<{ outcome: string }>(
        "select email.record_provider_event($1,$2,$3,$4,$5::timestamptz,$6,$7::uuid) as outcome",
        [
          provider,
          event.providerEventId,
          event.type,
          event.providerMessageId,
          event.occurredAt,
          payloadSha256,
          correlationId,
        ],
      );
      return emailProviderEventOutcomeSchema.parse(result.rows[0]?.outcome);
    } catch (error) {
      if ((error as { code?: string }).code === "IC409") throw new EmailProviderEventConflict();
      throw error;
    }
  }
}
