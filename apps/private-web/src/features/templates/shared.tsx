"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { TransitionFeedbackBanner } from "@ice24/ui";

import { request, toFailure, type Failure } from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";
import { useAccountAccess } from "../account-shell/access-provider";
import type { TemplateData } from "../../server/demo/templates";

export type { TemplateData, TemplateMachine } from "../../server/demo/templates";

export const OPERATION = {
  available: { label: "Disponible", tone: "success" },
  maintenance: { label: "En mantenimiento", tone: "info" },
  out_of_service: { label: "Fuera de servicio", tone: "danger" },
  off: { label: "Apagada", tone: "nodata" },
} as const;

/**
 * Global state of a template screen (F6-10), or undefined when it has data to show. A failed
 * read retries with a refresh: reading again cannot duplicate anything.
 */
export function useTemplateStatus(
  data: TemplateData,
  empty: { title: string; message: string; action?: ReactNode },
): ReactNode | undefined {
  const router = useRouter();
  // Pending until the refreshed server data arrives, so a second tap cannot stack reads.
  const [retrying, startRetry] = useTransition();
  const retry = () => startRetry(() => router.refresh());
  const { failure } = data;
  if (failure?.kind === "error")
    return (
      <ServiceState
        kind="error"
        message="No fue posible cargar las máquinas. No se realizó ningún cambio."
        correlationId={failure.correlationId}
        onRetry={retry}
        retrying={retrying}
      />
    );
  if (failure?.kind === "offline")
    return <ServiceState kind="offline" onRetry={retry} retrying={retrying} />;
  if (failure?.kind === "forbidden")
    return (
      <ServiceState
        kind="forbidden"
        message="Tu rol no puede consultar las máquinas de esta cuenta. Si lo necesitas, solicítalo al propietario."
      />
    );
  if (data.machines.length === 0)
    return (
      <ServiceState kind="empty" title={empty.title} message={empty.message}>
        {empty.action}
      </ServiceState>
    );
  return undefined;
}

export type ActionResult = { folio: string; replayed: boolean };

/**
 * One write of a template screen. The idempotency key is created once and reused by every retry
 * of the same intent until it succeeds, so «Reintentar» can never register twice (F6-10).
 */
export function useTemplateAction(data: TemplateData, action: string) {
  const access = useAccountAccess();
  const key = useRef<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  /** Key of the current intent, created on first use and kept until it succeeds. */
  const intentKey = () => (key.current ??= crypto.randomUUID());
  /** Sends the current intent, or an operation saved earlier under its own key. */
  const send = async (savedKey?: string): Promise<ActionResult | null> => {
    if (sending) return null;
    const used = savedKey ?? intentKey();
    setSending(true);
    setFailure(null);
    try {
      const body = new FormData();
      body.set("csrfToken", data.csrfToken);
      body.set("key", used);
      body.set("action", action);
      const response = await request(
        "/api/plantillas",
        { method: "POST", body, headers: { "x-ice24-workspace-context": data.contextId } },
        "No fue posible completar la acción.",
      );
      const done = (await response.json()) as ActionResult;
      if (used === key.current) key.current = null;
      setResult(done);
      return done;
    } catch (cause) {
      const classified = toFailure(cause, "No fue posible completar la acción.");
      if (classified.kind === "read_only") access.markReadOnly();
      setFailure(classified);
      return null;
    } finally {
      setSending(false);
    }
  };
  /** A new intent (after a conflict the person decides again): next send gets a new key. */
  const reset = () => {
    key.current = null;
    setFailure(null);
    setResult(null);
  };
  /** Why the action cannot be sent right now, written next to the button. */
  const blocked = !access.canWrite
    ? access.blockedText
    : !access.online
      ? "Sin conexión: necesitas red para enviar esto."
      : undefined;
  return { send, intentKey, reset, sending, result, failure, blocked };
}

/** Failure of a write, next to the action: conflict → «Actualizar», error → same-key retry. */
export function ActionFeedback({
  failure,
  onRetry,
  onRefresh,
}: {
  failure: Failure | null;
  onRetry: () => void;
  onRefresh: () => void;
}) {
  if (!failure) return null;
  if (failure.kind === "conflict")
    return (
      <TransitionFeedbackBanner
        feedback={{ kind: "conflict", message: failure.message }}
        onRefresh={onRefresh}
      />
    );
  return (
    <ServiceState
      kind={failure.kind}
      message={failure.message}
      correlationId={failure.correlationId}
      onRetry={failure.kind === "error" || failure.kind === "offline" ? onRetry : undefined}
    />
  );
}
