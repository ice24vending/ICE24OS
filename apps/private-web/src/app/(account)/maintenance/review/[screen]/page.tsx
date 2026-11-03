import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Loading from "./loading";
import { authorize } from "@ice24/authorization";
import { readBrowserSession } from "../../../../../server/session/session";
import { demoStateOf } from "../../../../../server/demo/session";
import { DemoRequest } from "../../../../../server/demo/api";
import { maintenanceFixtures, REVIEW_SCREENS } from "../../../../../server/demo/maintenance";
import { DEMO_MAINTENANCE_LABELS } from "../../../../../server/demo/state";
import { MaintenanceReview } from "../../../../../features/maintenance/review-screen";
import "../../../../../features/maintenance/maintenance.css";

export default function MaintenanceReviewPage(props: { params: Promise<{ screen: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <ReviewContent {...props} />
    </Suspense>
  );
}
async function ReviewContent({ params }: { params: Promise<{ screen: string }> }) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  const demo = demoStateOf(session);
  const { screen } = await params;
  if (!demo || !Object.hasOwn(REVIEW_SCREENS, screen)) notFound();
  if (screen === "UI-MNT-01") redirect("/maintenance?view=calendar");
  if (screen === "UI-MNT-02") redirect("/maintenance?view=list");
  const request = new DemoRequest(demo, 0);
  const allowed =
    request.can("maintenance.read") &&
    !(demo.persona === "technician" && demo.maintenance === "revoked");
  const rows = allowed
    ? maintenanceFixtures(demo)
        .filter(
          (row) =>
            authorize(request.subject, {
              accountId: request.account.id,
              permission: "maintenance.read",
              classification: "CONFIDENTIAL",
              operation: "READ",
              ...(request.subject.machineIds.has(row.machineId)
                ? { machineId: row.machineId }
                : { branchId: row.branchId }),
            }).allowed,
        )
        .slice(0, 9)
    : [];
  const state = !allowed
    ? "forbidden"
    : demo.network === "slow"
      ? "loading"
      : demo.network === "error"
        ? "error"
        : demo.network === "offline"
          ? "offline"
          : demo.maintenance === "empty"
            ? "empty"
            : demo.maintenance === "conflict"
              ? "conflict"
              : demo.mode === "READ_ONLY" || demo.persona === "readonly"
                ? "read_only"
                : undefined;
  return (
    <MaintenanceReview
      screen={screen}
      title={REVIEW_SCREENS[screen as keyof typeof REVIEW_SCREENS]}
      state={state}
      simulation={
        demo.maintenance && demo.maintenance !== "normal"
          ? DEMO_MAINTENANCE_LABELS[demo.maintenance]
          : undefined
      }
      rows={rows}
    />
  );
}
