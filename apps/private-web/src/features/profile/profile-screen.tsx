"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  DetailLayout,
  Dialog,
  LiveRegion,
  PageWidth,
  Select,
  StatusTag,
  Table,
  TextField,
} from "@ice24/ui";
import type { SessionSummary } from "@ice24/contracts";
import { ServiceState } from "../../components/system-state/service-state";
import { request, toFailure, type Failure } from "../../components/system-state/failure";
import {
  activityLabel,
  initials,
  profileDate,
  profileRole,
  timeZoneLabel,
  readablePermissions,
  type ProfileResult,
} from "./model";

const subscribe = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};
const onlineSnapshot = () => navigator.onLine;
const serverOnline = () => true;
const noHydrationChanges = () => () => undefined;
const serverReady = () => false;
const ZONES = [
  "America/Mexico_City",
  "America/Cancun",
  "America/Monterrey",
  "America/Mazatlan",
  "America/Hermosillo",
  "America/Tijuana",
];

export function ProfileScreen({
  initial,
  csrfToken,
  contextId,
}: {
  initial: ProfileResult;
  csrfToken: string;
  contextId: string;
}) {
  const [result, setResult] = useState(initial);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmation, setConfirmation] = useState<SessionSummary | "others" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionFailure, setActionFailure] = useState<Failure | null>(null);
  const [notice, setNotice] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const online = useSyncExternalStore(subscribe, onlineSnapshot, serverOnline);
  const hydrated = useSyncExternalStore(noHydrationChanges, serverOnline, serverReady);
  const data = result.data;
  const profile = data?.profile;
  const permissions = data?.capabilities.permissions ?? [];
  const canEdit = permissions.includes("identity.profile-update");
  const canRevoke = permissions.includes("identity.session-revoke");
  const blocked = !online ? "Conéctate a internet para realizar esta acción." : undefined;
  const headers = { "x-ice24-workspace-context": contextId };

  async function reload() {
    const response = await request(
      "/api/profile",
      { headers, cache: "no-store" },
      "No fue posible recargar tu perfil.",
    );
    const next = (await response.json()) as ProfileResult;
    setResult(next);
    return next;
  }
  async function retry() {
    setBusy(true);
    setActionFailure(null);
    try {
      await reload();
    } catch (cause) {
      setResult({ data: null, failure: toFailure(cause, "No fue posible cargar tu perfil.") });
    } finally {
      setBusy(false);
    }
  }
  const formData = () => {
    const form = new FormData();
    form.set("csrfToken", csrfToken);
    form.set("key", crypto.randomUUID());
    return form;
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !online || !canEdit || !profile) return;
    const form = new FormData(event.currentTarget);
    form.set("csrfToken", csrfToken);
    form.set("key", crypto.randomUUID());
    form.set("version", String(profile.version));
    setBusy(true);
    setActionFailure(null);
    setNotice("");
    try {
      await request(
        "/api/profile",
        { method: "PATCH", headers, body: form },
        "No fue posible guardar tu perfil.",
      );
      setEditing(false);
      setNotice("Tus datos de perfil se guardaron.");
      await reload();
    } catch (cause) {
      setActionFailure(toFailure(cause, "No fue posible guardar tu perfil."));
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    if (!confirmation || busy || !online || !canRevoke) return;
    const target = confirmation;
    setBusy(true);
    setActionFailure(null);
    setNotice("");
    try {
      await request(
        target === "others"
          ? "/api/profile/sessions/revoke-all"
          : `/api/profile/sessions/${target.id}`,
        {
          method: target === "others" ? "POST" : "DELETE",
          headers,
          body: formData(),
        },
        "No fue posible cerrar la sesión.",
      );
      if (target !== "others" && target.current) {
        router.replace("/");
        router.refresh();
        return;
      }
      setConfirmation(null);
      setNotice(
        target === "others"
          ? "Se cerraron las demás sesiones. Esta sesión sigue activa."
          : "La sesión se cerró.",
      );
      await reload();
      requestAnimationFrame(() => document.getElementById("profile-sessions")?.focus());
    } catch (cause) {
      setActionFailure(toFailure(cause, "No fue posible cerrar la sesión."));
    } finally {
      setBusy(false);
    }
  }
  const active = (s: SessionSummary) =>
    s.revokedAt === null && new Date(s.expiresAt).getTime() > (data?.loadedAt ?? 0);
  const readable = data ? readablePermissions(data) : [];
  const dates = (date: string) => profileDate(date, profile?.timeZone ?? "America/Mexico_City");
  const failurePanel = actionFailure && (
    <ServiceState
      kind={actionFailure.kind}
      message={actionFailure.message}
      correlationId={actionFailure.correlationId}
    />
  );

  return (
    <PageWidth
      as="main"
      id="main-content"
      aria-label="Perfil"
      className="profile-screen"
      data-page-ready={String(hydrated && !busy)}
      data-page-breadcrumbs="true"
    >
      <LiveRegion>{notice}</LiveRegion>
      <DetailLayout
        title="Perfil"
        description="Tu información personal y la seguridad de tu acceso."
        breadcrumbs={[{ label: "Resumen", href: "/summary" }, { label: "Perfil" }]}
        banner={
          <>
            {!online && (
              <Banner tone="offline" title="Sin conexión">
                Puedes consultar los datos que ya cargaste. Para guardar o cerrar sesiones, vuelve a
                conectarte.
              </Banner>
            )}
            {notice && (
              <Banner tone="success" title="Cambios realizados">
                {notice}
              </Banner>
            )}
            {data?.context.accessMode === "READ_ONLY" && (
              <Banner tone="readonly" title="Cuenta en modo lectura">
                Puedes seguir actualizando tu perfil y protegiendo tus sesiones. Los datos de la
                cuenta están en modo lectura.
              </Banner>
            )}
            {!editing && !confirmation && failurePanel}
          </>
        }
        status={
          result.failure ? (
            <ServiceState
              kind={result.failure.kind}
              message={result.failure.message}
              correlationId={result.failure.correlationId}
              onRetry={() => void retry()}
              retrying={busy}
            />
          ) : undefined
        }
        summary={
          data &&
          profile && (
            <div className="profile-stack">
              <div className="profile-overview">
                <Card
                  title="Datos de perfil"
                  actions={
                    canEdit && (
                      <Button
                        variant="secondary"
                        disabledReason={blocked}
                        onClick={() => {
                          setActionFailure(null);
                          setEditing(true);
                        }}
                      >
                        Editar
                      </Button>
                    )
                  }
                >
                  <div className="profile-identity">
                    <span className="profile-initials" aria-hidden="true">
                      {initials(profile.displayName)}
                    </span>
                    <div>
                      <strong>{profile.displayName}</strong>
                      <p>{profile.jobTitle || "Puesto sin registrar"}</p>
                    </div>
                  </div>
                  <dl className="profile-fields">
                    {[
                      ["Nombre", profile.displayName],
                      ["Teléfono", profile.phone || "Sin registrar"],
                      ["Puesto", profile.jobTitle || "Sin registrar"],
                      ["Zona horaria", timeZoneLabel(profile.timeZone)],
                      [
                        "Idioma",
                        profile.locale === "es-MX"
                          ? "Español (México)"
                          : profile.locale === "en-US"
                            ? "Inglés (Estados Unidos)"
                            : profile.locale,
                      ],
                      ["Correo", profile.email],
                      ["Usuario", profile.username],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="profile-help">
                    El correo y el usuario son de solo lectura. Para cambiarlos, solicita ayuda al
                    administrador de tu cuenta o al soporte de ICE24.
                  </p>
                </Card>
                <Card title="Rol y alcance" description={data.context.accountName}>
                  <p>
                    <StatusTag tone="info">{profileRole(data.context.roleCodes)}</StatusTag>
                  </p>
                  <h3>Tu alcance actual</h3>
                  <ul>
                    {data.scope.map((scope, i) => (
                      <li key={`${i}-${scope}`}>{scope}</li>
                    ))}
                  </ul>
                  <details className="profile-permissions">
                    <summary>Lo que puedes hacer ({readable.length})</summary>
                    <ul>
                      {readable.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  </details>
                </Card>
              </div>
              <Card
                title="Verificación en dos pasos"
                description="Agrega una segunda comprobación para proteger tu acceso."
              >
                {data.mfa ? (
                  <div className="profile-security">
                    <StatusTag tone={data.mfa.enrolled ? "success" : "warning"}>
                      {data.mfa.enrolled ? "Activada" : "Sin configurar"}
                    </StatusTag>
                    <p>
                      {data.mfa.enrolled
                        ? data.mfa.verified
                          ? "Tu identidad ya se verificó en esta sesión."
                          : "Esta sesión aún no tiene la segunda verificación."
                        : "Configura una aplicación autenticadora para obtener códigos de seguridad."}
                    </p>
                    {canEdit && online && (
                      <ButtonLink href="/access/mfa">
                        {data.mfa.enrolled
                          ? "Configurar autenticador"
                          : "Activar verificación en dos pasos"}
                      </ButtonLink>
                    )}
                  </div>
                ) : (
                  <ServiceState
                    kind={data.mfaFailure?.kind ?? "error"}
                    title="No pudimos consultar tu verificación"
                    correlationId={data.mfaFailure?.correlationId}
                    onRetry={() => void retry()}
                    retrying={busy}
                  />
                )}
              </Card>
              <Card
                id="profile-sessions"
                tabIndex={-1}
                title="Tus sesiones"
                description="Dispositivos con los que accediste a tus cuentas."
                actions={
                  canRevoke &&
                  data.sessions.some((s) => !s.current && active(s)) && (
                    <Button
                      variant="secondary"
                      disabledReason={blocked}
                      onClick={() => {
                        setActionFailure(null);
                        setConfirmation("others");
                      }}
                    >
                      Cerrar las demás sesiones
                    </Button>
                  )
                }
              >
                <Table
                  caption="Sesiones de tu acceso"
                  captionHidden
                  rows={data.sessions}
                  getRowId={(s) => s.id}
                  getRowLabel={(s) => s.deviceSummary ?? "Dispositivo no identificado"}
                  columns={[
                    {
                      id: "device",
                      header: "Dispositivo",
                      mobile: "title",
                      cell: (s) => (
                        <>
                          <strong>{s.deviceSummary ?? "Dispositivo no identificado"}</strong>
                          <p>{s.accountName}</p>
                        </>
                      ),
                    },
                    {
                      id: "last",
                      header: "Último uso",
                      cell: (s) =>
                        s.lastSeenAt ? (
                          <time dateTime={s.lastSeenAt}>{dates(s.lastSeenAt)}</time>
                        ) : (
                          "Sin registro"
                        ),
                    },
                    {
                      id: "status",
                      header: "Estado",
                      cell: (s) => (
                        <StatusTag tone={active(s) ? "success" : "nodata"}>
                          {s.current
                            ? "Esta sesión"
                            : active(s)
                              ? "Activa"
                              : s.revokedAt
                                ? "Cerrada"
                                : "Vencida"}
                        </StatusTag>
                      ),
                    },
                  ]}
                  rowActions={
                    canRevoke
                      ? (s) =>
                          active(s) && (
                            <Button
                              variant="tertiary"
                              disabledReason={blocked}
                              onClick={() => {
                                setActionFailure(null);
                                setConfirmation(s);
                              }}
                            >
                              Cerrar esta sesión
                              <span className="ids-visually-hidden">
                                : {s.deviceSummary ?? "Dispositivo no identificado"}
                              </span>
                            </Button>
                          )
                      : undefined
                  }
                  empty={
                    <ServiceState
                      kind="empty"
                      title="No hay sesiones registradas"
                      message="Aquí aparecerán tus sesiones de acceso."
                    />
                  }
                />
              </Card>
              <Card title="Mi actividad reciente" description="Tus últimos 10 eventos personales.">
                {data.activity.length ? (
                  <ol className="profile-activity">
                    {data.activity.map((event) => (
                      <li key={event.id}>
                        <div>
                          <strong>{activityLabel(event.operation)}</strong>
                          <time dateTime={event.occurredAt}>{dates(event.occurredAt)}</time>
                        </div>
                        <StatusTag
                          tone={
                            event.result === "SUCCESS"
                              ? "success"
                              : event.result === "DENIED"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {event.result === "SUCCESS"
                            ? "Completado"
                            : event.result === "DENIED"
                              ? "Sin permiso"
                              : "No completado"}
                        </StatusTag>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ServiceState
                    kind="empty"
                    title="Todavía no hay actividad"
                    message="Cuando realices acciones en esta cuenta, aparecerán aquí."
                  />
                )}
              </Card>
            </div>
          )
        }
      />
      {profile && (
        <Dialog
          open={editing}
          onClose={() => setEditing(false)}
          dismissible={!busy}
          title="Editar perfil"
          size="md"
          initialFocusRef={nameInput}
          description="Actualiza tus datos personales. El correo y el usuario se cambian con ayuda del administrador o de soporte."
        >
          <form onSubmit={(event) => void save(event)} className="profile-form">
            {failurePanel}
            <TextField
              label="Nombre"
              name="displayName"
              defaultValue={profile.displayName}
              ref={nameInput}
              autoComplete="name"
              maxLength={200}
              required
            />
            <TextField
              label="Teléfono"
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ""}
              autoComplete="tel"
              maxLength={32}
              help="Incluye la clave del país, por ejemplo +52 81 5550 2418."
            />
            <TextField
              label="Puesto"
              name="jobTitle"
              defaultValue={profile.jobTitle ?? ""}
              autoComplete="organization-title"
              maxLength={120}
            />
            <Select
              label="Zona horaria"
              name="timeZone"
              defaultValue={profile.timeZone}
              required
              options={[...new Set([profile.timeZone, ...ZONES])].map((zone) => ({
                value: zone,
                label: timeZoneLabel(zone),
              }))}
            />
            <Select
              label="Idioma"
              name="locale"
              defaultValue={profile.locale}
              required
              options={[
                { value: "es-MX", label: "Español (México)" },
                { value: "en-US", label: "Inglés (Estados Unidos)" },
              ]}
            />
            <div className="profile-actions">
              <Button variant="secondary" disabled={busy} onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              {actionFailure?.kind === "conflict" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(false);
                    void retry();
                  }}
                >
                  Recargar datos
                </Button>
              )}
              <Button
                type="submit"
                loading={busy}
                loadingLabel="Guardando…"
                disabledReason={blocked}
              >
                Guardar cambios
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      <Dialog
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        dismissible={!busy}
        role="alertdialog"
        title={confirmation === "others" ? "Cerrar las demás sesiones" : "Cerrar esta sesión"}
        description={
          confirmation === "others"
            ? "Se cerrarán tus otras sesiones. Esta sesión permanecerá activa."
            : confirmation?.current
              ? "Cerrarás esta sesión. Tendrás que volver a iniciar sesión para continuar."
              : `Se cerrará el acceso desde ${confirmation?.deviceSummary ?? "este dispositivo"}.`
        }
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={busy}
              loadingLabel="Cerrando…"
              disabledReason={blocked}
              onClick={() => void revoke()}
            >
              Confirmar cierre
            </Button>
          </>
        }
      >
        {failurePanel}
      </Dialog>
    </PageWidth>
  );
}
