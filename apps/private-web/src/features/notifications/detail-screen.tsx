"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationSchema, type Notification } from "@ice24/contracts";
import { ALERT_STATUSES, DetailLayout, LiveRegion, PageWidth } from "@ice24/ui";
import { useAccountAccess } from "../account-shell/access-provider";
import { request, type FailureKind } from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";
import { ReturnLink, rowLinkId } from "../navigation/return-focus";
import { AlertCard, useAlertActions, useHydrated } from "./center";

/** `/notifications/[id]` (UXD-05): the alert detail below 1280 px and for direct links. */
export function NotificationDetailScreen({
  id,
  contextId,
  csrfToken,
  initial,
  failure,
  backHref,
}: {
  id: string;
  contextId: string;
  csrfToken: string;
  initial: Notification | null;
  failure: { kind: FailureKind; message: string; correlationId?: string | undefined } | null;
  backHref: string;
}) {
  const { online } = useAccountAccess();
  const [notification, setNotification] = useState(initial),
    [message, setMessage] = useState(""),
    [settled, setSettled] = useState(0);
  const markedRead = useRef(false);
  const hydrated = useHydrated();
  const refresh = useCallback(async () => {
    const response = await request(
      `/api/notifications/${id}`,
      { cache: "no-store", headers: { "x-ice24-workspace-context": contextId } },
      "No fue posible consultar el aviso.",
    );
    setNotification(notificationSchema.parse(await response.json()));
  }, [contextId, id]);
  const { act, pending, busy, actionFailure, setActionFailure } = useAlertActions({
    contextId,
    csrfToken,
    refresh,
    onStart: () => setMessage(""),
    onDone: (updated) => {
      setMessage(
        `«${updated.title}»: ${ALERT_STATUSES[updated.status].label}. El cambio quedó auditado.`,
      );
      setSettled((count) => count + 1);
    },
  });
  useEffect(() => {
    // Only a mounted page records the read: server rendering and prefetches never do.
    if (markedRead.current || initial?.status !== "unread") return;
    markedRead.current = true;
    void act(initial, "read");
    // Once per mounted alert; `act` changes identity on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);
  useEffect(() => {
    const active = document.activeElement;
    if (!settled || (active && active !== document.body && active.isConnected)) return;
    // The button that was used is gone: focus the title, never the announced message.
    const heading = document.querySelector<HTMLHeadingElement>("#main-content h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [settled]);

  const title = notification?.title ?? "Aviso";
  useEffect(() => {
    document.title = `${title} · ICE24 OS`;
  }, [title]);
  return (
    <PageWidth
      as="main"
      variant="reading"
      id="main-content"
      aria-label={title}
      className="alert-layout alert-detail-page"
      data-page-ready={String(hydrated)}
      data-page-breadcrumbs="true"
    >
      <DetailLayout
        title={title}
        identifier="Aviso"
        breadcrumbs={[{ label: "Avisos", href: backHref }, { label: title }]}
        backLink={<ReturnLink href={backHref} linkId={rowLinkId(id)} listName="avisos" />}
        status={
          failure || !notification ? (
            <ServiceState
              kind={failure?.kind ?? "not_found"}
              message={failure?.message ?? "Este aviso ya no está disponible."}
              correlationId={failure?.correlationId}
              onRetry={
                failure?.kind === "error" || failure?.kind === "offline"
                  ? () => window.location.reload()
                  : undefined
              }
            />
          ) : undefined
        }
        summary={
          notification && (
            <>
              <LiveRegion role="status" className="alert-message">
                {message}
              </LiveRegion>
              <AlertCard
                notification={notification}
                as="article"
                titleAs="h2"
                busy={busy}
                pending={pending?.id === notification.id ? pending.action : null}
                online={online}
                failure={actionFailure?.notificationId === notification.id ? actionFailure : null}
                onAction={(n, a) => void act(n, a)}
                onRefresh={() => {
                  setActionFailure(null);
                  void refresh().catch(() => undefined);
                }}
                open
              />
            </>
          )
        }
      />
    </PageWidth>
  );
}
