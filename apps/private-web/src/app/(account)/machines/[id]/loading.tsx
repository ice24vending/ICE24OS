import { DetailLayout } from "@ice24/ui";
import { ServiceState } from "../../../../components/system-state/service-state";
export default function Loading() {
  return (
    <DetailLayout
      title="Ficha de máquina"
      breadcrumbs={[{ label: "Máquinas", href: "/machines" }, { label: "Cargando" }]}
      status={<ServiceState kind="loading" title="Cargando ficha de máquina" />}
    />
  );
}
