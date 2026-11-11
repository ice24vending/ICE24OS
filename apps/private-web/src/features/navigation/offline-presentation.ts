import { readOfflineScope } from "../sync/offline-scope";
import type { PrivateShellProps } from "./private-shell";
export const PRESENTATION_KEY = "ice24-offline-presentation";
export type OfflinePresentation = Pick<
  PrivateShellProps,
  "userName" | "destinations" | "contextId"
> & {
  accountId: string;
  userId: string;
  current: NonNullable<PrivateShellProps["selector"]["current"]>;
};
/** Presentation only, same tab; never a capability, session, or authenticated HTML cache. */
export function readOfflinePresentation(): OfflinePresentation | undefined {
  try {
    const owner = readOfflineScope();
    const value = JSON.parse(
      sessionStorage.getItem(PRESENTATION_KEY) ?? "null",
    ) as OfflinePresentation | null;
    if (
      value?.accountId === owner.accountId &&
      value?.userId === owner.userId &&
      typeof value.userName === "string" &&
      Array.isArray(value.destinations)
    )
      return value;
  } catch {
    /* Missing/expired scope cannot recover identity from presentation. */
  }
  return undefined;
}
