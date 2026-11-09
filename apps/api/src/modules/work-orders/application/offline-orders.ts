import { Inject, Injectable } from "@nestjs/common";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { WorkOrdersStore } from "../infrastructure/work-orders.store.js";

/** Public module boundary: synchronization never reads maintenance tables directly. */
@Injectable()
export class OfflineOrders {
  constructor(@Inject(WorkOrdersStore) private readonly store: WorkOrdersStore) {}
  download(request: SecurityRequest, id: string, input: unknown) {
    return this.store.downloadOffline(request, id, input);
  }
  release(request: SecurityRequest, id: string, input: unknown) {
    return this.store.releaseOffline(request, id, input);
  }
  access(request: SecurityRequest) {
    return this.store.offlineAccess(request);
  }
  reportPurge(userId: string, input: unknown, correlationId: string) {
    return this.store.reportOfflinePurge(userId, input, correlationId);
  }
  conflicts(request: SecurityRequest) {
    return this.store.listConflicts(request);
  }
  resolve(request: SecurityRequest, id: string, input: unknown) {
    return this.store.resolveConflict(request, id, input);
  }
  synchronize(request: SecurityRequest, input: unknown) {
    return this.store.syncOffline(request, input);
  }
}
