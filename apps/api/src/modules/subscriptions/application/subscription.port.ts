import type { Subscription, SubscriptionView } from "@ice24/contracts";
import type { SecurityRequest } from "../../../common/security/security-request.js";

export interface SubscriptionUnitOfWork {
  readonly accountId: string;
  readonly now: string;
  read(accountId: string, lock?: boolean): Promise<Subscription>;
  readDemo(id: string): Promise<Subscription>;
  save(
    next: Subscription,
    previous: Subscription | null,
    event: string,
    reason: string,
  ): Promise<void>;
  access(accountId: string): Promise<SubscriptionView["accessMode"]>;
  audit(id: string): Promise<SubscriptionView["audit"]>;
  createAccount(
    id: string,
    name: string,
    type: "INDIVIDUAL" | "COMPANY",
    ownerId: string,
  ): Promise<void>;
  seedDemo(accountId: string): Promise<void>;
  conversion(demoAccountId: string): Promise<string | undefined>;
  linkConversion(demoAccountId: string, productionAccountId: string): Promise<void>;
}
export abstract class SubscriptionPort {
  abstract run<T>(
    request: SecurityRequest,
    operation: string,
    body: unknown,
    admin: boolean,
    write: boolean,
    callback: (tx: SubscriptionUnitOfWork) => Promise<T>,
  ): Promise<T>;
}
