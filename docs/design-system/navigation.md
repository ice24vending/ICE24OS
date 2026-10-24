# Navegación: deep links, regresar y cambios no guardados

TASK-F6-11 · [AppFlow §6.2–6.3 y §9.6](../../context/AppFlow.md#62-acceso-directo-y-deep-links) · complementa el [shell](shell.md), el [selector de contexto](../tasks/task-f6-08.md) y los [layouts](layouts.md).

## Deep links

Un enlace privado es la URL de la página. Si importa a qué cuenta o sucursal pertenece, lleva además `cuenta=<accountId>` y, opcionalmente, `sucursal=<branchId>`. «Copiar enlace» (`CopyLinkButton`) agrega la cuenta activa y quita el origen de «Regresar» (`desde`). El enlace no da ningún permiso por sí mismo.

| Situación al abrir el enlace                           | Resultado                                                                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin sesión                                             | Login con `?next=<ruta>` («Inicia sesión para abrir el enlace»). Con una cookie de sesión vencida, además `error=expired` («La sesión terminó»). En ambos casos se borra la cola local, como en F6-10 |
| Login con contraseña u OIDC                            | `next` viaja en el formulario o, en OIDC, dentro de la cookie firmada del flujo PKCE. Después: `/access/context?next=…`                                                                               |
| Sin contexto activo                                    | `/access/context?next=…`; al elegir la cuenta se abre exactamente la ruta del enlace                                                                                                                  |
| `cuenta` de otra de tus cuentas                        | «Abrir enlace»: dice de qué cuenta es y ofrece «Cambiar a …» (POST con CSRF; la API audita `CONTEXT_ACTIVATED`). No muestra la página hasta cambiar                                                   |
| `sucursal` a tu alcance, distinta de la activa         | Lo mismo, con «Cambiar a <sucursal>» (`/api/session-context/focus`; la API audita `CONTEXT_FOCUS_CHANGED`)                                                                                            |
| Cuenta o sucursal fuera de tu alcance, o que no existe | «No tienes acceso a este enlace»: el mismo texto en ambos casos, sin nombre ni metadatos                                                                                                              |
| No se pudieron cargar tus cuentas o sucursales         | Error con «vuelve a abrir el enlace»: ni cambia ni niega                                                                                                                                              |
| Sin `cuenta`, recurso de otra cuenta                   | Sin cambios: la API responde 403/404 en el contexto activo y la pantalla muestra «sin permiso» o «no encontrado» (F6-07, F5-15)                                                                       |

**Validación del destino (sin open redirects).** `safePath` acepta solo rutas internas: empiezan con `/`, no con `//` ni `/api/`, sin `\` ni caracteres de control (los parsers de URL quitan tabuladores y saltos de línea, así que `/\t/evil.test` se volvería `//evil.test`), y al resolverlas siguen en el mismo origen. `nextPath` además descarta `/` y `/access/…`. Cada ruta que usa `next` lo vuelve a validar: login, `authorize`, `callback`, `/access/context` y `/api/session-context`.

**Cómo llega la URL al layout.** Los layouts de Next no reciben la URL. `src/proxy.ts` copia ruta y query en el encabezado `x-ice24-requested-path`, y solo en páginas (no en `/api`, `/_next`, `/access` ni en archivos). El proxy no decide nada: el layout valida la ruta y la API, los permisos.

## Regresar

- `PageHeader` acepta `backHref` y dibuja «Regresar» arriba del título. `DetailLayout` y `WizardLayout` lo pasan tal cual.
- **Los filtros viven en la URL.** La lista de ejemplo guarda `q`, `ubicacion` y `pagina` en la query con `router.replace`, para que escribir no llene el historial. Un enlace compartido, «Regresar» y el botón atrás muestran la lista igual que estaba. Si el enlace nombra una página que ya no existe, se ajusta a la última.
- **Origen explícito.** La lista enlaza al detalle y al asistente con `desde=<ruta de la lista con su query>` (`withOrigin`); la página usa `backHref(desde, valorPorDefecto)`. Un `desde` externo se ignora.
- «Regresar» es un enlace normal: se puede abrir en otra pestaña y se recorre con teclado.

## Cambios no guardados

`useUnsavedChanges(dirty)` (`features/context/unsaved-changes.ts`) registra la pantalla. `UnsavedChangesGuard`, montado una vez en el layout de cuenta, pregunta con el `Dialog` de F6-03 (`alertdialog`, foco atrapado, Escape = quedarse):

| Al…                               | Qué pasa                                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pulsar un enlace interno          | «Tienes cambios sin guardar» → «Seguir editando» o «Descartar y salir». Se interceptan los clics en fase de captura, así que vale para cualquier `<a>` interno              |
| Botón atrás del navegador/celular | Mientras hay cambios, una entrada extra en el historial con la misma URL. Atrás vuelve a ella, la pantalla no cambia y pregunta; «Descartar y regresar» retrocede de verdad |
| Cambiar de cuenta o sucursal      | El selector de F6-08 confirma («Descartar y cambiar») y limpia el registro antes de cargar la nueva página                                                                  |
| Cerrar o recargar la pestaña      | Aviso propio del navegador (`beforeunload`)                                                                                                                                 |
| Terminar la sesión                | A la hora de `expiresAt` (la cookie no se renueva sola): «Tu sesión terminó», para que se copie lo necesario; «Iniciar sesión» vuelve a esta página                         |

No preguntan: los enlaces a otra pestaña o con tecla modificadora, las descargas, el ancla de la misma página y las pantallas sin cambios. «Iniciar sesión» del estado de sesión expirada (`ServiceState`) también incluye `next`.

Lo usan `ActionForm` (todas las ediciones auditables de configuración de equipos) y el flujo por pasos de ejemplo. Una pantalla nueva solo necesita `useUnsavedChanges(hayCambios)`.

## Pruebas

- Unitarias: `features/navigation/deep-links.test.tsx` (login con `next`, rutas inseguras, decisión de enlace, «sin permiso» igual para cuenta ajena o inexistente, pantalla «Abrir enlace», guard con enlace, atrás, `beforeunload` y fin de sesión); `features/context/{context.test.tsx,switch.test.ts}` (`safePath` endurecido, cambio de contexto que abre el enlace exacto); `server/session/session.test.ts` (`next` firmado en el flujo OIDC).
- Navegador: `tests/integration/ui-services.test.ts` «F6-11» (sin sesión → login con contraseña → contexto → misma URL con filtros; `next` externo ignorado; enlace de sucursal; enlace de otra cuenta con cambio auditado; «sin permiso» idéntico; 375 px) y `tests/integration/components-ui.test.ts` (cambios no guardados en la edición de frecuencias: enlace, atrás, recarga y fin de sesión).
- Galería (`pnpm ux:snapshots`): «Cambios no guardados», «Enlace de otra cuenta» y «Enlace sin permiso».
