import { ServiceState } from "../../components/system-state/service-state";
import type { LinkDecision } from "./deep-links";

// A plain submit button: the design system's <Button> carries a click handler, which a server
// component cannot pass on. Same look as `buttonClassName({ variant: "primary" })`.
const SUBMIT = "ids-button ids-button--primary ids-button--md";

/**
 * Page of a link that belongs to another context (F6-11, AppFlow §6.2), shown instead of the
 * page itself. Switching is one explicit, CSRF-protected step the API audits; a link outside the
 * viewer's reach gets the same «sin permiso» whether or not the account or branch exists.
 */
export function DeepLinkPrompt({
  decision,
  path,
  csrfToken,
}: {
  decision: LinkDecision;
  path: string;
  csrfToken: string;
}) {
  return (
    <main id="main-content" className="private-shell deep-link">
      <h1>Abrir enlace</h1>
      {decision.kind === "denied" && (
        <ServiceState
          kind="forbidden"
          title="No tienes acceso a este enlace"
          message="El enlace es de una cuenta o sucursal a la que tu usuario no tiene acceso. Si lo necesitas, pide acceso a quien te lo compartió o al propietario de la cuenta."
        />
      )}
      {decision.kind === "unavailable" && (
        <ServiceState
          kind="error"
          message="No pudimos comprobar a qué cuenta pertenece este enlace. Tu contexto actual sigue activo; vuelve a abrir el enlace en un momento."
        />
      )}
      {decision.kind === "switch-account" && (
        <form className="deep-link__switch" method="post" action="/api/session-context">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="accountId" value={decision.accountId} />
          <input type="hidden" name="next" value={path} />
          <p>
            Este enlace es de la cuenta <strong>{decision.accountName}</strong>. Para abrirlo,
            cambia a esa cuenta; tus permisos se vuelven a calcular y no necesitas iniciar sesión
            otra vez.
          </p>
          <button type="submit" className={SUBMIT}>
            Cambiar a {decision.accountName}
          </button>
        </form>
      )}
      {decision.kind === "switch-branch" && (
        <form className="deep-link__switch" method="post" action="/api/session-context/focus">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="branchId" value={decision.branchId} />
          <input type="hidden" name="machineId" value="" />
          <input type="hidden" name="returnTo" value={path} />
          <p>
            Este enlace es de la sucursal <strong>{decision.branchName}</strong>. Para abrirlo,
            cambia tu sucursal de trabajo.
          </p>
          <button type="submit" className={SUBMIT}>
            Cambiar a {decision.branchName}
          </button>
        </form>
      )}
    </main>
  );
}
