import type { ReactNode } from "react";
import "../../../../../features/maintenance/tickets.css";
import "../../../../../features/work-orders/execution.css";

/** Load styles outside the suspended data request so the loading state can render promptly. */
export default function WorkOrderLayout({ children }: { children: ReactNode }) {
  return children;
}
