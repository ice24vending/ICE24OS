"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Dialog } from "@ice24/ui";
import { purgeLocalData, usePendingOperations } from "./local-data";

/**
 * Sign-out (UI_UX §20.7): warns first when changes exist only on this device, then deletes the
 * local data before the session ends. The BFF also answers with `Clear-Site-Data` as a backstop.
 */
export function LogoutForm({
  csrfToken,
  accountId,
  label = "Cerrar todas las sesiones",
}: {
  csrfToken: string;
  accountId: string | null;
  label?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const pending = usePendingOperations(accountId).length;
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const leave = async () => {
    setLeaving(true);
    await purgeLocalData();
    form.current?.submit();
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending > 0) setConfirming(true);
    else void leave();
  };
  // Back from the bfcache after signing out: never show the page as still leaving.
  useEffect(() => {
    const reset = () => setLeaving(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <form ref={form} method="post" action="/api/auth/logout" onSubmit={submit}>
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <Button variant="secondary" type="submit" loading={leaving} loadingLabel="Cerrando sesión…">
        {label}
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        role="alertdialog"
        size="sm"
        dismissible={!leaving}
        title={`Tienes ${pending === 1 ? "1 cambio" : `${pending} cambios`} sin sincronizar`}
        description="Cerrar sesión eliminará los datos locales de este dispositivo, incluidos esos cambios."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={leaving}>
              Volver y sincronizar
            </Button>
            <Button variant="danger" onClick={() => void leave()} loading={leaving}>
              Cerrar sesión y eliminar
            </Button>
          </>
        }
      />
    </form>
  );
}

/** Deletes local data when the page shows that the session or access ended (UI_UX §20.7). */
export function LocalDataPurge() {
  useEffect(() => {
    void purgeLocalData();
  }, []);
  return null;
}
