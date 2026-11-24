"use client";
import { useEffect, useRef } from "react";
import { DetailLayout } from "@ice24/ui";
import { ServiceState } from "../../../../components/system-state/service-state";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const main = ref.current?.closest("main");
    if (main) main.dataset.pageReady = "true";
  }, []);
  return (
    <div ref={ref}>
      <DetailLayout
        title="Ficha de máquina"
        breadcrumbs={[{ label: "Máquinas", href: "/machines" }, { label: "Ficha no disponible" }]}
        status={
          <ServiceState
            kind="error"
            message="No fue posible cargar la ficha de máquina."
            onRetry={reset}
          />
        }
      />
    </div>
  );
}
