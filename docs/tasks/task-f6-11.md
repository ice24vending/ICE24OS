# TASK-F6-11 — Deep links, regresar y cambios no guardados

Estado: implementada el 23/10/2026 en la rama `feat/f6-11-deep-links-unsaved` (prompt P8). Depende de TASK-F6-06, TASK-F6-07 y TASK-F6-08 (selector de contexto), y usa los layouts de TASK-F6-09.

## Objetivo

Los flujos de AppFlow §6.2 (acceso directo y deep links), §6.3 (regreso, cancelación y abandono) y §9.6 (sesión expirada, contexto revocado), sin ampliar el alcance del PRD.

## Entregables

| #   | Entregable              | Resultado                                                                                                                                                                                                                                  |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Regreso tras el login   | `src/proxy.ts` pasa la ruta al layout de cuenta. Sin sesión → `/?next=…` (con `error=expired` si había cookie). `next` sigue por login con contraseña, OIDC (cookie firmada del flujo PKCE) y `/access/context` hasta abrir la ruta exacta |
| 2   | Sin open redirects      | `safePath` endurecido: rechaza `\`, caracteres de control y todo lo que no resuelva al mismo origen; `nextPath` excluye `/` y `/access/…`. Se valida de nuevo en cada ruta que lo usa                                                      |
| 3   | Enlace de otro contexto | `cuenta`/`sucursal` en la URL: dentro de tu alcance, «Abrir enlace» con «Cambiar a …» (POST con CSRF, auditado por la API); fuera de tu alcance o inexistente, el mismo «No tienes acceso a este enlace»                                   |
| 4   | Copiar enlace           | `CopyLinkButton` (detalle de ejemplo): la página actual con su cuenta y sin el origen de «Regresar»                                                                                                                                        |
| 5   | Regresar                | `backHref` en `PageHeader`, `DetailLayout` y `WizardLayout`. La lista de ejemplo guarda búsqueda, filtro y página en la URL (`router.replace`) y pasa `desde` al detalle y al asistente                                                    |
| 6   | Cambios no guardados    | `useUnsavedChanges` (registro de F6-08, ahora con suscripción y `discardUnsavedChanges`) y `UnsavedChangesGuard` en el layout de cuenta: enlaces internos, botón atrás, cambio de contexto, `beforeunload` y fin de sesión                 |
| 7   | Formularios reales      | `ActionForm` (ediciones auditables de configuración de equipos) y el flujo por pasos de ejemplo marcan sus cambios; «Iniciar sesión» del estado de sesión expirada vuelve a la página                                                      |
| 8   | Documentación           | [Navegación](../design-system/navigation.md), [layouts](../design-system/layouts.md), [QA de Fase 6](../qa/phase-6/README.md), [estado de la fase](../backlog/phase-6-status.md)                                                           |

## Decisiones

- **Cambiar de contexto por enlace pide un clic.** AppFlow §6.2 dice que «puede solicitar cambiar de contexto». Un cambio automático por GET dejaría que cualquier sitio cambie la cuenta activa de quien abre un enlace (CSRF) y se saltaría la confirmación de cambios locales. Con la pantalla «Abrir enlace», el cambio es un POST con token CSRF y auditoría, igual que en el selector.
- **La cuenta va en la URL solo cuando importa** (`cuenta`, `sucursal`). Un enlace sin cuenta se abre en el contexto activo y la API decide (403/404), como desde F6-07. No hizo falta cambiar el contrato de la API.
- **Mismo texto para una cuenta ajena y una inexistente**, sin el nombre de la cuenta. No se registra un evento propio: la API ya audita los cambios de contexto y los accesos denegados a recursos.
- **El layout recibe la URL del proxy, no del cliente.** El proxy reemplaza el encabezado aunque el navegador lo envíe; aun así su valor pasa por `nextPath`, porque solo se usa como destino interno.
- **Botón atrás con una entrada extra en el historial** (misma URL y estado de Next) mientras hay cambios. Es lo único que permite preguntar antes de salir de una SPA al pulsar atrás. Al guardar, la entrada queda y un atrás posterior no cambia de pantalla.
- **Fin de sesión por reloj.** La cookie dura hasta `expiresAt` y no se renueva sola, así que el aviso llega a tiempo sin consultar al servidor.
- **`<button>` nativo en «Abrir enlace».** El `Button` de `@ice24/ui` lleva un manejador de clic que un Server Component no puede pasar a un Client Component; se usan las mismas clases (`ids-button ids-button--primary ids-button--md`).

## Archivos

- Nuevos: `apps/private-web/src/proxy.ts`; `apps/private-web/src/features/navigation/{deep-links.ts,deep-links.test.tsx,deep-link-prompt.tsx,unsaved-guard.tsx,copy-link.tsx}`; `apps/private-web/src/components/system-state/session-login-link.tsx`; `docs/design-system/navigation.md`; este reporte.
- Modificados: `apps/private-web/src/app/(account)/layout.tsx`; `app/page.tsx`; `app/api/demo/route.ts` (la entrada al demo respeta `next`; su `returnTo` usa `safePath`); `app/access/context/page.tsx`; `app/api/auth/{login,authorize,callback}/route.ts`; `app/api/session-context/route.ts`; `server/session/{session.ts,oidc-flow.ts,session.test.ts}`; `features/context/{model.ts,unsaved-changes.ts,context-selector.tsx,context.test.tsx,switch.test.ts}`; `features/navigation/navigation.css`; `features/equipment/configuration-ui.tsx`; `features/templates/{list-screen,detail-screen,wizard-screen}.tsx`; `app/(account)/plantillas/{detalle,asistente}/page.tsx`; `components/system-state/service-state.tsx`; `packages/ui/src/patterns/layouts/{page-header,detail-layout,wizard-layout}.tsx` y `layouts.css`; `tests/integration/{ui-services,components-ui,subscriptions}.test.ts`; `tests/visual/ux-review.routes.ts`; `docs/design-system/layouts.md`; `docs/qa/phase-6/README.md`; `docs/backlog/phase-6-status.md`.

## Requisitos cubiertos

TASK-F6-11 (flujos de AppFlow; carga, vacío, error, permiso denegado y modo lectura conservados; breakpoints; teclado y WCAG 2.2 AA); AppFlow §6.1 (cambios locales al cambiar de contexto), §6.2 (validar sesión, contexto y permiso; solicitar el cambio de contexto; 403 sin metadatos), §6.3 («Regresar» conserva filtros y posición; salir con cambios no guardados pide confirmación) y §9.6 (sesión expirada con reingreso; contexto revocado de vuelta al selector, sin cambios desde F6-08); UI_UX §20.7.

## Validación

Comandos ejecutados el 23/10/2026 en Windows 11 con Node 24, Docker Desktop 29.7.2 y el Chromium de Playwright:

| Comando                                       | Resultado                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                                  | Pasa: formato, lint, tipos, límites, infraestructura, identidad, colores, contraste, catálogo (48 componentes) y 774 pruebas unitarias en 103 archivos             |
| `pnpm build`                                  | Pasa (14 tareas); la web compila con `ƒ Proxy (Middleware)`. Para la integración se compiló con `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329`, como en CI          |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Pasa: 19 archivos, 151 pruebas (PostgreSQL en Testcontainers, API completa, web compilada y Chromium), incluida la nueva prueba F6-11 y la de cambios no guardados |
| `pnpm ux:snapshots`                           | Pasa: 459 capturas sin observaciones, 9 nuevas: «Cambios no guardados», «Enlace de otra cuenta» y «Enlace sin permiso» en 375, 768 y 1280 px                       |

Pruebas nuevas o cambiadas:

- **Unitarias:** `deep-links.test.tsx`: login con `next`; rutas inseguras (`//`, `/	/`, `/api/`, `/access/`); decisión de enlace (cambiar cuenta o sucursal, el mismo «sin permiso» para cuentas ajenas o inexistentes, no disponible); «Copiar enlace» sin origen; `desde` → «Regresar»; pantalla «Abrir enlace» (formulario con CSRF y `next`); guard (enlace con «Seguir editando» y «Descartar y salir», sin cambios no pregunta, `beforeunload`, botón atrás y fin de sesión). Además: `safePath` con tabulador, salto de línea y `/./api/`; cambio de cuenta que abre el enlace exacto y rechaza uno externo; `next` firmado en el flujo OIDC y rechazado si se altera; entrada al demo con `next`.
- **Navegador (`ui-services.test.ts`, «F6-11»):** sin sesión, `/files?…` → `/?next=…` → login con contraseña → `/access/context?next=…` → misma URL con filtros; `next` externo ignorado en el login; enlace de sucursal → «Cambiar a Centro» → misma URL; enlace de otra cuenta → «Abrir enlace» sin datos → cambio auditado (`CONTEXT_ACTIVATED`); cuenta ajena e inventada con el mismo texto y sin nombre; sin desplazamiento horizontal a 375 px. `subscriptions.test.ts` espera ahora `/?next=%2Fsubscription`.
- **Navegador (`components-ui.test.ts`):** en la edición de frecuencias, enlace interno → diálogo → «Seguir editando» conserva el texto; botón atrás → mismo diálogo sin cambiar de URL; recarga → aviso `beforeunload`; «Descartar y salir» navega; sesión de 20 s → «Tu sesión terminó» → `/?error=expired&next=%2Fworkspace`.

