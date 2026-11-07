// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MaintenanceMachineLink } from "./machine-link";
afterEach(cleanup);
const item = {
  machineId: "c0000000-0000-4000-8000-000000000001",
  machineCode: "ICE24-001",
  machineName: "Centro",
};
it("links the machine only when the server grants read access", () => {
  render(<MaintenanceMachineLink item={item} canRead />);
  expect(screen.getByRole("link").getAttribute("href")).toBe(
    `/machines?machineId=${item.machineId}`,
  );
});
it("keeps the label as text without read access", () => {
  render(<MaintenanceMachineLink item={item} canRead={false} />);
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getByText("ICE24-001 · Centro")).toBeTruthy();
});
