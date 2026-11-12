"use client";
import { LiveRegion } from "@ice24/ui";
import { useEffect, useState } from "react";
import { watchOfflineAccess } from "./lifecycle";
export function OfflineAccessMonitor({
  accountId,
  userId,
}: {
  accountId: string | null;
  userId: string | null;
}) {
  const [removed, setRemoved] = useState<number>();
  useEffect(
    () => watchOfflineAccess(accountId && userId ? { accountId, userId } : undefined, setRemoved),
    [accountId, userId],
  );
  return (
    <LiveRegion role="alert">
      {removed === undefined ? null : (
        <>
          El acceso o la vigencia cambió. Se eliminaron las descargas afectadas y {removed}{" "}
          operaciones pendientes de este dispositivo. Las versiones del servidor se conservan.
        </>
      )}
    </LiveRegion>
  );
}
