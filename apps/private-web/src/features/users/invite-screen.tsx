"use client";
import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { accountInvitationSchema } from "@ice24/contracts";
import { Banner, Button, ButtonLink, Card, DetailLayout, PageWidth, TextField } from "@ice24/ui";
import { ServiceState } from "../../components/system-state/service-state";
import { toFailure, type Failure } from "../../components/system-state/failure";
import { useUnsavedChanges } from "../context/unsaved-changes";
import { useAccountAccess } from "../account-shell/access-provider";
import { createEquipmentClient } from "../equipment/configuration-client";
import { useResource } from "../equipment/machine-configuration";
import { loadScopeOptions, USERS_TAB_HREF, type WorkspaceAccess } from "./model";
import { RoleScopeFields, readRoleScope } from "./role-scope-fields";

/** /account/users/invite (UXD-09): the invitation on its own screen; «Cancelar» returns. */
export function InviteScreen({ contextId, csrfToken }: { contextId: string; csrfToken: string }) {
  const router = useRouter();
  const client = useMemo(() => createEquipmentClient(contextId, csrfToken), [contextId, csrfToken]);
  const { syncMode, online } = useAccountAccess();
  const load = useCallback(async () => {
    const [access, options] = await Promise.all([
      client.get<WorkspaceAccess>("equipment-workspace"),
      loadScopeOptions(client),
    ]);
    syncMode(access.accessMode);
    return { access, options };
  }, [client, syncMode]);
  const { data, failure: loadFailure, reload } = useResource(load);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const receipt = useRef({ body: "", key: "" });
  const formRef = useRef<HTMLFormElement>(null);
  useUnsavedChanges(dirty);
  const access = data?.access;
  const canInvite = Boolean(access?.canManage && access.accessMode === "ACTIVE");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canInvite || !access?.hasMfa || !online) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const scope = readRoleScope(form);
    const parsed = accountInvitationSchema.safeParse({
      displayName: text("displayName"),
      email: text("email"),
      roleCodes: [scope.value?.role ?? ""],
      branchIds: scope.value?.branchIds ?? [],
      machineIds: scope.value?.machineIds ?? [],
      ...(text("phone") ? { phone: text("phone") } : {}),
      ...(text("jobTitle") ? { jobTitle: text("jobTitle") } : {}),
    });
    const next = { ...scope.errors };
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (key !== "roleCodes" && !next[key])
          next[key] =
            key === "phone"
              ? "Usa solo dígitos, espacios, paréntesis o guiones (7 a 32)."
              : "Revisa este valor.";
      }
    if (!parsed.success || Object.keys(next).length) {
      setErrors(next);
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    const body = JSON.stringify(parsed.data);
    if (receipt.current.body !== body) receipt.current = { body, key: crypto.randomUUID() };
    setPending(true);
    setFailure(undefined);
    setErrors({});
    try {
      const created = await client.send<{ id: string }>("account-invitations", parsed.data, {
        key: receipt.current.key,
      });
      setDirty(false);
      router.replace(`/account/users/${created.id}?invitado=1`);
    } catch (error) {
      setFailure(toFailure(error, "No fue posible enviar la invitación."));
    } finally {
      setPending(false);
    }
  }

  return (
    <PageWidth
      as="main"
      variant="reading"
      id="main-content"
      aria-label="Invitar usuario"
      className="users-screen"
      data-page-ready={String(Boolean(data || loadFailure))}
      data-page-breadcrumbs="true"
    >
      <DetailLayout
        title="Invitar usuario"
        description="La persona recibe un correo para crear su acceso. Su rol y alcance se aplican al aceptar."
        breadcrumbs={[{ label: "Usuarios", href: USERS_TAB_HREF }, { label: "Invitar usuario" }]}
        status={
          !data && !loadFailure ? (
            <ServiceState kind="loading" />
          ) : loadFailure ? (
            <ServiceState {...loadFailure} onRetry={reload} />
          ) : !canInvite ? (
            <ServiceState
              kind="forbidden"
              title="Invitación no disponible"
              message={
                access?.accessMode !== "ACTIVE"
                  ? "La cuenta está en modo lectura: no se pueden invitar personas."
                  : "Tu acceso permite consultar los usuarios, pero no invitar."
              }
            />
          ) : undefined
        }
        summary={
          data && (
            <form
              ref={formRef}
              aria-label="Datos de la invitación"
              onSubmit={submit}
              onChange={() => setDirty(true)}
              noValidate
            >
              {!data.access.hasMfa && (
                <Banner tone="warning" title="Verifica tu segundo factor">
                  Para invitar personas necesitas{" "}
                  <a href="/access/mfa">verificar tu segundo factor</a>.
                </Banner>
              )}
              {failure && <ServiceState {...failure} />}
              <fieldset disabled={pending} className="users-stack">
                <legend className="ids-visually-hidden">Datos de la invitación</legend>
                <Card title="Datos de la persona" titleAs="h2">
                  <div className="users-fields">
                    <TextField
                      label="Nombre"
                      name="displayName"
                      required
                      maxLength={200}
                      autoComplete="off"
                      error={errors.displayName}
                    />
                    <TextField
                      label="Correo"
                      name="email"
                      type="email"
                      required
                      maxLength={320}
                      autoComplete="off"
                      error={errors.email}
                    />
                    <TextField
                      label="Teléfono"
                      name="phone"
                      type="tel"
                      maxLength={32}
                      error={errors.phone}
                      help="Opcional. Si la persona ya tiene cuenta en ICE24 se conservan sus datos."
                    />
                    <TextField
                      label="Puesto"
                      name="jobTitle"
                      maxLength={120}
                      error={errors.jobTitle}
                      help="Opcional."
                    />
                  </div>
                </Card>
                <Card title="Rol y alcance" titleAs="h2">
                  <div className="users-stack">
                    <RoleScopeFields options={data.options} errors={errors} />
                  </div>
                </Card>
              </fieldset>
              <div className="users-actions">
                <Button
                  variant="primary"
                  icon="user-plus"
                  type="submit"
                  loading={pending}
                  disabled={!data.access.hasMfa || !online}
                >
                  Enviar invitación
                </Button>
                <ButtonLink variant="secondary" href={USERS_TAB_HREF}>
                  Cancelar
                </ButtonLink>
              </div>
            </form>
          )
        }
      />
    </PageWidth>
  );
}
