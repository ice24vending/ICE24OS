import type { AuditEvent, AuditPage, AuditQuery } from "@ice24/contracts";

export interface AuditScope {
  accountId: string | null;
  accountWide: boolean;
  branchIds: readonly string[];
  machineIds: readonly string[];
}
export abstract class AuditPort {
  abstract list(scope: AuditScope, query: AuditQuery): Promise<AuditPage>;
  abstract detail(scope: AuditScope, id: string): Promise<AuditEvent | null>;
}
