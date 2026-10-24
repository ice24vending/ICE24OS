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
import { PendingOperationsBanner } from "../../components/system-state/pending-banner";
import "../../features/account-shell/account-shell.css";
import "../../features/navigation/navigation.css";
import "../../features/context/context.css";
import "../../features/notifications/notifications.css";
import "../../features/templates/templates.css";

export const dynamic = "force-dynamic";

/**
 * Shell of every page that works inside an account context: responsive navigation built on the
 * server from the context's capabilities (F6-06, F6-07), the global read-only and offline
 * banners, the local queue indicator (F6-10), the context selector (F6-08) and the access mode
 * shared by write controls (F5-15).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const shell = await loadAccountShell(session);
  // Access lost since the context was chosen: back to the list of valid contexts, with the reason.
  if (shell.contextLost) redirect("/access/context?error=lost");
  return (
    <AccessProvider
      initialMode={shell.mode}
      initialNotice={shell.notice}
      billingOwner={shell.billingOwner}
    >
      <PrivateShell
        destinations={shell.destinations}
        menuAvailable={shell.capabilities !== null}
        userName={shell.userName}
        contextId={session.contextId}
        selector={shell.selector}
        csrfToken={session.csrfToken}
      >
        <ReadOnlyBanner />
        <OfflineBanner />
        <PendingOperationsBanner accountId={shell.selector.current?.accountId ?? null} />
        {children}
      </PrivateShell>
    </AccessProvider>
  );
}
