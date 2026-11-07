import type { ScheduledActivity } from "@ice24/contracts";

export function MaintenanceMachineLink({
  item,
  canRead,
}: {
  item: Pick<ScheduledActivity, "machineId" | "machineCode" | "machineName">;
  canRead: boolean;
}) {
  const text = `${item.machineCode} · ${item.machineName}`;
  return canRead ? (
    <a
      className="maintenance-machine-link"
      href={`/machines?machineId=${item.machineId}`}
      title={text}
    >
      {text}
    </a>
  ) : (
    <span>{text}</span>
  );
}