Evidencia: `docs/qa/phase-6/evidence/20261023-f6-11-{unsaved-desktop,session-ended,switch,denied-mobile}.png`.

## Riesgos y deuda

- `sucursal` en un enlace de otra cuenta pide dos pasos: primero la cuenta y después la sucursal.
- Un fallo de `/api/session-context/focus` desde el formulario de «Abrir enlace» responde JSON (lo hacía igual para el selector, que lo lee con `fetch`). Es raro, porque la sucursal ya se validó al dibujar la pantalla; si ocurre, la persona ve el mensaje en crudo y vuelve atrás.
- La entrada extra del historial queda si la persona guarda y no sale: el siguiente «atrás» no cambia de pantalla.
- `beforeunload` lo controla el navegador: Chrome y Safari solo lo muestran si hubo interacción con la página, y no se puede personalizar el texto.
- Solo `ActionForm` y el asistente de ejemplo registran cambios. Cada formulario nuevo (Fase 7) debe llamar a `useUnsavedChanges`.
- En el login no se completó un recorrido OIDC real (el doble de pruebas solo publica JWKS). Lo cubren las pruebas unitarias del flujo firmado y la del enlace en la página de login.

## Validación manual pendiente

Revisión UX del checklist siguiente por Producto/UX.

## Checklist de revisión UX

