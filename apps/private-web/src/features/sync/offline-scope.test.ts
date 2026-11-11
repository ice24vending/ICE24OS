// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { readOfflineScope, rememberOfflineScope } from "./offline-scope";
const owner = {
  accountId: "10000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000002",
};
afterEach(() => sessionStorage.clear());
it("reads only the previously verified same-tab identity within its validity", () => {
  sessionStorage.setItem("ice24-offline-scope", JSON.stringify({ ...owner, expiresAt: 2000 }));
  expect(readOfflineScope(1000)).toEqual(owner);
  expect(() => readOfflineScope(2000)).toThrow();
});
it.each([
  null,
  {},
  { ...owner, expiresAt: "9999999999999" },
  { ...owner, expiresAt: 0 },
  { accountId: "other", userId: "x", expiresAt: 9999999999999 },
])("rejects absent or invalid scope %j", (value) => {
  sessionStorage.setItem("ice24-offline-scope", JSON.stringify(value));
  expect(() => readOfflineScope()).toThrow();
});

it("does not shorten a downloaded scope on shell rerender, nor borrow another identity's expiry", () => {
  rememberOfflineScope({ ...owner, expiresAt: 9000 });
  rememberOfflineScope({ ...owner, expiresAt: 2000 });
  expect(readOfflineScope(8000)).toEqual(owner);
  rememberOfflineScope({
    ...owner,
    userId: "10000000-0000-4000-8000-000000000003",
    expiresAt: 2000,
  });
  expect(() => readOfflineScope(8000)).toThrow();
});
