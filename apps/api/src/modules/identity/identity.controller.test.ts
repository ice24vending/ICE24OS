import { randomUUID } from "node:crypto";

import type { AuthorizationSubject } from "@ice24/authorization";
import type { UserProfile } from "@ice24/contracts";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { SecurityRequest } from "../../common/security/security-request.js";
import {
  IdentityController,
  contextCapabilities,
  navigationDecision,
} from "./identity.controller.js";
import type { IdentityStore } from "./identity.store.js";

const account = randomUUID();
const subject = (overrides: Partial<AuthorizationSubject> = {}): AuthorizationSubject => ({
  userId: randomUUID(),
  membershipId: randomUUID(),
  membershipAccountId: account,
  membershipStatus: "ACTIVE",
  contextActive: true,
  accountAccessMode: "ACTIVE",
  assuranceLevel: "aal1",
  permissions: [
    { code: "files.read", effect: "ALLOW", classification: "CONFIDENTIAL" },
    { code: "audit.read", effect: "ALLOW", classification: "RESTRICTED" },
    { code: "audit.read", effect: "DENY", classification: "RESTRICTED" },
    { code: "jobs.admin-read", effect: "ALLOW", classification: "RESTRICTED" },
  ],
  accountWide: true,
  branchIds: new Set(),
  machineIds: new Set(),
  ...overrides,
});

describe("F6-07 navigation capabilities", () => {
  it("lists only granted, non-denied codes and whether MFA is verified", () => {
    expect(contextCapabilities(subject())).toEqual({
      permissions: ["files.read", "jobs.admin-read"],
      mfaVerified: false,
      accountWide: true,
    });
  });

  it("denies every destination of a suspended account or an inactive context", () => {
    expect(contextCapabilities(subject({ accountAccessMode: "SUSPENDED" })).permissions).toEqual(
      [],
    );
    expect(contextCapabilities(subject({ contextActive: false })).permissions).toEqual([]);
    expect(contextCapabilities(subject({ membershipStatus: "ENDED" })).permissions).toEqual([]);
  });

  it("keeps reads available to a read-only account", () => {
    expect(contextCapabilities(subject({ accountAccessMode: "READ_ONLY" })).permissions).toContain(
      "files.read",
    );
  });

  it("requires MFA when the destination does", () => {
    expect(navigationDecision(subject(), "jobs.admin-read", true)).toEqual({
      allowed: false,
      reason: "mfa_required",
    });
    expect(
      navigationDecision(subject({ assuranceLevel: "aal2" }), "jobs.admin-read", true),
    ).toEqual({
      allowed: true,
      reason: "granted",
    });
  });
});

