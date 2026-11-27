// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { jobDetailSchema } from "@ice24/contracts";
import { JobDetailScreen } from "./detail";
import { AccessProvider } from "../account-shell/access-provider";
import { readOnlyNotice } from "../account-shell/access";
import { demoApiResponse } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";
import { demoIds } from "../../server/demo/fixtures";
import { jobsReturn, jobFilters } from "./model";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function view(canRetry = true, mode: "ACTIVE" | "READ_ONLY" = "ACTIVE") {
  const initialDetail = jobDetailSchema.parse(
    await (
      await demoApiResponse(
        `admin/jobs/${demoIds.job(3)}`,
        {},
        { ...defaultDemoState(), persona: "platform" },
      )
    ).json(),
  );
  return {
    initialDetail,
    element: (
      <AccessProvider
        initialMode={mode}
        initialNotice={readOnlyNotice(null, false)}
        billingOwner={false}
      >
        <JobDetailScreen
          contextId="context"
          csrfToken="csrf"
          initialDetail={initialDetail}
          failure={null}
          returnTo="/jobs?status=DEAD_LETTER"
          canRetry={canRetry}
          canAudit={false}
          canIntegrationLogs={false}
        />
      </AccessProvider>
    ),
  };
}
it("declares readiness, one h1 and local return with row focus", async () => {
  const { element } = await view();
  const html = renderToStaticMarkup(element);
  expect(html).toContain('data-page-ready="false"');
  expect(html).toContain('data-page-breadcrumbs="true"');
  render(element);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Volver a trabajos" }).getAttribute("href")).toContain(
    "status=DEAD_LETTER",
  );
  expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true");
  expect(document.title).toBe("Detalle del trabajo · ICE24 OS");
});
it("hides retry without its grant and blocks it in read-only mode", async () => {
  render((await view(false)).element);
  expect(screen.queryByRole("button", { name: "Reintentar trabajo" })).toBeNull();
  cleanup();
  render((await view(true, "READ_ONLY")).element);
  expect(
    (screen.getByRole("button", { name: "Reintentar trabajo" }) as HTMLButtonElement).disabled,
  ).toBe(true);
});
it("sends expected version, reason and one idempotency key across ambiguous failures", async () => {
  const { element, initialDetail } = await view();
  const fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
  vi.stubGlobal("fetch", fetch);
  render(element);
  fireEvent.change(screen.getByLabelText("Motivo del reintento"), {
    target: { value: "Proveedor recuperado tras revisión" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reintentar trabajo" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Reintentar trabajo" }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reintentar trabajo" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  const first = fetch.mock.calls[0]![1].body as FormData;
  const second = fetch.mock.calls[1]![1].body as FormData;
  expect(first.get("version")).toBe(String(initialDetail.rowVersion));
  expect(first.get("reason")).toBe("Proveedor recuperado tras revisión");
  expect(first.get("key")).toBe(second.get("key"));
});
it("rejects external and unrelated return URLs and invalid filters", () => {
  expect(jobsReturn("https://example.com")).toBe("/jobs");
  expect(jobsReturn("/account")).toBe("/jobs");
  expect(jobFilters({ status: "INVALID" })).toBe("limit=25");
  expect(jobFilters({ status: "FAILED" })).toContain("status=FAILED");
});
