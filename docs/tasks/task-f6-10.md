# TASK-F6-10 — Estados globales de carga, vacío, error, offline y lectura

Estado: implementada el 22/10/2026 en la rama `feat/f6-09-10-layouts-states` (prompt P7, junto con [TASK-F6-09](task-f6-09.md)). Depende de TASK-F6-03, TASK-F6-06 y de los estados de TASK-F5-15, que unifica.

## Objetivo

Una experiencia de estados coherente en todas las pantallas: reintentos que no duplican efectos, conflictos y fallos visibles y recuperables, y datos locales que no sobreviven a la sesión.

## Entregables

| #   | Entregable                | Resultado                                                                                                                                                                                                                              |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Componente                | `packages/ui/src/patterns/status`: `SystemState` (carga con skeleton, vacío con siguiente acción, error con folio y reintento, sin permiso, sin conexión, modo lectura, conflicto 412, sesión expirada, no encontrado) y `Skeleton`    |
| 2   | Unificación F5-15         | `ServiceState` y `failure.ts` pasan a `apps/private-web/src/components/system-state` y dibujan `SystemState`; las pantallas y estados de carga que lo usaban no cambian de API. Perfil y «Cuentas y máquinas» dejan sus avisos propios |
| 3   | Folio para soporte        | El BFF reenvía el `correlationId` de la API (`upstreamFailure`), `readFailure` lo valida y los estados de error lo muestran; también en los errores iniciales de Auditoría, Trabajos y Avisos                                          |
| 4   | Reintento idempotente     | Lecturas: misma consulta o `router.refresh()` en transición. Escrituras: la misma clave de idempotencia hasta el éxito (`useTemplateAction`); el botón se bloquea mientras corre                                                       |
| 5   | Offline y cola local      | `@ice24/offline`: `queueOperation`, `pendingOperationsOf`, `watchPendingOperations` (el `id` es la clave de idempotencia). Indicador global `PendingOperationsBanner`; la pantalla de campo guarda sin red y envía después             |
| 6   | Limpieza de datos locales | `LogoutForm` avisa si hay pendientes y borra la cola antes de cerrar sesión; el BFF responde `Clear-Site-Data: "cache", "storage"`; `/?error=expired`, `/access/context?error=lost` y `/access/revoked` borran la cola al cargar       |
| 7   | Modo demo                 | Control «Escenario de plantillas» (vacío, sin permiso, conflicto) en el panel Demo; BFF demo `POST /api/plantillas` con 503 + folio, `ACCOUNT_READ_ONLY`, 403 y 412                                                                    |
| 8   | Documentación             | [Estados globales](../design-system/states.md), [módulo de servicios de cuenta](../modules/account-services-ui.md), [catálogo](../design-system/catalog.md), [QA de Fase 6](../qa/phase-6/README.md)                                   |

## Decisiones

- **`ServiceState` se queda como adaptador.** Renombrarlo en una veintena de archivos no aportaba nada; ahora es una capa delgada sobre `SystemState` que añade «Iniciar sesión» en la sesión expirada y no muestra folio en carga ni en vacío.
- **El folio solo se acepta si parece un identificador** (`[0-9a-f-]{8,36}`): el BFF ya no repite texto del servicio, y la pantalla tampoco.
- **Sin cambio de esquema en IndexedDB.** `href` y `attempts` son campos no indexados; Dexie no requiere versión nueva.
- **La cola no sincroniza sola.** Enviar lo pendiente es una acción explícita («Enviar ahora»). La sincronización en segundo plano y la resolución de conflictos son F7-15; F6-10 solo deja el patrón y el indicador.
- **`Clear-Site-Data` como respaldo.** El borrado principal ocurre en el navegador antes de enviar el cierre de sesión. El encabezado cubre el caso en que el JavaScript no corra, y solo aplica en contextos seguros (HTTPS o `localhost`).
- **Galería en `localhost`.** `next dev` reporta las URL como `localhost`, así que la comprobación de `Origin` (CSRF) del BFF rechazaba las escrituras hechas desde `127.0.0.1`. `ux:snapshots` usa ahora `http://localhost:3100` para poder capturar el conflicto tras enviar la acción.

## Archivos

- Nuevos: `packages/ui/src/patterns/status/*`; `apps/private-web/src/components/system-state/{local-data.ts,pending-banner.tsx,logout-form.tsx}`; `docs/design-system/states.md`; este reporte.
- Movidos: `apps/private-web/src/features/account-shell/{failure.ts,service-state.tsx}` → `apps/private-web/src/components/system-state/`.
- Modificados: `packages/offline/src/{index.ts,offline.test.ts}`; `apps/private-web/package.json` (dependencia `@ice24/offline`); `server/bff/responses.ts`; `app/api/auth/logout/{route.ts,route.test.ts}`; `app/(account)/{layout.tsx,profile/page.tsx}` y los `loading.tsx` (skeleton); `app/(account)/{audit,jobs,notifications}/page.tsx` (folio); `app/page.tsx`, `app/access/{context,revoked}/page.tsx` (limpieza); `features/account-shell/{account-shell.css,account-shell.test.tsx}`; `features/equipment/workspace.tsx`; los imports de `ServiceState`/`failure` en `features/{audit,equipment,files,jobs,navigation,notifications,subscription}`; `tests/integration/ui-services.test.ts`.

