import type { ReactNode } from "react";
import { AuditPageFrame } from "../../../features/audit/page-frame";
import "../../../features/audit/audit.css";

export default function AuditLayout({ children }: { children: ReactNode }) {
  return <AuditPageFrame>{children}</AuditPageFrame>;
}
