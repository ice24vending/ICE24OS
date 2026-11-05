import { NavigationTabs } from "@ice24/ui";
export function MaintenanceNavigation({
  current,
  calendarHref = "/maintenance?view=calendar",
  listHref = "/maintenance?view=list",
}: {
  current: "calendar" | "list" | "tickets" | "orders";
  calendarHref?: string;
  listHref?: string;
}) {
  return (
    <NavigationTabs
      label="Mantenimiento"
      items={[
        {
          href: calendarHref,
          label: "Calendario",
          icon: "calendar",
          current: current === "calendar",
        },
        { href: listHref, label: "Lista", icon: "list", current: current === "list" },
        {
          href: "/maintenance/tickets",
          label: "Tickets",
          icon: "inbox",
          current: current === "tickets",
        },
        {
          href: "/maintenance/work-orders",
          label: "Órdenes",
          icon: "tool",
          current: current === "orders",
        },
      ]}
    />
  );
}
