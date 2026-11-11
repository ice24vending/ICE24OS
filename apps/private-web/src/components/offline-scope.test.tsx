// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react";
import { it, expect, afterEach, vi } from "vitest";
import { OfflineScope } from "./offline-scope";
import { readOfflineScope, rememberOfflineScope } from "../features/sync/offline-scope";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
});
it("keeps a same-tab download through transient missing shell facts and shorter session", () => {
  vi.stubEnv("NEXT_PUBLIC_ICE24_OFFLINE_SHELL", "1");
  const owner = {
    accountId: "10000000-0000-4000-8000-000000000001",
    userId: "10000000-0000-4000-8000-000000000002",
  };
  const expiry = Date.now() + 3600000;
  rememberOfflineScope({ ...owner, expiresAt: expiry });
  const { rerender } = render(<OfflineScope accountId={null} userId={null} expiresAt={0} />);
  expect(readOfflineScope()).toEqual(owner);
  rerender(<OfflineScope {...owner} expiresAt={Date.now() + 1000} />);
  expect(readOfflineScope(expiry - 1)).toEqual(owner);
  expect(() => readOfflineScope(expiry)).toThrow();
});
