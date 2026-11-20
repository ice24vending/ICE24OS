import { ExecutionPage } from "../../../../../../features/work-orders/execution-page";

export const metadata = { title: "Ejecutar orden de trabajo" };
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ExecutionPage id={(await params).id} mode="execute" />;
}
