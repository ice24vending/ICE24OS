import { ticketIdSchema } from "@ice24/contracts";

/** Resolve only against the authorized list; never probe an arbitrary machine endpoint. */
export async function resolveMachineSelection(
  value: string | string[] | undefined,
  canRead: boolean,
  readAuthorizedMachines: () => Promise<unknown>,
): Promise<string | undefined> {
  const parsed = ticketIdSchema.safeParse(value);
  if (!canRead || !parsed.success) return undefined;
  const id = parsed.data.toLowerCase();
  try {
    const rows = await readAuthorizedMachines();
    return Array.isArray(rows) &&
      rows.some(
        (row: unknown) => row !== null && typeof row === "object" && "id" in row && row.id === id,
      )
      ? id
      : undefined;
  } catch {
    return undefined;
  }
}
