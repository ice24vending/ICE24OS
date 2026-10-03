import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { NotFoundException, type ExecutionContext } from "@nestjs/common";
import type { AuthorizationSubject } from "@ice24/authorization";
import { apiErrorSchema } from "@ice24/contracts";
import {
  AccountReadOnlyException,
  AccountWriteGuard,
  AllowReadOnlyOperation,
} from "./account-write.guard.js";

class Endpoints {
  write() {}
  @AllowReadOnlyOperation("billing-recovery") billing() {}
  @AllowReadOnlyOperation("identity-self-service") session() {}
  @AllowReadOnlyOperation("protected-download") download() {}
}
function fixture(
  method: string,
  mode: "ACTIVE" | "READ_ONLY" | "SUSPENDED" = "READ_ONLY",
  handler = Endpoints.prototype.write,
) {
  const request = {
    method,
    headers: { "x-ice24-context-id": "context" },
    localUser: { id: "user" },
    identityClaims: { aal: "aal1" },
    correlationId: "00000000-0000-4000-8000-000000000001",
  };
  const setHeader = vi.fn();
  const subject = {
    accountAccessMode: mode,
    contextActive: true,
    membershipStatus: "ACTIVE",
  } as AuthorizationSubject;
  const getAuthorizationSubject = vi.fn().mockResolvedValue(subject);
  const context = {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({ setHeader }) }),
  } as unknown as ExecutionContext;
  return {
    guard: new AccountWriteGuard({ getAuthorizationSubject }),
    context,
    request,
    subject,
    getAuthorizationSubject,
    setHeader,
  };
}
describe("central account write guard", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "blocks %s with a normalized correlated error",
    async (method) => {
      const f = fixture(method);
      const error = await f.guard.canActivate(f.context).catch((error: unknown) => error);
      expect(error).toBeInstanceOf(AccountReadOnlyException);
      const body = apiErrorSchema.parse((error as AccountReadOnlyException).getResponse());
      expect(body.error).toMatchObject({
        code: "ACCOUNT_READ_ONLY",
        correlationId: f.request.correlationId,
      });
      expect(f.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    },
  );
  it.each(["GET", "HEAD", "OPTIONS"])(
    "leaves %s to existing read authorization",
    async (method) => {
      const f = fixture(method);
      expect(await f.guard.canActivate(f.context)).toBe(true);
      expect(f.getAuthorizationSubject).not.toHaveBeenCalled();
    },
  );
  it("lets read-only accounts request protected downloads but not while suspended", async () => {
    const f = fixture("POST", "READ_ONLY", Endpoints.prototype.download);
    expect(await f.guard.canActivate(f.context)).toBe(true);
    expect(f.getAuthorizationSubject).toHaveBeenCalled();
    const suspended = fixture("POST", "SUSPENDED", Endpoints.prototype.download);
    await expect(suspended.guard.canActivate(suspended.context)).rejects.toThrow(
      "Account access denied",
    );
  });
  it("continues normal permission checks for ACTIVE", async () => {
    const f = fixture("POST", "ACTIVE");
    expect(await f.guard.canActivate(f.context)).toBe(true);
  });
  it("allows billing recovery but never suspension or a revoked context", async () => {
    const f = fixture("POST", "READ_ONLY", Endpoints.prototype.billing);
    expect(await f.guard.canActivate(f.context)).toBe(true);
    const suspended = fixture("POST", "SUSPENDED", Endpoints.prototype.billing);
    await expect(suspended.guard.canActivate(suspended.context)).rejects.toThrow(
      "Account access denied",
    );
    f.getAuthorizationSubject.mockResolvedValue({ ...f.subject, contextActive: false });
    await expect(f.guard.canActivate(f.context)).rejects.toThrow("Account access denied");
  });
  it("answers 403 without revealing a context owned by another identity", async () => {
    const f = fixture("POST", "ACTIVE", Endpoints.prototype.billing);
    f.getAuthorizationSubject.mockRejectedValue(new NotFoundException("Active context not found"));
    await expect(f.guard.canActivate(f.context)).rejects.toThrow("Account access denied");
  });
  it("requires a context for writes and does not inherit a sibling endpoint exception", async () => {
    const f = fixture("POST");
    f.request.headers["x-ice24-context-id"] = "";
    await expect(f.guard.canActivate(f.context)).rejects.toThrow(
      "An active account context is required",
    );
    expect(f.getAuthorizationSubject).not.toHaveBeenCalled();
  });
  it("keeps identity self-service available without an account context", async () => {
    const f = fixture("DELETE", "SUSPENDED", Endpoints.prototype.session);
    f.request.headers["x-ice24-context-id"] = "";
    expect(await f.guard.canActivate(f.context)).toBe(true);
    expect(f.getAuthorizationSubject).not.toHaveBeenCalled();
  });
});