Preparación: modo demo con `ICE24_DEMO_MODE=1 pnpm dev:private` (PowerShell: `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`) y http://localhost:3000/?demo=1, persona **Dueño** (tiene dos cuentas: Hielo Polar del Norte y Agua y Hielo del Bajío). La galería con las capturas nuevas está en `docs/qa/phase-6/ux-review/index.html` (rutas «Cambios no guardados», «Enlace de otra cuenta» y «Enlace sin permiso»).

1. **Copiar un enlace y abrirlo en otra ventana.** En `Plantillas › Lista`, busca «MTY», elige una sucursal, pasa a la página 2 si la hay y pulsa «Ver» en una máquina. En el detalle, pulsa **Copiar enlace**. Abre una ventana privada (sin sesión) y pega el enlace: primero pide iniciar sesión («Inicia sesión para abrir el enlace») y, al pulsar «Explorar con datos ficticios (modo demo)», debe llegar a esa misma máquina. _Esperado: nunca cae en el inicio genérico._
2. **Regresar sin perder la búsqueda.** En el mismo detalle, pulsa **Regresar**: vuelve a la lista con la misma búsqueda, sucursal y página. Repite con el botón atrás del navegador y, en el celular, con el gesto o botón atrás. _Esperado: la lista queda igual que la dejaste._
3. **Editar un formulario y salir.** En la lista, pulsa «Solicitar alta» y elige un modelo. Después intenta salir de tres formas: un destino del menú, **Regresar** y el botón atrás. _Esperado: siempre aparece «Tienes cambios sin guardar»; «Seguir editando» conserva el modelo elegido y «Descartar y salir» (o «Descartar y regresar») sí sale._ Con datos escritos, cierra o recarga la pestaña: el navegador muestra su propio aviso.
4. **Cambiar de cuenta con cambios sin guardar.** Con el modelo elegido en «Solicitar alta», abre el selector de contexto (arriba) y elige la otra cuenta. _Esperado: «Si cambias de contexto ahora, los cambios de esta pantalla se perderán», con «Seguir editando» y «Descartar y cambiar»._
5. **Enlace de otra cuenta tuya.** Copia el enlace de una máquina estando en Hielo Polar del Norte, cambia a Agua y Hielo del Bajío con el selector y abre el enlace. _Esperado: «Abrir enlace — Este enlace es de la cuenta Hielo Polar del Norte» con «Cambiar a Hielo Polar del Norte»; no se ve ningún dato hasta pulsarlo, y después aparece la máquina._
6. **Enlace sin permiso.** En la barra de direcciones, cambia el valor de `cuenta=` del enlace por otro cualquiera (por ejemplo, cambia el último número). _Esperado: «No tienes acceso a este enlace», sin el nombre de ninguna cuenta y sin decir si el registro existe; el mismo texto para cualquier valor inventado._
