import type { ReactNode } from "react";
import { PageWidth } from "@ice24/ui";
import "../../../../features/equipment/equipment.css";
import "../../../../features/maintenance/maintenance.css";
import "../../../../features/machines/detail.css";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PageWidth
      as="main"
      id="main-content"
      variant="full"
      data-page-ready="false"
      data-page-breadcrumbs="true"
      className="machine-detail"
    >
      {children}
    </PageWidth>
  );
}
