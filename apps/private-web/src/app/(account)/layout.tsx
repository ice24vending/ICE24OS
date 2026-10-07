import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { loadAccountShell } from "../../server/account/shell";
import {
  AccessProvider,
  OfflineBanner,
  ReadOnlyBanner,
} from "../../features/account-shell/access-provider";
import { AccountNav, type AccountLink } from "../../features/account-shell/account-nav";
import "../../features/account-shell/account-shell.css";
import "../../features/notifications/notifications.css";

export const dynamic = "force-dynamic";

/**
 * Shell of every page that works inside an account context: services navigation, the global
 * read-only and offline banners, and the access mode shared by write controls (F5-15).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const shell = await loadAccountShell(session);
  const links: AccountLink[] = [
    { href: "/workspace", label: "Espacio de trabajo" },
    { href: "/subscription", label: "Suscripción" },
    { href: "/files", label: "Archivos privados" },
    ...(shell.canAudit ? [{ href: "/audit", label: "Auditoría" }] : []),
    ...(shell.canJobs ? [{ href: "/jobs", label: "Centro de trabajos" }] : []),
    { href: "/profile", label: "Perfil" },
  ];
  return (
    <AccessProvider
      initialMode={shell.mode}
      initialNotice={shell.notice}
      billingOwner={shell.billingOwner}
    >
      <header className="account-header">
        <p className="account-header__context">
          <span className="eyebrow">ICE24 OS</span>
          <strong>{shell.accountName ?? "Cuenta activa"}</strong>
          <a href="/access/context">Cambiar de cuenta</a>
        </p>
        <AccountNav links={links} contextId={session.contextId} />
      </header>
      <ReadOnlyBanner />
      <OfflineBanner />
      {children}
    </AccessProvider>
  );
}
