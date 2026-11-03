"use client";
import { SystemState } from "@ice24/ui";
export default function Error({ reset }: { reset: () => void }) {
  return <SystemState kind="error" title="No fue posible abrir los tickets" onRetry={reset} />;
}
