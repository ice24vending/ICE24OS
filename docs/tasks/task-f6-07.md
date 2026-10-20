# TASK-F6-07 — Navegación basada en permisos y módulos habilitados

Estado: implementada el 19/10/2026 en la rama `feat/f6-06-07-shell-navigation` (prompt P5, junto con [TASK-F6-06](task-f6-06.md)). Depende de TASK-F3-07 (`@ice24/authorization`) y del módulo de auditoría de F5-04.

## Objetivo

Que los destinos no autorizados no existan para el usuario: el menú se construye en el servidor a partir de las capacidades que decide la API, y un acceso por URL sin permiso muestra «sin permiso» y queda auditado.

## Entregables

| #   | Entregable                 | Resultado                                                                                                                                                                                                                  |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Registro único de destinos | `features/navigation/destinations.ts`: ruta, etiqueta, icono, permiso, MFA, módulo y ubicación (`sidebar`/`bottom`) de los 7 destinos con contexto                                                                         |
| 2   | Contrato                   | `contextCapabilitiesSchema` y `navigationDenialRequestSchema` en `@ice24/contracts`; filas SES-024 y SES-025 en `context/API.md`                                                                                           |
| 3   | API                        | `GET session-contexts/current/capabilities` y `POST session-contexts/current/navigation-denials` en `IdentityController`; ambas deciden con `authorize()` sobre el sujeto que `IdentityStore` lee de la base de datos      |
| 4   | Auditoría                  | `IdentityStore.recordNavigationDenial` reutiliza `appendAuditEvent` de F5-04: `audit.events` con `NAVIGATION_DENIED`, `DENIED`, actor, contexto, cuenta, correlación, destino, permiso y motivo de `authorize()`           |
| 5   | Menú en servidor           | `loadAccountShell` (una vez por petición con `React.cache`) sustituye los sondeos `audit-events?limit=1` y `admin/jobs?limit=1`; solo los destinos autorizados, sin permisos, llegan al navegador                          |
| 6   | Guarda por página          | `guardDestination()` en las 7 páginas: sin permiso no se llama al servicio, se audita y se muestra `DestinationDenied` («Sin permiso» + folio de correlación)                                                              |
| 7   | Modo demo                  | Capacidades y denegación servidas por la API simulada; persona nueva **Administrador ICE24** (IA); el Centro de trabajos exige `jobs.admin-read` como la API real (antes la demo usaba `jobs.read` y lo mostraba al Dueño) |
| 8   | Galería                    | Ruta «Shell y menú por rol»: cada persona del modo demo × 3 viewports; «Centro de trabajos» con Administrador ICE24 y «sin permiso por URL» del Dueño                                                                      |
| 9   | Documentación              | [Shell y navegación](../design-system/shell.md) (matriz destino × rol), [identidad](../modules/identity.md), [servicios de cuenta](../modules/account-services-ui.md), [estado de la fase](../backlog/phase-6-status.md)   |

## Decisiones

- **El servidor de la web decide el menú; la API decide los permisos.** La API no conoce rutas de la web: entrega capacidades (`authorize()` por código, operación de lectura) y la web las cruza con su registro. La clasificación y el ámbito de cada recurso los sigue aplicando cada endpoint.
- **La denegación se vuelve a decidir en la API.** El BFF no puede registrar una denegación inventada: si `authorize()` permite el destino, la API responde 409 y no escribe. La API toma actor, contexto y cuenta del token y de la sesión, nunca del cuerpo.
- **Permitida en modo lectura** (`AllowReadOnlyOperation("identity-self-service")`): un intento sin permiso debe quedar auditado también en una cuenta en solo lectura.
- **Fallo de capacidades:** el menú lo explica y ninguna página se deniega por falta de datos (no se puede afirmar «sin permiso» sin la decisión de la API). Cada servicio sigue aplicando sus permisos.
- **Módulos habilitados:** no existe en la base de datos la habilitación de módulos por cuenta. El registro declara `module` para trazabilidad, pero no filtra por él. Queda como deuda (ver abajo), sin inventar un origen de datos.

## Matriz de destinos por rol

