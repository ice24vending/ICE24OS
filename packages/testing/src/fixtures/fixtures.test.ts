import { describe, expect, it } from "vitest";

import { syntheticAccounts, syntheticUsers } from "./index.js";

describe("synthetic fixtures", () => {
  it("contains two isolated accounts and no deliverable email addresses", () => {
    expect(new Set(syntheticAccounts.map(({ accountId }) => accountId)).size).toBe(2);
    expect(syntheticUsers.every(({ email }) => email.endsWith(".invalid"))).toBe(true);
    expect(syntheticUsers.every(({ isSynthetic }) => isSynthetic)).toBe(true);
  });
});
