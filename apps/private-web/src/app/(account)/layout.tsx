import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { loadAccountShell } from "../../server/account/shell";
import {
  AccessProvider,
  OfflineBanner,
  ReadOnlyBanner,
} from "../../features/account-shell/access-provider";
import { PrivateShell } from "../../features/navigation/private-shell";
import "../../features/account-shell/account-shell.css";
import "../../features/navigation/navigation.css";
import "../../features/notifications/notifications.css";

export const dynamic = "force-dynamic";

/**
 * Shell of every page that works inside an account context: responsive navigation built on the
 * server from the context's capabilities (F6-06, F6-07), the global read-only and offline
 * banners, and the access mode shared by write controls (F5-15).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const shell = await loadAccountShell(session);
  return (
    <AccessProvider
      initialMode={shell.mode}
      initialNotice={shell.notice}
      billingOwner={shell.billingOwner}
    >
      <PrivateShell
        destinations={shell.destinations}
        menuAvailable={shell.capabilities !== null}
        accountName={shell.accountName}
        userName={shell.userName}
        contextId={session.contextId}
      >
        <ReadOnlyBanner />
        <OfflineBanner />
        {children}
      </PrivateShell>
    </AccessProvider>
  );
}
