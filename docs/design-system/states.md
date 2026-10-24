# Estados globales (F6-10)

Estado: implementado el 22/10/2026 ([TASK-F6-10](../tasks/task-f6-10.md)). Fuentes: UI_UX §13.4, §17–20 y §25; API.md (`If-Match`, 412, `ACCOUNT_READ_ONLY`, `correlationId`). Código: `packages/ui/src/patterns/status` (componente) y `apps/private-web/src/components/system-state` (uso en la app).

## Un componente para todas las pantallas

`SystemState` de `@ice24/ui` dibuja todos los estados. En la app se usa a través de `ServiceState`, que convierte un `Failure` del BFF en el estado con su folio. F6-10 unificó los estados de F5-15: `ServiceState` y `failure.ts` pasaron de `features/account-shell` a `components/system-state`, y ahora renderizan el componente del sistema de diseño. Perfil y «Cuentas y máquinas», que tenían avisos propios, también lo usan.

| Estado          | `kind`      | Región                 | Título por defecto                      | Siguiente acción                                                  |
| --------------- | ----------- | ---------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| Carga           | `loading`   | `status` + `aria-busy` | «Cargando» (oculto detrás del skeleton) | — (`skeleton`: `list`, `detail`, `cards`, `form`)                 |
| Vacío           | `empty`     | `status`               | «Sin resultados» o el de la pantalla    | La acción útil si el permiso la permite («Solicitar alta»)        |
| Error           | `error`     | `alert`                | «No fue posible completar la consulta»  | «Reintentar» idempotente + **folio para soporte**                 |
| Sin permiso     | `forbidden` | `alert`                | «Sin permiso»                           | Ninguna; no revela contenido                                      |
| Sin conexión    | `offline`   | `alert`                | «Sin conexión»                          | «Reintentar» cuando aplica; banner global + cola local            |
| Modo lectura    | `read_only` | `alert`                | «Cuenta en modo lectura»                | «Ver suscripción» (barra global de F6-04)                         |
| Conflicto (412) | `conflict`  | `alert`                | «La información cambió»                 | «Actualizar»: vuelve a leer, nunca sobrescribe                    |
| Sesión expirada | `session`   | `alert`                | «Sesión expirada»                       | «Iniciar sesión» (`/?error=expired`, que borra los datos locales) |
| No encontrado   | `not_found` | `alert`                | «No disponible»                         | —                                                                 |

Reglas:

- **Texto propio, nunca el del servicio.** El BFF responde `{message, code?, correlationId?}` con un mensaje nuestro.
- **Folio para soporte.** `upstreamFailure()` del BFF reenvía el `correlationId` de la API (API.md) y `readFailure()` lo acepta solo si parece un identificador. Las páginas de Auditoría, Trabajos y Avisos también lo muestran cuando el error ocurre al cargar en el servidor.
- **Reintento idempotente.** Una lectura reintenta la lectura (`router.refresh()` en una transición o la misma consulta). Una escritura reenvía la **misma clave de idempotencia** y la misma versión esperada hasta que tiene éxito; el botón se bloquea mientras corre, así que un doble toque envía una sola solicitud.
- **Conflicto.** Un 412 o un código de conflicto no reintenta: ofrece «Actualizar», que vuelve a leer y genera una clave nueva para la nueva decisión.
- **Skeleton solo para estructura conocida** (UI_UX §13.4); no reemplaza un error ni un vacío.

## Sin conexión y cola local

- **Detección:** `useOnline()` (`navigator.onLine` y eventos `online`/`offline`). El panel Demo simula la pérdida de red con la misma señal.
- **Banner global** «Sin conexión» (F5-15) y, nuevo, **indicador de pendientes** (`PendingOperationsBanner`): «n cambios guardados solo en este dispositivo», con «Ver pendientes» y el aviso de que cerrar sesión los elimina.
- **Cola local:** `@ice24/offline` (Dexie, tabla `pendingOperations`, sin cambio de esquema). El `id` de cada operación es su clave de idempotencia, de modo que enviarla más tarde, o reintentarla, no duplica nada. F6-10 añadió `queueOperation`, `pendingOperationsOf` y `watchPendingOperations`, y los campos no indexados `href` y `attempts`. Hoy solo la plantilla de campo escribe en la cola; la sincronización real llega con F7-15.
- **Operaciones que necesitan red** se bloquean con el motivo escrito junto al botón («Sin conexión: necesitas red para enviar esto.»).

## Limpieza de datos locales (UI_UX §20.7)

| Momento                                | Qué pasa                                                                                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cerrar sesión (Perfil)                 | `LogoutForm` avisa si hay pendientes («Tienes n cambios sin sincronizar…», «Volver y sincronizar» / «Cerrar sesión y eliminar») y borra la cola **antes** de enviar el cierre. El BFF responde además `Clear-Site-Data: "cache", "storage"` |
| Sesión expirada                        | `/?error=expired` borra la cola al cargar                                                                                                                                                                                                   |
| Pérdida de acceso a la cuenta          | `/access/context?error=lost` y `/access/revoked` borran la cola al cargar                                                                                                                                                                   |
| Pérdida de permiso dentro de la cuenta | La API responde 403 y la pantalla muestra «Sin permiso» sin datos (F6-07); la cola no guarda datos de lectura                                                                                                                               |

## Cómo forzar cada estado en el modo demo

Arrancar con `ICE24_DEMO_MODE=1 pnpm dev:private` y abrir `/?demo=1`. En el panel **Demo**:

| Estado                     | Control del panel                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Carga (skeleton)           | Conexión → «Carga lenta (2.5 s)»                                                                |
| Error con folio            | Conexión → «Error del servicio»                                                                 |
| Sin conexión               | Conexión → «Sin conexión»                                                                       |
| Modo lectura               | Estado de la cuenta → «Solo lectura (pago rechazado)»                                           |
| Vacío                      | Escenario de plantillas → «Vacío»                                                               |
| Sin permiso                | Escenario de plantillas → «Sin permiso»                                                         |
| Conflicto de versión (412) | Escenario de plantillas → «Conflicto de versión (412)» y luego enviar la acción de la plantilla |

«Escenario de plantillas» es un control nuevo del panel; solo afecta a `/plantillas`. Los demás controles afectan a todas las pantallas.

## Validación

- Unitarias: `SystemState` (nueve estados, roles, folio, reintento bloqueado mientras corre, axe), `ServiceState`, `readFailure` (folio aceptado o descartado), BFF de cierre de sesión (`Clear-Site-Data`), BFF de plantillas (misma clave → mismo folio; 503, 403, `ACCOUNT_READ_ONLY` y 412) y escenario del panel Demo.
- Navegador (`tests/integration/ui-services.test.ts`, «F6-10»): error con folio y reintento que hace una sola lectura nueva, sesión expirada, pendiente local con y sin conexión, aviso al cerrar sesión, limpieza en acceso perdido y sesión expirada, y borrado antes del cierre de sesión. El conflicto 412 en pantallas reales ya lo cubren las pruebas de F5-15 (alertas y trabajos).
- Galería: cada plantilla en carga, vacío, error, sin permiso, sin conexión, modo lectura y conflicto, a 375, 768 y 1280 px.
