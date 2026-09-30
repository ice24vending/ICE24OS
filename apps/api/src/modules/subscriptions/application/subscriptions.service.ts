import { randomUUID } from "node:crypto";
import {
  extendDemoSchema,
  provisionSubscriptionSchema,
  type SubscriptionView,
} from "@ice24/contracts";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { SubscriptionPort } from "./subscription.port.js";
import { BadRequestException } from "@nestjs/common";
import { getHeader } from "../../../common/security/security-request.js";
import {
  newSubscription,
  SubscriptionRuleError,
  transitionSubscription,
  type SubscriptionCommand,
} from "../domain/subscription.js";

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(SubscriptionPort) private readonly db: SubscriptionPort) {}

  read(request: SecurityRequest): Promise<SubscriptionView> {
    return this.db.run(request, "read", null, false, false, async (tx) => {
      const state = await tx.read(tx.accountId);
      const access = await tx.access(tx.accountId);
      return { ...state, accessMode: access, audit: await tx.audit(state.id) };
    });
  }
  extendDemo(request: SecurityRequest, id: string, body: unknown): Promise<SubscriptionView> {
    const input = extendDemoSchema.parse(body),
      version = expectedVersion(request);
    return this.db.run(request, `demo:${id}:extend`, input, true, true, async (tx) => {
      const previous = await tx.readDemo(id);
      if (previous.version !== version) throw new ConflictException("Subscription version changed");
      const next = this.transition(
        previous,
        { type: "extend_demo", newExpiresAt: input.newExpiresAt },
        tx.now,
      );
      await tx.save(next, previous, "DemoExtended", input.reason);
      return {
        ...next,
        accessMode: await tx.access(next.accountId),
        audit: await tx.audit(next.id),
      };
    });
  }
  // Application entry points for trusted provisioning/Stripe jobs. They are not
  // HTTP state setters; F5-02 verifies Stripe before invoking payment transitions.
  provisionDemo(request: SecurityRequest, body: unknown) {
    const input = provisionSubscriptionSchema.parse(body);
    return this.db.run(request, "demo:provision", input, true, true, async (tx) => {
      const accountId = randomUUID();
      await tx.createAccount(accountId, input.accountName, input.accountType, input.ownerUserId);
      const next = newSubscription({ id: randomUUID(), accountId, demo: true, now: tx.now });
      await tx.save(
        next,
        null,
        "DemoCreated",
        "Demo initialized from equipment-v1 synthetic master",
      );
      await tx.seedDemo(accountId);
      return next;
    });
  }
  provisionProduction(request: SecurityRequest, demoId: string, body: unknown) {
    const input = provisionSubscriptionSchema.parse(body);
    return this.db.run(request, `demo:${demoId}:production`, input, true, true, async (tx) => {
      const demo = await tx.readDemo(demoId);
      const existing = await tx.conversion(demo.accountId);
      if (existing)
        throw new ConflictException("A production account has already been created for this demo");
      const accountId = randomUUID();
      await tx.createAccount(accountId, input.accountName, input.accountType, input.ownerUserId);
      const next = newSubscription({ id: randomUUID(), accountId, demo: false, now: tx.now });
      await tx.save(
        next,
        null,
        "ProductionAccountCreated",
        "Clean production account created without demo data",
      );
      await tx.linkConversion(demo.accountId, accountId);
      return next;
    });
  }
  applyTrustedCommand(
    request: SecurityRequest,
    accountId: string,
    command: SubscriptionCommand,
    reason: string,
  ) {
    const version = expectedVersion(request);
    if (reason.trim().length < 10 || reason.length > 1000)
      throw new SubscriptionRuleError("A reason is required");
    return this.db.run(
      request,
      `subscription:${accountId}:${command.type}`,
      { command, reason },
      true,
      true,
      async (tx) => {
        const previous = await tx.read(accountId, true);
        if (previous.version !== version)
          throw new ConflictException("Subscription version changed");
        const next = this.transition(previous, command, tx.now);
        await tx.save(next, previous, command.type, reason);
        return next;
      },
    );
  }
  private transition(...args: Parameters<typeof transitionSubscription>) {
    try {
      return transitionSubscription(...args);
    } catch (error) {
      if (error instanceof SubscriptionRuleError) throw new ConflictException(error.message);
      throw error;
    }
  }
}

function expectedVersion(request: SecurityRequest): number {
  const match = getHeader(request, "if-match")?.match(/^"?([1-9][0-9]*)"?$/);
  const version = Number(match?.[1]);
  if (!Number.isSafeInteger(version)) throw new BadRequestException("If-Match is required");
  return version;
}
