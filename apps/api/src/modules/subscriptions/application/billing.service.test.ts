import { afterEach, describe, expect, it, vi } from "vitest";
import { BillingService } from "./billing.service.js";
import type { SubscriptionPort } from "./subscription.port.js";
import type { SubscriptionGateway } from "./subscription.gateway.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";

afterEach(() => vi.unstubAllEnvs());
describe("billing payment history", () => {
  function setup(current: { isDemo: boolean; providerCustomerId: string | null }) {
    const listPayments = vi.fn().mockResolvedValue({ items: [] });
    const run = vi.fn(async (_request, _operation, _body, _admin, _write, callback) =>
      callback({ accountId: "account", read: async () => current }),
    );
    return {
      run,
      listPayments,
      service: new BillingService(
        { run } as unknown as SubscriptionPort,
        { listPayments } as unknown as SubscriptionGateway,
      ),
    };
  }
  it("uses portal owner authorization but does not write", async () => {
    const f = setup({ isDemo: false, providerCustomerId: "cus_account" });
    const request = { correlationId: "trace" } as SecurityRequest;
    await f.service.payments(request);
    expect(f.run).toHaveBeenCalledWith(
      request,
      "billing:payments",
      null,
      false,
      false,
      expect.any(Function),
      true,
    );
    expect(f.listPayments).toHaveBeenCalledWith({
      accountId: "account",
      providerCustomerId: "cus_account",
      correlationId: "trace",
    });
  });
  it.each([
    { isDemo: true, providerCustomerId: "cus_demo" },
    { isDemo: false, providerCustomerId: null },
  ])("does not contact Stripe for $isDemo / $providerCustomerId", async (current) => {
    const f = setup(current);
    expect(await f.service.payments({} as SecurityRequest)).toEqual({ items: [] });
    expect(f.listPayments).not.toHaveBeenCalled();
  });
  it("does not contact Stripe in demo mode", async () => {
    vi.stubEnv("ICE24_DEMO_MODE", "1");
    const f = setup({ isDemo: false, providerCustomerId: "cus_real" });
    await f.service.payments({} as SecurityRequest);
    expect(f.listPayments).not.toHaveBeenCalled();
  });
});