Sale de las concesiones de las migraciones y la comprueban `navigation.test.tsx` (con `authorize()` real) y la integración con base de datos real. La tabla completa está en [shell.md](../design-system/shell.md#navegación-por-permisos-f6-07).

## Archivos

- Nuevos: `apps/api/src/modules/identity/identity.controller.test.ts`; `apps/private-web/src/features/navigation/{destinations.ts,destination-denied.tsx,navigation.test.tsx}` (compartidos con F6-06); este reporte.
- Modificados: `packages/contracts/src/identity.ts`; `apps/api/src/modules/identity/{identity.controller.ts,identity.store.ts}`; `apps/private-web/src/server/account/shell.ts`; `apps/private-web/src/app/(account)/{workspace,subscription,files,audit,jobs,notifications,profile}/page.tsx`; `apps/private-web/src/server/demo/{api.ts,api.test.ts,personas.ts,personas.test.ts,fixtures.ts}`; `tests/integration/{ui-services.test.ts,subscriptions.test.ts}`; `tests/visual/ux-review.routes.ts`; `context/API.md`; `docs/modules/{identity.md,account-services-ui.md}`; `docs/design-system/{shell.md,reference/README.md}`; `docs/qa/phase-6/README.md`; `docs/backlog/phase-6-status.md`.

## Requisitos cubiertos

TASK-F6-07 (destinos no autorizados ausentes; pruebas positivas y negativas de aislamiento entre cuentas, ámbitos y acciones; auditoría con actor, contexto, correlación, valores y resultado); AppFlow FL-02 y FL-11; UI_UX §10 y §23.1; PROJECT_RULES §4.2 (denegación por defecto, validación en servidor, pruebas negativas entre cuentas) y §4.5 (auditoría de negocio append-only).

## Validación

| Comando                                       | Resultado                                                                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | Pasa: formato, lint, tipos, límites, colores, contraste, catálogo y 694 pruebas unitarias                                                       |
| `pnpm build`                                  | Pasa (14 tareas)                                                                                                                                |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Pasa: 19 archivos, 147 pruebas (PostgreSQL en Testcontainers, API completa, web compilada y Chromium)                                           |
| `pnpm ux:snapshots`                           | Pasa: 291 capturas sin observaciones, incluidas las 24 de «Shell y menú por rol» (6 personas + modo lectura + menú no disponible × 3 viewports) |

Pruebas nuevas o cambiadas:

- **Unitarias (web):** registro sin duplicados; destinos exactos por cada una de las 6 personas con `authorize()` real (positivas y negativas); cuenta suspendida sin destinos; destino con MFA oculto hasta verificar; al navegador solo llegan datos de dibujo; barra inferior ≤ 5; breadcrumbs; shell con landmarks, `aria-current`, sin enlaces no autorizados, nombres accesibles y menú no disponible.
- **Unitarias (API):** capacidades sin códigos denegados explícitamente; nada en cuenta suspendida, contexto inactivo o membresía terminada; lectura en modo lectura; MFA; la denegación registra actor, contexto, correlación y el motivo de la API; 409 si el destino está autorizado; destino malformado rechazado antes de leer la base de datos.
- **Demo:** Centro de trabajos solo para IA; capacidades por persona; denegación aceptada sin guardar; IA derivado de las migraciones (incluida la `cross join` de Fase 3).
- **Integración:** capacidades reales por rol (OW, OP, IA); denegación auditada con todos sus campos; 409 y 400; **aislamiento**: el dueño de otra cuenta no puede usar el contexto ajeno (404 en capacidades y en denegación, sin auditoría a su nombre) ni ver la denegación en su auditoría, mientras la dueña sí la ve; en Chromium, el operador no ve Auditoría, Suscripción ni Centro de trabajos (ni ocultos en el DOM), y abrirlos por URL muestra «sin permiso» y deja ≥ 3 eventos `NAVIGATION_DENIED`; shell en 1280/768/375 con colapso, cajón con Escape y retorno de foco, barra inferior ≤ 5, «Ir al contenido» como primer foco y sin desplazamiento horizontal (evidencia `docs/qa/phase-6/evidence/20261019-f6-06-shell-mobile.png`).

Las dos pruebas de carga de archivos fallan si `apps/private-web` se compila sin `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329` (la CSP bloquea el almacenamiento simulado). CI ya compila así; en local hay que hacer lo mismo.

## Riesgos y deuda

- **Habilitación de módulos por cuenta** inexistente: cuando se modele, filtrar también en `authorizedDestinations()` y en la API.
- La guarda vive en cada página: una página nueva con contexto debe registrarse en `DESTINATIONS` y llamar `guardDestination()`. `navigation.test.tsx` verifica el registro, pero no que cada página lo llame.
- Las capacidades se piden en cada carga (sin caché entre peticiones), igual que antes los sondeos: una llamada en lugar de dos.

## Validación manual pendiente

Revisión UX del checklist siguiente por Producto/UX.

## Checklist de revisión UX

1. Arrancar el modo demo: `ICE24_DEMO_MODE=1 pnpm dev:private` (PowerShell: `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`) y abrir http://localhost:3000/?demo=1.
2. En el panel **Demo**, cambiar de persona y comprobar el menú:
   - **Dueño:** Cuentas y máquinas, Avisos, Archivos privados, Suscripción, Auditoría y Perfil. Sin Centro de trabajos.
   - **Administrador de sucursal** y **Técnico:** Cuentas y máquinas, Avisos, Archivos privados y Perfil.
   - **Solo lectura:** lo anterior más Auditoría.
   - **Operador ICE24:** Cuentas y máquinas, Avisos, Suscripción y Perfil.
   - **Administrador ICE24:** todos, incluido Centro de trabajos.
3. Con el Técnico, escribir a mano http://localhost:3000/audit: debe decir «Sin permiso» con un folio, sin mostrar datos.
4. Redimensionar a móvil (375 px): abajo, como máximo cinco botones con «Más», que abre el resto. Arriba: menú, cuenta y campana. Sin desplazamiento horizontal.
5. A 768 px: el botón de tres líneas abre el menú; Escape o tocar fuera lo cierra.
6. En escritorio: «Contraer menú» deja solo iconos (con nombre al pasar el cursor); «Expandir menú» lo restaura.
7. Solo teclado: Tab muestra primero «Ir al contenido»; recorrer el menú con Tab, abrir con Enter; el foco siempre es visible.
8. En el panel Demo, poner la cuenta en **modo lectura**: el menú no cambia y el aviso amarillo sigue arriba del contenido.
