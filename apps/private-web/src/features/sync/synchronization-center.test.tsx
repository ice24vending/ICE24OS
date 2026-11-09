// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConflictComparison } from "./synchronization-center";
import { conflictFixture } from "../../server/demo/conflict-fixture";
import { demoWorkOrders } from "../../server/demo/work-orders";
import { DemoRequest } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";

afterEach(cleanup);

it("confirms the reviewed version even when the server refreshes while the dialog is open", async () => {
  const conflict = conflictFixture(
    demoWorkOrders(new DemoRequest(defaultDemoState(), Date.now()))[0]!,
  );
  const onResolve = vi.fn(async () => undefined);
  const { rerender } = render(
    <ConflictComparison conflict={conflict} canResolve onResolve={onResolve} />,
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Resolución" }), {
    target: { value: "local" },
  });
  fireEvent.change(screen.getByLabelText("Motivo"), {
    target: { value: "Evidencia revisada con el técnico" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Revisar resolución" }));
  rerender(
    <ConflictComparison
      conflict={{
        ...conflict,
        current: {
          order: { ...conflict.server.order, rowVersion: conflict.server.order.rowVersion + 1 },
          execution: conflict.server.execution,
        },
      }}
      canResolve
      onResolve={onResolve}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirmar resolución" }));
  await waitFor(() =>
    expect(onResolve).toHaveBeenCalledWith(
      {
        strategy: "local",
        reason: "Evidencia revisada con el técnico",
        confirmed: true,
      },
      conflict.server.order.rowVersion,
    ),
  );
});