## Requisitos cubiertos

TASK-F6-10 (experiencia coherente; reintentos sin efectos duplicados; conflictos y fallos visibles y recuperables; carga, vacío, error, permiso denegado y modo lectura; breakpoints; teclado y WCAG 2.2 AA; pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales validados); UI_UX §13.4, §17 (vacíos con siguiente acción), §18.1 (identificador de referencia), §18.3–18.4, §19.1, §20.1, §20.5 y §20.7; API.md (`If-Match`/412, `ACCOUNT_READ_ONLY`, `correlationId`).

## Validación

Comandos ejecutados el 22/10/2026 en Windows 11 con Node 24, Docker Desktop 29.7.2 y Chromium de Playwright 1.62.1 (válidos también para [TASK-F6-09](task-f6-09.md)):

| Comando                                       | Resultado                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                                  | Pasa: formato, lint, tipos, límites, infraestructura, identidad, colores, contraste, catálogo (48 componentes con historia, prueba y matriz) y 764 pruebas unitarias en 102 archivos |
| `pnpm build`                                  | Pasa (14 tareas), compilado con `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329` como en CI; incluye las seis rutas `/plantillas` y `/api/plantillas`                                   |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Pasa: 19 archivos, 150 pruebas (PostgreSQL en Testcontainers, API completa, web compilada y Chromium), incluida la nueva prueba F6-10                                                |
| `pnpm ux:snapshots`                           | Pasa: 450 capturas sin observaciones; 117 nuevas de «Plantilla · …» (5 layouts × 7–8 estados × 3 viewports) y 24 de las matrices nuevas de Storybook (Layouts y Estados)             |

Pruebas nuevas o cambiadas:

- **Unitarias (`@ice24/ui`):** `SystemState` en sus nueve estados (rol `status`/`alert`, `data-state`, nombre accesible), carga con `aria-busy` y título oculto tras el skeleton, folio, reintento bloqueado mientras corre, siguiente acción del vacío, conflicto sin sobrescribir, axe sin violaciones; `Skeleton`. Layouts: `PageHeader` único `h1`; `ListLayout` con filtros plegables (`aria-expanded`/`aria-controls`) y estado que conserva encabezado y filtros; `DetailLayout` con «Historial» al final y panel lateral; `WizardLayout` (validación por paso con foco, avance, volver a un paso hecho, revisión, un solo envío, bloqueo con motivo, axe); `KpiCard` «Sin datos» y «Datos parciales»; `MobileOperationalLayout` conserva las acciones con un estado.
- **Unitarias (web):** `ServiceState` con folio solo en fallos; `readFailure` conserva el folio y descarta valores que no son identificadores; cierre de sesión con `Clear-Site-Data`; BFF de plantillas (misma clave → mismo folio sin duplicar; 503 con folio, `ACCOUNT_READ_ONLY`, 403 y 412; acción o clave inválida, otro contexto y sesión real → 400, 409 y 404); escenario del panel Demo; `queueOperation` por id.
- **Navegador (`ui-services.test.ts`, «F6-10»):** error con folio y «Reintentar» que hace exactamente una lectura nueva; sesión expirada con «Iniciar sesión» hacia `/?error=expired`; cambio pendiente local → indicador global con «Ver pendientes», con y sin conexión; aviso al cerrar sesión con pendientes («Volver y sincronizar» conserva el cambio); limpieza de la cola en `/access/context?error=lost` y `/?error=expired`; borrado antes de enviar el cierre de sesión; sin desplazamiento horizontal a 375 px. Las pruebas de F5-15 siguen cubriendo el conflicto 412 en pantallas reales (alertas y trabajos) y la pérdida de conexión en Archivos; las de F6-07 y F6-08, la pérdida de permiso.
- **Galería:** cada plantilla en carga, vacío, error, sin permiso, sin conexión, modo lectura y (salvo la lista, que no escribe) conflicto tras enviar la acción.

## Riesgos y deuda

- Solo la plantilla de campo escribe en la cola local; las pantallas reales de campo llegan en Fase 7 y la sincronización con F7-15.
- `Clear-Site-Data: "storage"` también desregistra el service worker; se vuelve a registrar en la siguiente carga.
- La galería depende de que `localhost` resuelva al servidor local (`next dev -H 127.0.0.1`); en un entorno donde `localhost` apunte solo a IPv6 habría que fijar `UX_SNAPSHOTS_BASE_URL`.
- La pérdida de permiso dentro de una misma cuenta no borra la cola: la cola no guarda datos de lectura, y la API rechaza cualquier envío sin permiso.

## Validación manual pendiente

