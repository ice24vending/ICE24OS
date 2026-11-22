"use client";

import { PageWidth } from "@ice24/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Adopt the common width without changing the layouts of unrelated modules. */
export function AccountPage({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const variant =
    pathname === "/subscription"
      ? "reading"
      : ["/notifications", "/audit", "/files"].includes(pathname)
        ? "full"
        : null;
  return variant ? (
    <PageWidth variant={variant} className="account-page">
      {children}
    </PageWidth>
  ) : (
    children
  );
}
