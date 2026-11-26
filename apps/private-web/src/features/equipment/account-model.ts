import type { ModuleConfiguration, SubscriptionView } from "@ice24/contracts";

/** What each functional module enables (identity.accounts.disabled_modules, F6-07). */
export const MODULES: Record<ModuleConfiguration["modules"][number]["code"], [string, string]> = {
  equipment: ["Equipos", "Sucursales, máquinas, expedientes, componentes y transferencias."],
  files: ["Archivos", "Archivos privados y evidencias adjuntas a máquinas y órdenes."],
  maintenance: ["Mantenimiento", "Calendarios, tickets, órdenes de trabajo y sus avisos."],
};

/** Plan name and price without internal codes ("ICE24_MONTHLY" → "Mensual · $399.00 MXN"). */
export function planLabel(view: Pick<SubscriptionView, "planCode" | "price">): string {
  const name = /MONTH|MENSUAL/i.test(view.planCode) ? "Mensual" : "ICE24";
  const price = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: view.price.currency,
  }).format(view.price.amountMinor / 100);
  return `${name} · ${price} ${view.price.currency}`;
}