Revisión UX del checklist siguiente por Producto/UX.

## Checklist de revisión UX

1. Arrancar el modo demo: `ICE24_DEMO_MODE=1 pnpm dev:private` (PowerShell: `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`) y abrir http://localhost:3000/?demo=1. En el menú aparece **Plantillas** (solo en el demo). La galería con todas las capturas está en `docs/qa/phase-6/ux-review/index.html` (rutas «Plantilla · …» y «Matriz · …» de Layouts y Estados).
2. **Lista** (`Plantillas › Lista`): encabezado, «Solicitar alta», dos indicadores, filtros, tabla y paginación. En celular la tabla se vuelve tarjetas y los filtros se abren con **Filtros**; al filtrar, el botón dice cuántos hay activos. Un filtro sin resultados ofrece «Limpiar filtros».
3. **Detalle** (`Plantillas › Detalle` o «Ver» en la lista): folio arriba del título, tres estados de la máquina, «Registrar lectura», resumen, pestañas Técnico / Sanitario / Documentos / **Historial** y panel «Ubicación» (en tableta y celular baja al final). «Registrar lectura» devuelve un folio.
4. **Flujo por pasos** (`Plantillas › Flujo por pasos`): «Siguiente» sin llenar muestra qué falta y no avanza; con datos válidos (modelo, serie como FAB-44910, sucursal y la casilla de documentos) llega a **Revisión** y «Enviar solicitud» muestra el folio. Los pasos hechos se pueden volver a abrir.
5. **Dashboard** (`Plantillas › Dashboard`): «Hielo producido» con «Datos parciales» (una máquina no reportó), «Ventas: Sin datos» (no cero), alertas antes que tareas y «Marcar enterado».
6. **Pantalla de campo** (`Plantillas › Pantalla de campo`, mejor en el celular): botones grandes abajo, estado de conexión junto al título y progreso del checklist. «Completar orden» dice cuántos pasos faltan; «Guardar en este dispositivo» siempre está disponible.
7. **Forzar estados desde el panel Demo** (abajo a la derecha), en cualquier plantilla:
   - **Conexión → «Carga lenta (2.5 s)»**: se ve el esqueleto de carga.
   - **Conexión → «Error del servicio»**: «No fue posible…», **folio para soporte** y «Reintentar».
   - **Conexión → «Sin conexión»**: banner global «Sin conexión» y el estado sin conexión en la pantalla. En la pantalla de campo, «Guardar y completar cuando haya red» guarda la orden en el dispositivo y aparece el aviso de pendientes; al volver a «Normal», «Enviar ahora» la envía sin duplicarla.
   - **Estado de la cuenta → «Solo lectura (pago rechazado)»**: el contenido se ve, las acciones dicen por qué no se pueden usar y aparece el candado «Modo lectura».
   - **Escenario de plantillas → «Vacío»**: cada pantalla explica qué aparecerá y, si aplica, la siguiente acción («Solicitar alta»).
   - **Escenario de plantillas → «Sin permiso»**: «Sin permiso» sin mostrar datos.
   - **Escenario de plantillas → «Conflicto de versión (412)»**: al enviar la acción (Registrar lectura, Enviar solicitud, Marcar enterado o Completar orden) aparece «La información cambió» con «Actualizar»; nada se sobrescribe.
8. **Reintento sin duplicar**: con «Error del servicio», enviar una acción; cambiar a «Normal» y pulsar «Reintentar»: se registra una sola vez (el mismo folio aunque se insista).
9. **Cerrar sesión con pendientes** (en **Perfil**): con una orden guardada en el dispositivo (paso 7, sin conexión), «Cerrar todas las sesiones» avisa «Tienes 1 cambio sin sincronizar» y ofrece «Volver y sincronizar» o «Cerrar sesión y eliminar».
10. **Teclado**: en el flujo por pasos, Tab recorre campos y botones; al pulsar «Siguiente» el foco va al título del paso o al aviso de error.
11. **Pantallas reales**: Auditoría, Archivos, Avisos, Suscripción, Trabajos, Perfil y Cuentas y máquinas muestran los mismos estados con «Error del servicio», «Carga lenta» y «Sin conexión».

**Qué deben opinar sus jefes:** (a) **claridad de los mensajes**: cada estado dice qué pasó y si se hizo o no algún cambio, sin palabras técnicas, y el folio se entiende como algo para dar a soporte; (b) **siguiente acción**: siempre queda claro qué hacer (reintentar, actualizar, solicitar alta, ver suscripción, iniciar sesión) y nunca se ofrece una acción que no aplica; (c) **uso en celular**: la lista en tarjetas se lee bien, los filtros no estorban y la pantalla de campo se puede usar con una mano y con guantes (¿les parecen suficientes los 64 px?); (d) si «Escenario de plantillas» del panel es comprensible para quien revisa; (e) si los textos («Guardar en este dispositivo», «Folio para soporte», «La información cambió», «Volver y sincronizar») suenan a ICE24. Las observaciones se registran en el PR.
