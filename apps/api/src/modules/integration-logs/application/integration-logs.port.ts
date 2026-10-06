import type { IntegrationLogPage, IntegrationLogQuery } from "@ice24/contracts";

/** accountId null means the global ICE24 scope; otherwise every row is limited to it. */
export interface IntegrationLogScope {
  accountId: string | null;
}

export abstract class IntegrationLogsPort {
  abstract list(
    scope: IntegrationLogScope,
    query: IntegrationLogQuery,
  ): Promise<IntegrationLogPage>;
}