describe("F6-07 navigation denial audit", () => {
  const user = { id: randomUUID(), timeZone: "America/Mexico_City" } as UserProfile;
  const contextId = randomUUID();
  const setup = (current: AuthorizationSubject) => {
    const store = {
      getAuthorizationSubject: vi.fn(async () => current),
      recordNavigationDenial: vi.fn(async () => undefined),
    };
    const request: SecurityRequest = {
      headers: { "x-ice24-context-id": contextId },
      localUser: user,
      identityClaims: { aal: "aal1" } as NonNullable<SecurityRequest["identityClaims"]>,
      correlationId: randomUUID(),
    };
    return {
      store,
      request,
      controller: new IdentityController(store as unknown as IdentityStore),
    };
  };

  it("records actor, context, correlation and the API's own reason", async () => {
    const current = subject();
    const { store, request, controller } = setup(current);
    await controller.recordNavigationDenial(request, {
      destination: "audit",
      permission: "audit.read",
    });
    expect(store.getAuthorizationSubject).toHaveBeenCalledWith(user.id, contextId, "aal1");
    expect(store.recordNavigationDenial).toHaveBeenCalledWith({
      subject: current,
      contextId,
      timeZone: "America/Mexico_City",
      destination: "audit",
      permission: "audit.read",
      reason: "explicit_deny",
      correlationId: request.correlationId,
    });
  });

  it("refuses to audit a denial the API would not make", async () => {
    const { store, request, controller } = setup(subject());
    await expect(
      controller.recordNavigationDenial(request, {
        destination: "files",
        permission: "files.read",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(store.recordNavigationDenial).not.toHaveBeenCalled();
  });

  it("rejects malformed destinations before touching the store", async () => {
    const { store, request, controller } = setup(subject());
    await expect(
      controller.recordNavigationDenial(request, { destination: "../x", permission: "files.read" }),
    ).rejects.toThrow();
    expect(store.getAuthorizationSubject).not.toHaveBeenCalled();
  });
});

describe("F6-08 context focus", () => {
  const user = { id: randomUUID(), timeZone: "America/Mexico_City" } as UserProfile;
  const contextId = randomUUID();
  const branchId = randomUUID();
  const reader = (overrides: Partial<AuthorizationSubject> = {}) =>
    subject({
      permissions: [
        { code: "identity.context-activate", effect: "ALLOW", classification: "CONFIDENTIAL" },
        { code: "equipment.read", effect: "ALLOW", classification: "CONFIDENTIAL" },
      ],
      ...overrides,
    });
  const setup = (current: AuthorizationSubject) => {
    const store = {
      getAuthorizationSubject: vi.fn(async () => current),
      contextFocusOptions: vi.fn(async () => ({ branches: [], machines: [] })),
      setContextFocus: vi.fn(async (input: { focus: unknown }) => input.focus),
    };
    const request: SecurityRequest = {
      headers: { "x-ice24-context-id": contextId },
      localUser: user,
      identityClaims: { aal: "aal1" } as NonNullable<SecurityRequest["identityClaims"]>,
      correlationId: randomUUID(),
    };
    return {
      store,
      request,
      controller: new IdentityController(store as unknown as IdentityStore),
    };
  };

  it("validates and audits the focus through the store", async () => {
    const current = reader();
    const { store, request, controller } = setup(current);
    await controller.setFocus(request, { branchId, machineId: null });
    expect(store.setContextFocus).toHaveBeenCalledWith({
      subject: current,
      contextId,
      timeZone: "America/Mexico_City",
      focus: { branchId, machineId: null },
      correlationId: request.correlationId,
    });
  });

  it("needs equipment.read to pick a branch or machine, but not to go back to all", async () => {
    const noEquipment = reader({
      permissions: [
        { code: "identity.context-activate", effect: "ALLOW", classification: "CONFIDENTIAL" },
      ],
    });
    const { store, request, controller } = setup(noEquipment);
    await expect(
      controller.setFocus(request, { branchId, machineId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.getFocusOptions(request)).rejects.toBeInstanceOf(ForbiddenException);
    await controller.setFocus(request, { branchId: null, machineId: null });
    expect(store.setContextFocus).toHaveBeenCalledTimes(1);
  });

  it("answers 404 for an inactive context and keeps working in read-only accounts", async () => {
    await expect(
      setup(reader({ contextActive: false })).controller.getFocusOptions(setup(reader()).request),
    ).rejects.toBeInstanceOf(NotFoundException);
    const { controller, request } = setup(reader({ accountAccessMode: "READ_ONLY" }));
    await expect(controller.setFocus(request, { branchId, machineId: null })).resolves.toEqual({
      branchId,
      machineId: null,
    });
  });

  it("rejects malformed or extra fields before touching the store", async () => {
    const { store, request, controller } = setup(reader());
    await expect(
      controller.setFocus(request, { branchId: "x", machineId: null }),
    ).rejects.toThrow();
    await expect(
      controller.setFocus(request, { branchId: null, machineId: null, accountId: account }),
    ).rejects.toThrow();
    expect(store.getAuthorizationSubject).not.toHaveBeenCalled();
  });
});
