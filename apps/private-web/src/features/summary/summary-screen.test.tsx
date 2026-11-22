// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("../account-shell/access-provider", () => ({ useAccountAccess: () => ({ online: true }) }));
vi.mock("../notifications/center", () => ({
  AlertCard: () => null,
  useAlertActions: () => ({
    act: vi.fn(),
    pending: null,
    busy: false,
    actionFailure: null,
    setActionFailure: vi.fn(),
  }),
}));
import { SummaryScreen } from "./summary-screen";
import { loadOperationalSummary } from "./load-operational-summary";
import { demoApiResponse } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";
import { ROLE_PERMISSIONS } from "../../server/demo/personas";
afterEach(cleanup);
const now = Date.parse("2026-10-20T16:00:00Z");
const data = () =>
  loadOperationalSummary(
    (p) => demoApiResponse(p, {}, { ...defaultDemoState(), maintenance: "operation" }, now),
    { permissions: ROLE_PERMISSIONS.OW },
  );
it("preserves the shell contract, one h1, four links and four equivalent tables", async () => {
  const props = { data: await data(), now, contextId: "ctx", csrfToken: "csrf" };
  expect(renderToString(<SummaryScreen {...props} />)).toContain('data-page-ready="false"');
  render(<SummaryScreen {...props} />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true");
  expect(
    within(screen.getByRole("region", { name: "Indicadores" })).getAllByRole("link"),
  ).toHaveLength(4);
  expect(
    within(screen.getByRole("region", { name: "Tablero operativo" })).getAllByRole("table"),
  ).toHaveLength(4);
});
it("does not invent priority when an activity lacks criticality", async () => {
  const result = await data();
  result.tasks = [
    {
      id: "task",
      label: "Inspeccionar conexiones",
      machine: "MTY-01",
      branch: "Centro",
      priority: undefined,
      href: "/maintenance?view=list",
      state: "upcoming",
      dueAt: null,
    },
  ];
  render(<SummaryScreen data={result} now={now} contextId="ctx" csrfToken="csrf" />);
  expect(screen.getAllByText("Sin prioridad").length).toBeGreaterThan(0);
});
