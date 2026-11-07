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
  synchronize(request: SecurityRequest, input: unknown) {
    return this.store.syncOffline(request, input);
  }
}
