# TASK-F6-08 — Selector de contexto y persistencia segura

Estado: implementada el 20/10/2026 en la rama `feat/f6-08-context-selector` (prompt P6). Depende de TASK-F6-06 (shell), TASK-F3-06 (cambio de cuenta sin nuevo login) y TASK-F3-07 (`@ice24/authorization`).

## Objetivo

Que cuenta, rol, sucursal y máquina estén siempre visibles en la barra superior y se puedan cambiar sin nuevo login, ofreciendo solo lo que el usuario alcanza y sin confiar nunca en un valor guardado en el navegador.

## Entregables

| #   | Entregable          | Resultado                                                                                                                                                                                                                                                |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Contrato            | `contextFocusSchema` y `contextFocusOptionsSchema` en `@ice24/contracts`; filas SES-026 y SES-027 en `context/API.md`                                                                                                                                    |
| 2   | API                 | `GET session-contexts/current/focus-options` y `POST session-contexts/current/focus` en `IdentityController`; `IdentityStore` resuelve el alcance en SQL (cuenta completa, sucursales del ámbito, máquinas asignadas y sus sucursales)                   |
| 3   | Auditoría           | `CONTEXT_FOCUS_CHANGED` en `audit.events` (actor, contexto, cuenta, sucursal, máquina, correlación, resultado) con `appendAuditEvent` de F5-04. El cambio de cuenta ya auditaba `CONTEXT_ACTIVATED` (F3-06)                                              |
| 4   | BFF                 | `POST /api/session-context/focus` (nuevo) y `POST /api/session-context` (ahora con `returnTo` y respuesta JSON para el selector, sin cambiar el formulario de `/access/context`). CSRF + `Origin` en ambos                                               |
| 5   | Persistencia segura | El foco vive en la cookie de sesión cifrada (AES-256-GCM, `HttpOnly`, `SameSite=Lax`, `Secure` en producción) y solo se guarda después de que la API lo valida. Cada carga del shell vuelve a pedir las opciones a la API                                |
| 6   | Selector            | `features/context/context-selector.tsx`: botón con las cuatro piezas y `Dialog` de F6-03 (hoja inferior en móvil); estados de carga por opción, vacío, rol sin elección, error y confirmación de cambios sin guardar                                     |
| 7   | Pérdida de permiso  | Foco fuera de alcance → el shell muestra «Todas» y el banner «Cambió tu acceso» («Entendido» guarda «Todas»). Contexto que la API ya no reconoce (404) → `/access/context?error=lost` con el motivo                                                      |
| 8   | Cambio de contexto  | `Clear-Site-Data: "cache"` y carga del destino como documento nuevo. Otra cuenta: inicio del mismo módulo si el nuevo rol puede abrirlo, si no su primer destino; el foco anterior se descarta. Misma cuenta: se conserva la página                      |
| 9   | Cambios sin guardar | `features/context/unsaved-changes.ts`: `useUnsavedChanges(dirty)` y `hasUnsavedChanges()`. El selector pide confirmación; F6-11 lo completa                                                                                                              |
| 10  | Modo demo           | `focus-options` y `focus` en la API simulada con el mismo alcance por persona; el foco vive en la cookie demo y se descarta al cambiar de cuenta                                                                                                         |
| 11  | Storybook y galería | `Shell/Selector de contexto` (cerrado, con foco, abierto, móvil, rol sin elección, vacío, error, acceso perdido); ruta de galería «Selector de contexto» con 8 estados × 3 viewports                                                                     |
| 12  | Documentación       | [Shell](../design-system/shell.md#selector-de-contexto-f6-08), [identidad](../modules/identity.md), [servicios de cuenta](../modules/account-services-ui.md), [QA de Fase 6](../qa/phase-6/README.md), [estado de la fase](../backlog/phase-6-status.md) |

## Decisiones

- **Sin migración.** El foco se guarda en la cookie de sesión cifrada que ya existe, no en `identity.context_sessions`. PROJECT_RULES y el prompt permiten una cookie `HttpOnly` firmada/validada. AES-GCM autentica el contenido: una cookie alterada se descarta entera, y aun una válida se vuelve a contrastar con la API en cada carga. No hay datos que migrar ni que revertir; para volver atrás basta revertir el código (las cookies con `focus` se siguen leyendo, el campo se ignora).
- **El foco no es un permiso.** Solo dice dónde se está trabajando. Cada endpoint sigue autorizando con el sujeto que lee de la base de datos. Por eso el foco solo se muestra por ahora; las pantallas lo usarán como filtro cuando llegue su módulo.
- **La API decide el alcance y lo audita.** El BFF no puede guardar una sucursal que la API no aceptó. Fuera de alcance, incluida otra cuenta, la respuesta es 404, sin revelar si el recurso existe. Volver a «Todas» solo exige un contexto activo (funciona aunque el rol haya perdido `equipment.read`); elegir sucursal o máquina exige `equipment.read`.
- **Permitido en modo lectura** (`AllowReadOnlyOperation("identity-self-service")`): elegir dónde mirar no modifica datos de la cuenta.
- **Alcance del técnico:** las opciones incluyen las sucursales de sus máquinas asignadas (como ya hacía la API simulada), para que vea el nombre de su sucursal. Los listados `branches` de equipos no cambian.
- **Fallo de carga ≠ pérdida de acceso.** Si las opciones no cargan, el selector lo dice y no afirma que se perdió el acceso.

## Archivos

- Nuevos: `apps/private-web/src/features/context/{model.ts,context-selector.tsx,unsaved-changes.ts,context.css,context.test.tsx,switch.test.ts,context-selector.stories.tsx}`; `apps/private-web/src/app/api/session-context/{focus/route.ts,switched.ts}`; este reporte.
- Modificados: `packages/contracts/src/identity.ts`; `apps/api/src/modules/identity/{identity.controller.ts,identity.store.ts,identity.controller.test.ts}`; `apps/private-web/src/app/(account)/layout.tsx`; `apps/private-web/src/app/access/context/page.tsx`; `apps/private-web/src/app/api/session-context/route.ts`; `apps/private-web/src/app/styles.css`; `apps/private-web/src/features/navigation/{private-shell.tsx,navigation.css,navigation.test.tsx}`; `apps/private-web/src/server/account/shell.ts`; `apps/private-web/src/server/session/session.ts`; `apps/private-web/src/server/demo/{api.ts,api.test.ts,session.ts,state.ts}`; `tests/integration/ui-services.test.ts`; `tests/visual/ux-review.routes.ts`; `scripts/ux-snapshots/run.ts`; `.storybook/main.ts` (compila el JSX de las historias de `apps/private-web`, que usa `jsx: "preserve"` por Next; es la primera historia de la app); `docs/qa/phase-6/evidence/20261019-f6-06-shell-mobile.png` (la barra superior cambió); `context/API.md`; `docs/design-system/shell.md`; `docs/modules/{identity.md,account-services-ui.md}`; `docs/qa/phase-6/README.md`; `docs/backlog/phase-6-status.md`.

## Requisitos cubiertos

TASK-F6-08 (cuenta, rol, sucursal y máquina visibles; carga, vacío, error, permiso denegado y modo lectura; teclado y WCAG 2.2 AA; breakpoints 375/768/1280); TASK-F3-06 (cambio de cuenta sin nuevo login); AppFlow «cambio de cuenta/sucursal/máquina»; UI_UX §10.2 y §13.6; PROJECT_RULES §4.2 (validación en servidor, denegación por defecto, pruebas negativas entre cuentas) y §4.5 (auditoría append-only).

## Validación

| Comando                                       | Resultado                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | Pasa: formato, lint, tipos, límites, colores, contraste, catálogo y 728 pruebas unitarias                                                   |
| `pnpm build`                                  | Pasa (14 tareas), compilado con `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329` como en CI                                                    |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Pasa: 19 archivos, 149 pruebas (PostgreSQL en Testcontainers, API completa, web compilada y Chromium)                                       |
| `pnpm ux:snapshots`                           | Pasa: 315 capturas sin observaciones, incluidas las 24 de «Selector de contexto» (8 estados × 3 viewports) y la historia de Storybook nueva |

Pruebas nuevas o cambiadas:

- **Unitarias (API):** el foco pasa por el store con actor, contexto y correlación; elegir requiere `equipment.read`, volver a «Todas» no; 404 con contexto inactivo; funciona en modo lectura; campos malformados o extra (`accountId`) rechazados antes de leer la base de datos.
- **Unitarias (web):** etiquetas de rol; `resolveFocus` (vigente, perdido por sucursal, por máquina o por pareja incoherente, rol sin permiso, fallo de carga que no cuenta como pérdida); `safePath` rechaza rutas absolutas, `//`, `/\` y `/api/`; destino tras el cambio (misma cuenta conserva la página, otra cuenta va al inicio del módulo o al primer destino); registro de cambios sin guardar; selector con las cuatro piezas, solo las cuentas y sucursales del servidor, `aria-current`, axe sin violaciones, máquinas filtradas por sucursal, envío con CSRF y `returnTo`, error del BFF, sin conexión, confirmación de cambios sin guardar, estados de error, permiso denegado y vacío; banner de acceso perdido.
- **BFF (rutas reales):** foco dentro de alcance guardado con `Clear-Site-Data`; fuera de alcance → 404 sin tocar la cookie; sin CSRF, otro `Origin` o id malformado → 403/400; cambio de cuenta descarta el foco y llega al inicio del módulo o al primer destino autorizado; con la sesión real, la API recibe el encabezado de contexto y solo se sella lo que aceptó; un rechazo conserva el foco anterior; **cookie alterada → 401 sin llamar a la API**; el formulario de `/access/context` sigue llevando al perfil.
- **Demo:** opciones por persona (dueño: todo; administrador y técnico: su sucursal); foco fuera de alcance, de otra cuenta o de máquina de otra sucursal → 404; campos extra → 400.
- **Integración (PostgreSQL, API completa, web compilada y Chromium):** opciones por rol; foco auditado con todos sus campos; 400 por id inválido o campo extra; **aislamiento**: el dueño de otra cuenta recibe 404 con la sucursal ajena (sin auditoría a su nombre), no puede usar un contexto ajeno ni para volver a «Todas», y no ve sucursales ajenas; **pérdida de permiso**: al terminar el ámbito del operador, la sucursal deja de ofrecerse y su foco da 404. En el navegador: selector con las cuatro piezas, solo la sucursal propia, aplicar mantiene `/files`, hoja inferior a 375 px con Escape y retorno del foco, sin desplazamiento horizontal; ámbito revocado → banner «Cambió tu acceso» y «Todas»; cambio a una segunda cuenta → inicio del módulo, rol nuevo, `CONTEXT_ACTIVATED` y nada de la primera cuenta; membresía terminada → `/access/context?error=lost` sin la cuenta perdida. Evidencia en `docs/qa/phase-6/evidence/20261020-f6-08-*.png`.

## Riesgos y deuda

- **El foco aún no filtra pantallas.** Se ve y se valida, pero Cuentas y máquinas, Archivos y Avisos todavía muestran todo lo del ámbito. Cada módulo (F6-09 en adelante) debe leer `session.focus` en servidor, nunca un parámetro del navegador.
- `hasUnsavedChanges()` solo lo consulta el selector; ningún formulario existente llama todavía `useUnsavedChanges` (F6-11).
- `Clear-Site-Data` solo se aplica en contextos seguros (HTTPS o `localhost`). En cualquier caso la carga de un documento nuevo descarta los datos en memoria, y el service worker no guarda datos protegidos (Fase 1).
- Las opciones se limitan a 200 sucursales y 200 máquinas, igual que los listados de equipos. Una cuenta más grande necesitará búsqueda en el selector.
- Integración sin máquinas reales: crear una máquina exige solicitud, modelo y plantilla. El foco por máquina se cubre con la API simulada, las pruebas unitarias y la misma consulta de alcance que usa `machines`.

## Validación manual pendiente

Revisión UX del checklist siguiente por Producto/UX.

## Checklist de revisión UX

1. Arrancar el modo demo: `ICE24_DEMO_MODE=1 pnpm dev:private` (PowerShell: `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`) y abrir http://localhost:3000/?demo=1. Entrar a **Archivos privados**.
2. **Siempre visible:** arriba, el botón del contexto dice cuenta («Hielo Polar del Norte»), rol («Propietario de cuenta»), sucursal y máquina («Todas · Todas»). Comprobarlo en escritorio, tableta y celular (en celular ocupa una segunda fila completa).
3. **Cambiar de sucursal y máquina (Dueño):** abrir el selector → **Sucursal** «Centro Monterrey» → **Máquina** solo ofrece las de esa sucursal → elegir «Despachadora Juárez» → **Aplicar sucursal y máquina**. Verificar que se queda en Archivos privados y que arriba dice «Centro Monterrey · Despachadora Juárez (ICE24-MTY-0001)».
4. **Volver a todas:** abrir el selector, elegir «Todas las sucursales» y aplicar; arriba vuelve a «Todas · Todas».
5. **Cambiar de cuenta:** abrir **Cuentas y máquinas** (o cualquier pantalla), abrir el selector y elegir «Agua y Hielo del Bajío». Verificar que llega al inicio del mismo módulo, que arriba dice la cuenta nueva y que la sucursal y máquina volvieron a «Todas». La cuenta actual aparece marcada como «Actual»; las cuentas en solo lectura llevan la etiqueta «Solo lectura».
6. **Solo lo mío (por rol):** en el panel **Demo** elegir **Administrador de sucursal** y abrir el selector: solo aparece su sucursal y sus máquinas. Repetir con **Técnico**: solo la sucursal y las máquinas asignadas. El **Dueño** ve las dos sucursales.
7. **Pérdida de acceso:** como **Dueño**, elegir la sucursal «Cumbres» y aplicar. En el panel **Demo** cambiar a **Administrador de sucursal** (no tiene acceso a Cumbres). Debe aparecer el aviso amarillo «Cambió tu acceso», arriba debe decir «Todas», y **Entendido** debe quitar el aviso.
8. **Errores sin pánico:** en el panel Demo, red «Error del servicio» → abrir el selector: explica que no se pudieron cargar las cuentas ni las sucursales y que el contexto actual sigue activo. Con «Sin conexión» ocurre lo mismo.
9. **Modo lectura:** con la cuenta en «Solo lectura (pago rechazado)», el selector sigue funcionando: elegir dónde mirar no modifica datos.
10. **Celular:** a 375 px el selector se abre desde abajo (hoja inferior) y se cierra con la «X», con Escape o tocando fuera; no hay desplazamiento horizontal.
11. **Teclado:** con Tab llegar al botón del contexto, abrir con Enter, recorrer cuentas, listas y botón con Tab, y cerrar con Escape; el foco vuelve al botón del contexto.
12. **Galería** (`docs/qa/phase-6/ux-review/index.html`, ruta «Selector de contexto»): revisar los 8 estados × 3 tamaños (cerrado, con sucursal y máquina, abierto, Administrador, Técnico, acceso perdido, modo lectura y error).

**Qué deben verificar sus jefes:** (a) se entiende en todo momento dónde se está trabajando; (b) ningún rol ve cuentas, sucursales o máquinas que no le corresponden; (c) al cambiar de cuenta no queda información de la anterior y se llega a un lugar lógico; (d) el aviso de acceso perdido es claro y no asusta; (e) los textos («Contexto de trabajo», «Aplicar sucursal y máquina», «Cambió tu acceso», «Entendido») suenan a ICE24. Las observaciones se registran en el PR.
