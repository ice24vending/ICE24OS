"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, StatusTag, Table } from "@ice24/ui";
import type { SubscriptionPayments } from "@ice24/contracts";
import { ServiceState } from "../../components/system-state/service-state";
import { request, toFailure, type Failure } from "../../components/system-state/failure";
import { useAccountAccess } from "../account-shell/access-provider";
import { formatDate } from "./model";

export function PaymentHistory({
  payments,
  failure,
  loading = false,
  canManage = false,
  canOpenPortal = false,
  contextId,
  csrfToken,
}: {
  payments?: SubscriptionPayments | undefined;
  failure?: Failure | undefined;
  loading?: boolean;
  canManage?: boolean;
  canOpenPortal?: boolean;
  contextId: string;
  csrfToken: string;
}) {
  const router = useRouter();
  const access = useAccountAccess();
  const [retrying, startTransition] = useTransition();
  const [opening, setOpening] = useState(false);
  const [portalFailure, setPortalFailure] = useState<Failure>();
  const key = useRef<string | null>(null);
  async function openPortal() {
    if (opening) return;
    setOpening(true);
    setPortalFailure(undefined);
    try {
      const body = new FormData();
      body.set("action", "portal");
      body.set("csrfToken", csrfToken);
      body.set("key", (key.current ??= crypto.randomUUID()));
      const response = await request(
        "/api/subscription",
        {
          method: "POST",
          body,
          headers: { "x-ice24-workspace-context": contextId },
        },
        "No fue posible abrir las facturas.",
      );
      const result = (await response.json()) as { url?: string };
      if (!result.url) throw new Error("Missing portal URL");
      window.location.assign(result.url);
    } catch (cause) {
      setPortalFailure(toFailure(cause, "No fue posible abrir las facturas."));
      setOpening(false);
    }
  }
  return (
    <Card className="subscription-history">
      <section aria-labelledby="payment-history-title" data-history-ready={!loading && !retrying}>
        <h2 id="payment-history-title">Historial de pagos</h2>
        <p>Últimos 12 pagos de la cuenta.</p>
        {loading || retrying ? (
          <ServiceState kind="loading" skeleton="list" title="Cargando pagos…" />
        ) : !canManage ? (
          <p>Solo quien administra la facturación puede consultar los pagos.</p>
        ) : failure ? (
          <ServiceState
            kind={failure.kind}
            message={failure.message}
            correlationId={failure.correlationId}
            onRetry={() => startTransition(() => router.refresh())}
            retryLabel="Reintentar"
          />
        ) : payments?.items.length ? (
          <Table
            caption="Pagos de la suscripción"
            captionHidden
            density="compact"
            rows={payments.items}
            getRowId={(payment) => payment.id}
            columns={[
              {
                id: "date",
                header: "Fecha",
                mobile: "title",
                cell: (payment) => formatDate(payment.createdAt),
              },
              {
                id: "amount",
                header: "Importe",
                numeric: true,
                cell: (payment) =>
                  new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: payment.currency,
                  }).format(payment.amountMinor / 100),
              },
              {
                id: "status",
                header: "Estado",
                cell: (payment) => (
                  <StatusTag
                    tone={
                      payment.status === "paid"
                        ? "success"
                        : payment.status === "uncollectible"
                          ? "danger"
                          : "info"
                    }
                  >
                    {
                      {
                        paid: "Pagado",
                        open: "Pendiente",
                        draft: "Por emitir",
                        void: "Anulado",
                        uncollectible: "Sin pagar",
                      }[payment.status]
                    }
                  </StatusTag>
                ),
              },
            ]}
          />
        ) : (
          <ServiceState
            kind="empty"
            title="Sin pagos registrados"
            message="Los pagos aparecerán aquí cuando se emita el primer cobro."
          />
        )}
        {canManage && canOpenPortal && (
          <Button
            variant="tertiary"
            icon="document"
            disabled={opening || !access.online}
            onClick={() => void openPortal()}
          >
            {opening ? "Abriendo facturas…" : "Ver todas las facturas"}
          </Button>
        )}
        {portalFailure && (
          <ServiceState
            kind={portalFailure.kind}
            message={portalFailure.message}
            correlationId={portalFailure.correlationId}
          />
        )}
      </section>
    </Card>
  );
}
