// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OfflineStatus } from "./offline-status";
afterEach(cleanup);
it("announces saving once and retains a separate region for later connectivity changes", () => {
  const { rerender } = render(
    <OfflineStatus state="saved_locally" pending={0} message="Guardado en este dispositivo" />,
  );
  const network = screen.getByRole("status", { name: "Conectividad y almacenamiento local" });
  expect(network.textContent).toBe("");
  expect(
    screen
      .getAllByRole("status")
      .filter((node) => node.textContent === "Guardado en este dispositivo"),
  ).toHaveLength(1);
  rerender(<OfflineStatus state="offline" pending={0} message="Guardado en este dispositivo" />);
  expect(screen.getByRole("status", { name: "Conectividad y almacenamiento local" })).toBe(network);
  expect(network.textContent).toBe("Sin conexión");
  expect(
    screen
      .getAllByRole("status")
      .filter((node) => node.textContent === "Guardado en este dispositivo"),
  ).toHaveLength(1);
});
