# F7-18 — Bloque A: descarga múltiple de la ruta

**Estado vigente al 10/11/2026:** UX F7-18 aprobada explícitamente por el usuario solicitante; commit y PR autorizados. Las anotaciones de rechazo o revisión pendiente siguientes son antecedentes de iteraciones anteriores. Gate F7 no aprobado.

Solicitud del 09/11/2026. Rama `codex/f7-route-download`, basada en `main` (`233f915`, P10–P12 integrado). Bloque independiente para PR; sin push ni migraciones remotas. Los documentos locales de P13 y cambios anteriores se conservan fuera del bloque.

## Regla confirmada y comportamiento

El usuario confirmó incluir órdenes abiertas asignadas al técnico con vencimiento hoy o anterior, más las que ya están en atención. La fecha se evalúa en la zona de cada sucursal. La selección completa no depende de filtros ni paginación visibles; siempre respeta el ámbito autorizado del contexto. Orden confirmado en la segunda revisión: primero `in_progress`; dentro de cada grupo, `due_at` ascendente (sin fecha al final); en empate, prioridad descendente (`critical`, `high`, `normal`, `low`, sin prioridad al final) y después `id` ascendente. El modelo actual de orden no tiene prioridad propia, por lo que se usa la del ticket de origen; las órdenes por actividad sin ticket no tienen prioridad. Este mismo orden se conserva al asignar cuota: una orden en atención puede preceder a una atrasada que vence antes.

En `/maintenance/work-orders?view=assigned`, «Ver mi ruta» consulta cantidad y espacio estimado antes de pedir confirmación. El servidor no crea reservas al preparar la ruta. Al confirmar, cada orden usa el mismo endpoint que DownloadOrder, con If-Match e idempotencia. Las reservas activas y no vencidas de otro usuario o dispositivo se marcan como «Reservada en otro dispositivo»: no se incluyen en el botón ni en los MB estimados, y no consumen cuota de la planificación. Solo se devuelve una marca booleana, sin identidad del titular ni datos del dispositivo. Una copia local antigua no anula ese bloqueo. La consulta valida `deviceId` como UUID; si se omite, toda reserva activa se considera ajena. La descarga individual vuelve a comprobar el bloqueo en servidor para cubrir carreras. Un fallo se registra individualmente y no detiene las demás. Las órdenes que ya están guardadas localmente no se sobrescriben.

La estimación incluye definición, última ejecución y margen para el paquete cifrado; no incluye fotos nuevas que todavía no se capturan. Se comprueba uso real de los cuatro almacenes protegidos y espacio estimado del navegador antes de cada descarga. El límite autoritativo de 50 MB por orden y 250 MB por dispositivo sigue en la transacción IndexedDB existente. No se borra evidencia para hacer espacio. Si la reserva se creó pero falló la escritura local, se conserva la clave de intento para recuperar la misma respuesta en un reintento.

## Archivos permitidos en el PR de A

Lista cerrada de archivos del bloque. En los documentos compartidos solo entran los añadidos de F7-18, no los cambios locales previos de P13. No utilizar `git add -A`.

- `apps/api/src/modules/synchronization/synchronization.controller.ts`
- `apps/api/src/modules/work-orders/application/offline-orders.ts`
- `apps/api/src/modules/work-orders/infrastructure/work-orders.store.ts`
- `apps/private-web/src/app/api/synchronization/[[...path]]/route.ts`
- `apps/private-web/src/features/sync/download-client.ts`
- `apps/private-web/src/features/sync/download-order.css`
- `apps/private-web/src/features/sync/download-order.tsx`
- `apps/private-web/src/features/sync/download-route.stories.tsx`
- `apps/private-web/src/features/sync/download-route.tsx`
- `apps/private-web/src/features/sync/local-orders.ts`
- `apps/private-web/src/features/sync/route-downloads.test.ts`
- `apps/private-web/src/features/sync/route-downloads.ts`
- `apps/private-web/src/features/work-orders/work-orders-page.tsx`
- `apps/private-web/src/features/work-orders/work-orders-screen.tsx`
- `apps/private-web/src/server/demo/api.ts`
- `apps/private-web/src/server/demo/offline-orders.ts`
- `docs/backlog/phase-7-status.md`
- `docs/modules/maintenance.md`
- `docs/qa/phase-7/traceability.md`
- `docs/tasks/task-f7-18.md`
- `packages/contracts/src/private/maintenance/offline.ts`
- `scripts/ux-walkthroughs/run.ts`
- `tests/e2e/maintenance/route-download.spec.ts`
- `tests/integration/work-orders.test.ts`
- `tests/visual/__screenshots__/matriz-mantenimiento-descarga-de-ruta--normal--escritorio-amplio.png`
- `tests/visual/__screenshots__/matriz-mantenimiento-descarga-de-ruta--normal--escritorio.png`
- `tests/visual/__screenshots__/matriz-mantenimiento-descarga-de-ruta--normal--movil.png`
- `tests/visual/__screenshots__/matriz-mantenimiento-descarga-de-ruta--normal--tableta.png`
- `tests/visual/__screenshots__/route-download-confirmacion--normal--escritorio-amplio.png`
- `tests/visual/__screenshots__/route-download-confirmacion--normal--escritorio.png`
- `tests/visual/__screenshots__/route-download-confirmacion--normal--movil.png`
- `tests/visual/__screenshots__/route-download-confirmacion--normal--tableta.png`
- `tests/visual/__screenshots__/route-download-en-curso--normal--escritorio-amplio.png`
- `tests/visual/__screenshots__/route-download-en-curso--normal--escritorio.png`
- `tests/visual/__screenshots__/route-download-en-curso--normal--movil.png`
- `tests/visual/__screenshots__/route-download-en-curso--normal--tableta.png`
- `tests/visual/__screenshots__/route-download-modo-lectura--normal--escritorio-amplio.png`
- `tests/visual/__screenshots__/route-download-modo-lectura--normal--escritorio.png`
- `tests/visual/__screenshots__/route-download-modo-lectura--normal--movil.png`
- `tests/visual/__screenshots__/route-download-modo-lectura--normal--tableta.png`
- `tests/visual/__screenshots__/route-download-no-caben--normal--escritorio-amplio.png`
- `tests/visual/__screenshots__/route-download-no-caben--normal--escritorio.png`
- `tests/visual/__screenshots__/route-download-no-caben--normal--movil.png`
- `tests/visual/__screenshots__/route-download-no-caben--normal--tableta.png`
- `tests/visual/__screenshots__/route-download-parcial--normal--escritorio-amplio.png`
- `tests/visual/__screenshots__/route-download-parcial--normal--escritorio.png`
- `tests/visual/__screenshots__/route-download-parcial--normal--movil.png`
- `tests/visual/__screenshots__/route-download-parcial--normal--tableta.png`
- `tests/visual/__screenshots__/route-download-preview--tecnico--escritorio-amplio.png`
- `tests/visual/__screenshots__/route-download-preview--tecnico--escritorio.png`
- `tests/visual/__screenshots__/route-download-preview--tecnico--movil.png`
- `tests/visual/__screenshots__/route-download-preview--tecnico--tableta.png`
- `tests/visual/__screenshots__/route-download-sin-conexion--normal--escritorio-amplio.png`
- `tests/visual/__screenshots__/route-download-sin-conexion--normal--escritorio.png`
- `tests/visual/__screenshots__/route-download-sin-conexion--normal--movil.png`
- `tests/visual/__screenshots__/route-download-sin-conexion--normal--tableta.png`
- `tests/visual/__screenshots__/ui-wo-01--tecnico--escritorio-amplio.png`
- `tests/visual/__screenshots__/ui-wo-01--tecnico--escritorio.png`
- `tests/visual/__screenshots__/ui-wo-01--tecnico--movil.png`
- `tests/visual/__screenshots__/ui-wo-01--tecnico--tableta.png`
- `tests/visual/ux-review.routes.ts`
- `tests/visual/walkthroughs/maintenance.ts`

Capturas adicionales de «Reservada», generadas y comparadas en Linux:

- `tests/visual/__screenshots__/route-download-reservada--normal--movil.png`
- `tests/visual/__screenshots__/route-download-reservada--normal--tableta.png`
- `tests/visual/__screenshots__/route-download-reservada--normal--escritorio.png`
- `tests/visual/__screenshots__/route-download-reservada--normal--escritorio-amplio.png`

## Separación de B

Se retiraron de la copia activa 35 archivos/hunks de B. Respaldo local verificado en `tmp/block-b-preserved-20261109/`: `files/` conserva los originales, `base-a/` la referencia de separación, `manifest.json` sus SHA-256 y `block-b.patch` las diferencias. Reintegrar mediante comparación con esa base en su propio bloque; no aplicar a ciegas encima de las correcciones posteriores de A. El respaldo permanece fuera del PR. No se borraron cambios previos del usuario, ni se hizo commit o push.

## Validación

Primera versión: `pnpm check`, 1.039 pruebas en 133 archivos; `pnpm build`, 14 tareas; integración completa con navegador, 205/205; recorridos Linux 2/2 y comparación visual 68/68. Estos resultados preceden a los ajustes UX siguientes. La pasada UI completa se interrumpió para incorporar la revisión; no se presenta como aprobada.

Versión ajustada del 09/11/2026 (árbol local con A y trabajo de B):

- `pnpm check`: 1.045 pruebas aprobadas en 135 archivos; tipos, lint, límites de workspace y 88 pares de contraste aprobados.
- `pnpm build`: 14/14 tareas aprobadas.
- Storybook compilado correctamente, con seis estados y matriz de descarga de ruta.
- Linux: `playwright test --project=maintenance route-download.spec.ts`, 4/4. Verifica MB, fecha/estado por fila, ausencia de reservas antes de confirmar o para excluidas, continuidad ante fallo y bloqueo explicado en lectura/sin conexión; móvil 375 y escritorio 1280.
- Linux: selección visual de descarga de ruta y UI-WO-01, generación 80/80 y comparación posterior 80/80. Se inspeccionaron las diferencias en 375, 768, 1280 y 1440 px; 33 capturas cambiaron en la última iteración de espaciado y textos, sin modificar tolerancias. Se conservaron las demás capturas del bloque.

Logs locales de aquella revisión: `tmp/route-feedback-check.log`, `tmp/route-feedback-build.log`, `tmp/route-feedback-e2e.log`, `tmp/route-ux-final-update.log`, `tmp/route-ux-final-compare.log`. Entonces quedaron pendientes la integración completa y el gate UI integral; sus resultados finales se registran a continuación. Estas pasadas seleccionadas no sustituyen el gate completo.

### Segunda revisión — A aislado de B

- Orden SQL probado con En atención que vence después de una atrasada; desempate por prioridad del ticket y UUID. La prueba de cuota conserva ese orden.
- Reservas probadas: mismo usuario/dispositivo, otro dispositivo, otro usuario, vencida y liberada; respuesta sin datos del titular. UUID inválido rechazado.
- `pnpm check`: 1.042 pruebas en 133 archivos, 88 pares de contraste, lint y tipos aprobados (`tmp/route-order-check.log`).
- Build: 14/14 tareas; repetido con `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329` para integración de navegador, conforme al runbook (`tmp/route-order-build-storage.log`).
- Integración focal de órdenes: 39 aprobadas, una condicionada a navegador omitida; esta última se incluye en la pasada completa (`tmp/route-order-integration-2.log`).
- E2E Linux: 5/5, incluida reserva real en otro dispositivo, copia local antigua, cantidad/MB y ausencia de solicitudes a la orden bloqueada (`tmp/route-order-e2e.log`).
- Visual Linux: 84/84 generación y 84/84 comparación; 38 diferencias inspeccionadas, incluidas las cuatro capturas nuevas de reserva. Siete historias y matriz compiladas. Sin cambios de tolerancia (`tmp/route-order-visual-update.log`, `tmp/route-order-visual-compare.log`).
- Auditoría de alcance: la implementación modificada coincide con esta lista cerrada; B preservado y pruebas temporales de diagnóstico restauradas.

Integración completa con navegador: **207/207 pruebas en 21 archivos**, con A aislado de B (`tmp/route-order-integration-final.log`). La primera pasada usó un build sin el origen del almacenamiento simulado: CSP bloqueó correctamente la subida de archivos. La repetición con la configuración de CI pasó, sin cambios de seguridad ni código ajeno a A. Las capturas históricas de F5/F6 regeneradas por integración se conservaron en `tmp/route-integration-captures/` y se retiraron del diff. El gate UI integral se completó después, como se registra en la sección siguiente.

### Gate UI integral anterior — 09/11/2026: aprobado antes de la revisión bloqueante

Ejecución completa con A aislado de B, en `mcr.microsoft.com/playwright:v1.62.1-noble`, Node 24.19.0, pnpm 11.24.0 y `CI=true`. Fuente: árbol local sin commit de `codex/f7-route-download`, sobre `233f9158673d46f7213d0894171bd381e552edc6`. Se recompilaron los paquetes y Storybook antes de ejecutar el gate. No se utilizaron filtros de pruebas ni actualización de snapshots.

| Comando                                                 | Resultado                                           | Evidencia local                                                                          |
| ------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm test:ui`                                          | **2.335/2.335**, salida 0, 31,5 min, sin reintentos | `tmp/f7-18-gate-ui.log`; reporte `tmp/f7-18-gate-artifacts/playwright-report/index.html` |
| `UX_SNAPSHOTS_SKIP_STORYBOOK_BUILD=1 pnpm ux:snapshots` | **1.328 capturas**, cero observaciones, salida 0    | `tmp/f7-18-gate-snapshots.log`; manifiesto de galería                                    |
| `pnpm ux:walkthroughs`                                  | **12 recorridos verificados**, salida 0             | `tmp/f7-18-gate-walkthroughs.log`; reproductor de recorridos                             |

Desglose de las 2.335 pruebas: 15 de `maintenance-offline`, 69 de `maintenance`, 923 de accesibilidad y 1.328 comparaciones visuales. El inventario local contiene 1.376 baselines: se verificó su SHA-256 antes y después, también en la copia Linux; ninguna cambió. No se alteraron tolerancias, comprobaciones ni código para obtener el resultado.

Artefactos para revisión:

- [Galería completa](../qa/phase-6/ux-review/index.html) y [manifiesto](../qa/phase-6/ux-review/manifest.json): todas las imágenes existen y no están vacías. Se inspeccionaron nuevamente las capturas de reserva ajena en móvil y falta de espacio en escritorio.
- [Reproductor de los 12 recorridos](../qa/phase-7/walkthroughs/index.html), incluido [descarga de ruta](../qa/phase-7/walkthroughs/route-download.webm): vista previa, confirmación, resultado y apertura de la descarga. Los 12 archivos de video existen y no están vacíos.
- [Reporte Playwright](../../tmp/f7-18-gate-artifacts/playwright-report/index.html), [resumen con hashes de logs](../../tmp/f7-18-gate-summary.json) y [manifiesto previo del árbol local](../../tmp/f7-18-gate-preflight.json). `.last-run.json` registra `passed` y ninguna prueba fallida.

La copia Linux omite `.git`; por eso el manifiesto generado de la galería muestra «sin git». Su procedencia se vincula aquí al HEAD y al manifiesto con hashes del árbol local utilizado; no se presenta como evidencia de un commit publicado. Los artefactos generados y logs permanecen fuera del versionado, conforme al `.gitignore` existente.

Integridad y alcance: los 35 archivos originales de B conservan sus SHA-256 en el respaldo separado; no se reincorporó implementación de B. Tampoco se alteraron `next-env.d.ts` ni los cambios locales previos del usuario. En este cierre solo se actualizan este reporte, el estado de F7-18 y su trazabilidad. Sin commit, push ni migraciones remotas.

Este resultado aprueba el **gate automático UI de F7-18**. No registra aprobación UX final ni sustituye los recorridos físicos y con lector de pantalla pendientes de P13.

## Checklist UX (seis preguntas sí/no)

Nueva revisión pendiente: demo, Técnico, `/maintenance/work-orders?view=assigned`, móvil 375 y escritorio. Las respuestas previas no aprueban esta corrección.

1. ¿Centro de sincronización queda separado de las pestañas y Preparar mi ruta se distingue con claridad?
2. ¿Se entiende el orden de la ruta y qué reservas ajenas o exclusiones por espacio quedan fuera antes de confirmar?
3. ¿El aviso de inicio/reserva, el progreso individual y el estado «Tu ruta está lista sin conexión» permiten entender qué ya está disponible sin controles de cero órdenes?
4. ¿Se entiende el aviso «Si cierras el navegador, necesitarás conexión para volver a abrir tus descargas» antes de preparar la ruta y al trabajar sin red?
5. ¿Después de quitar la red y recargar Órdenes se encuentran folio, máquina, estado, fecha límite, vencimiento y «Trabajar sin conexión» para cada descarga?
6. ¿Se puede abrir una descarga, capturar, recargar sin red y seguir trabajando conservando lo capturado, tanto en móvil como en escritorio?

La revisión UX queda pendiente. La estimación no garantiza espacio futuro para fotos y no sustituye las comprobaciones transaccionales. No cambia límites ni permisos existentes.

## Revisión de Dirección — 09/11/2026

El usuario no aprobó la primera versión. Solicitó y se implementa: «Ver mi ruta» para la consulta; toda la capacidad en MB y «Cabe todo» o «No caben N: folios» antes de confirmar; aviso independiente de inicio y reserva con botón «Iniciar y reservar N órdenes»; etiqueta y fecha límite por orden en la zona de su sucursal; explicación de bloqueo sin conexión/modo lectura. La selección que cabe se congela al confirmar: ninguna orden excluida se reserva sin una nueva confirmación. La cuota se vuelve a verificar en cada escritura. Las historias incluyen falta de espacio, sin conexión y lectura. Aprobación UX pendiente de revisar esta versión.

Segunda revisión: el usuario confirmó que los cinco ajustes visuales están bien, pero solicitó corregir orden, reservas y separación de B antes de solicitar aprobación UX. No constituye todavía aprobación final de F7-18.

## Corrección de reserva vencida — 09/11/2026

Validación posterior: `pnpm check` aprobado (1.042 pruebas, 133 archivos, 88 pares de contraste; formato, lint y tipos incluidos), salida 0 en `tmp/f7-18-expired-check.log`. `git diff --check` aprobado. Las 1.376 baselines conservan sus hashes; no se actualizó ninguna captura.

`downloadOffline` usa `state='active' and expires_at>now()`, igual que route-plan. Bajo el bloqueo y transacción existentes, retira únicamente reservas vencidas de la orden/cuenta autorizada antes de insertar: el índice único de reservas activas incluye las filas vencidas que aún no limpió el worker. Se conserva la fila como `expired` y se registra `WorkOrderOfflineExpired` con actor, contexto, correlación e identificador de reserva. Sin migración ni limpieza global de otras órdenes.

Regresión de integración: crea una reserva, vence su fecha manteniendo `active`, descarga desde otro dispositivo sin ejecutar el worker, comprueba auditoría y única reserva activa; verifica replay sin duplicados, rechazo del paquete antiguo y rollback de la expiración si falla auditoría. `pnpm test:integration tests/integration/work-orders.test.ts`: **40 aprobadas, 1 omitida** (escenario de navegador condicionado a `ICE24_BROWSER_TESTS`), salida 0; `tmp/f7-18-expired-integration.log`. La suite UI integral anterior no se repitió por este cambio de servidor.

Aprobación final UX sigue pendiente de registro por el usuario en `ux-signoff.md`. Sin commit ni push; B sigue separado con 35/35 hashes verificados. P13/F6, la propuesta de protección y phase-6.docx quedan fuera del commit A.

## Revisión bloqueante: listado offline y ruta lista — 09/11/2026

**F7-18 NO aprobada por el usuario.** El gate anterior no valida estas correcciones nuevas. Se conserva la evidencia histórica; las nuevas comprobaciones se registran por separado.

- Centro de sincronización separado 24 px de las pestañas; verificación geométrica en 375 y 1280 px.
- Órdenes sin red muestra el aviso y el listado cifrado local con folio, máquina, estado, fecha límite, caducidad y «Trabajar sin conexión». Sin red no se consulta health; se exige el alcance de la pestaña ya verificado. Con red se consulta la sesión, y una denegación no abre datos locales.
- El service worker v4 entrega el shell público genérico de trabajo al recargar vistas de mantenimiento sin red; el listado y el editor comparten el almacenamiento existente. Nunca se cachean HTML autenticado, API ni RSC. No se cambia la política de activación de ADR-027.
- Ruta ya preparada: «Tu ruta está lista sin conexión: N órdenes», enlaces «Abrir», sin estimación cero, reserva cero, aviso de reserva ni barra vacía. Se conserva el orden de negocio ya acordado.
- E2E móvil/escritorio: vista previa → descarga real → quitar red → recargar listado → abrir → editar → recargar → conservar y continuar; comprueba también calendario offline, caché exclusivamente genérica y ausencia de alcance.

### Propuesta pendiente: volver a abrir la aplicación tras cerrar la pestaña (NO implementada)

Conservar un permiso local de desbloqueo por cuenta/usuario/dispositivo en IndexedDB, emitido al descargar tras autenticación real, sin cookies, tokens de sesión, renovación ni CSRF. Su caducidad absoluta no superaría la menor entre la vigencia autorizada y 72 h desde la descarga; cada paquete mantiene su propio vencimiento y jamás se renueva al abrir, editar o recargar. Para reabrir en un equipo compartido, exigir desbloqueo local del dispositivo (idealmente WebAuthn con verificación de usuario y claves compatibles); sin esa capacidad, mantener reconexión obligatoria. No basta guardar los IDs en localStorage y elegir automáticamente un usuario.

Esto modifica ADR-027, que actualmente exige el contexto de esa pestaña y limita la vigencia por sesión. Requiere decisión explícita de usuario/Seguridad antes de implementar: exposición adicional tras cerrar navegador o perder el dispositivo, soporte desigual de desbloqueo local, XSS del mismo origen, reloj manipulable y revocación no comprobable sin red. La llave no exportable existente no protege por sí sola contra quien use el mismo perfil. Se conservarían purga al salir/revocar, aislamiento por identidad, caducidad y nueva autorización al reconectar. No se implementa persistencia ni se amplían vigencias en esta corrección.

### Archivos adicionales autorizados por esta corrección

- `apps/private-web/public/sw.js`
- `apps/private-web/src/features/maintenance/tickets.css`
- `apps/private-web/src/features/sync/downloaded-orders.tsx`
- `apps/private-web/src/features/sync/downloaded-orders.test.tsx`
- `apps/private-web/src/features/sync/offline-scope.ts`
- `apps/private-web/src/features/sync/offline-scope.test.ts`
- `apps/private-web/src/features/sync/offline-work.tsx`
- `tests/e2e/maintenance/offline-shell.spec.ts`
- `docs/qa/phase-7/evidence/20261110-f7-18-offline-baselines.json` y los 173 archivos de baseline enumerados en ese inventario SHA-256: espaciado, ruta, listado y editor descargado.

B permanece en su worktree independiente. Sin commit, push ni aprobación del gate F7.

### Decisión recibida el 10/11/2026

El usuario autoriza desarrollar la propuesta en un cambio separado, **nunca dentro de F7-18**. Debe exigir WebAuthn con verificación de usuario (huella, rostro o PIN) y reconexión si no está disponible; vigencia absoluta menor entre 72 h y la reserva; solo datos ya descargados sin red; revalidación de permisos/reservas al reconectar; purga P11 ante revocación y tratamiento de lo capturado como conflicto; interruptor por cuenta para equipos compartidos; logout elimina permiso; cinco intentos fallidos bloquean hasta reconectar; desbloqueos auditados al sincronizar. ADR-027 quedará pendiente de aprobación expresa antes del merge. La preservación de capturas revocadas necesita definir cómo recibirlas para revisión antes de purgarlas, sin mantener contenido local revocado ni eludir permisos; la propuesta debe resolver ese orden explícitamente.

Exigir bloqueo de pantalla a los dispositivos de técnicos es política de la empresa, no una garantía que pueda imponer o verificar universalmente la aplicación. WebAuthn no protege por sí solo contra extracción de datos de un teléfono sin bloqueo.

En F7-18 solamente se añade el aviso visible exacto en Preparar mi ruta, listado local y editor offline: «Si cierras el navegador, necesitarás conexión para volver a abrir tus descargas.» El E2E verifica que permanece visible después de recargar sin red. No se implementó persistencia del permiso. La pasada integral UI iniciada antes de este aviso se interrumpió y no se declara aprobada.

La propuesta separada quedó documentada en la rama `codex/offline-device-unlock-proposal`, archivos `docs/decisions/adr-027-offline-local-protection.md` y `docs/tasks/task-offline-device-unlock.md`. No se mezcla con la lista de archivos de A; no implementa todavía el permiso persistente ni modifica la política vigente.

## Validación de la corrección offline y aviso — 10/11/2026

Candidato local de A sobre `233f915`, con B separado. No constituye aprobación UX ni cierre del gate F7.

- `pnpm check`: 1.052 pruebas en 135 archivos; formato, lint, tipos y 88 pares de contraste aprobados. `tmp/f7-18-notice-check.log`.
- `pnpm build`: 14/14 tareas aprobadas. `tmp/f7-18-notice-build.log`.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: 208/208 pruebas en 21 archivos, incluida reserva vencida no limpiada; 377,15 s. `tmp/f7-18-notice-integration.log`.
- E2E Linux focal: 9/9, incluye móvil 375 y escritorio 1280, descarga real, lista tras recarga offline, edición persistida, segunda recarga y aviso visible en preparación/lista/editor. `tmp/f7-18-notice-e2e.log`.
- Baselines Linux afectadas: 200/200 escenarios generados; 173 diferencias respecto al árbol previo inspeccionadas visualmente. Inventario con SHA-256 en [evidencia](../qa/phase-7/evidence/20261110-f7-18-offline-baselines.json). Sin ajustes de tolerancias.
- Suite UI Linux completa, sin filtros ni actualización: **2.347/2.347 pruebas**, 15,7 min, salida 0, sin reintentos. `tmp/f7-18-notice-ui-full.log`; `tmp/f7-18-notice-artifacts/test-results/.last-run.json` registra passed, sin fallos.

La copia Linux coincide por SHA-256 con los 30 archivos de implementación/pruebas del candidato. Se excluye del cotejo el archivo generado next-env, cuya referencia local previa se conserva. Los 36 archivos de código de B conservan sus hashes. Las 22 capturas históricas de F5/F6 producidas por integración se archivaron en tmp y se retiraron del diff, sin alterar documentos previos del usuario. Galería y recorridos terminados con salida 0: **1.336 capturas, cero observaciones**, y **12 recorridos verificados**. Los 12 videos existen y no están vacíos. Logs: `tmp/f7-18-notice-gallery.log` y `tmp/f7-18-notice-walkthroughs.log`.

Artefactos de esta corrección: [galería](../../tmp/f7-18-notice-artifacts/gallery/index.html), [recorridos](../../tmp/f7-18-notice-artifacts/videos/index.html), [Playwright](../../tmp/f7-18-notice-artifacts/playwright-report/index.html) y [resumen con hashes](../../tmp/f7-18-notice-summary.json). El manifiesto de galería indica «sin git» porque Linux usa una copia sin .git; la procedencia es el candidato local documentado, no un commit publicado. Las 173 baselines (165 actualizadas y 8 nuevas) conservan los hashes inventariados tras el gate, sin modificaciones adicionales.

**Listo para nueva revisión UX; F7-18 no aprobada y gate F7 no aprobado.** El usuario debe repetir el recorrido del checklist antes de registrar la aprobación. El desbloqueo persistente/WebAuthn, las pruebas físicas, los recorridos con lector y la aprobación de la enmienda ADR-027 no se declaran ejecutados aquí. Sin commit, push ni migraciones remotas.

## Revisión posterior — solicitud adjunta del 10/11/2026

Esta sección sustituye el estado «listo para revisión» de la pasada anterior. Los resultados de `f7-18-notice-*` son históricos; esta versión se valida con `f7-18-ux-*`. F7-18 sigue NO aprobada. Sin commit ni push.

### Cambios y motivos

- Preparación: Ver mi ruta desaparece al mostrar la lista. Descargar mi ruta confirma el inicio/reserva explícitos; progreso anunciado, resultado por orden, última descarga y Actualizar descarga para volver a comprobar disponibilidad. La actualización conserva capturas y no sustituye automáticamente una versión desactualizada: indica sincronizar/revisar conflictos primero. Filas sin viñetas, chips semánticos, Abrir secundario y pequeño, indicador de disponibilidad y nota de cierre del navegador con menor peso. Se elimina el eyebrow que duplicaba el breadcrumb.
- Alcance: el shell no borra una pista verificada por una respuesta temporal sin identidad, ni acorta su vigencia a la sesión después de una descarga válida. No recupera identidades de otras pestañas ni crea permisos persistentes; cada paquete sigue verificando su propia caducidad. Un 503 de health permite consultar el alcance local previo; 401/403/404 siguen siendo denegaciones. UUID inválido o ausencia de pista requieren reconexión.
- Vencimiento: estado único, conteo de descargas al detectar vencimiento y acción de reconectar. P11 sigue borrando los datos vencidos. Solo se conserva un resumen de presentación en sessionStorage (identidad, cantidad, instante), sin contenido, llaves ni permisos, para que la limpieza no borre también la explicación; nueva descarga y logout lo eliminan. No amplía leases ni autoriza descifrado.
- Presentación offline: último nombre/cuenta/menú en la misma pestaña, marcado como contexto conocido sin conexión; no se cachea HTML autenticado en SW ni se guardan tokens. Logout elimina esa presentación; el shell local atiende avisos de purga entre pestañas. La lista también retira datos ante esos avisos.
- Sincronización: PageHeader, pestañas, contenedor y estados del design system; error del servidor separado del permiso denegado. El shell público v5 reconoce la ruta de sincronización y reutiliza SynchronizationCenter con cola IndexedDB en modo consulta. Sincronizar y acciones de servidor permanecen deshabilitadas con explicación; no se inventan conflictos remotos cuando falta red.
- Editor: un solo H1, acciones flex con gap y wrap, retorno secundario, checklist navegable con iconos, padding uniforme, PhotoCapture con botón del design system, contador y miniaturas locales; no se muestra Administración al técnico. Corregido el ancho del input oculto que podía desbordar a 375 px. Texto único: Volver a las órdenes.
- Demo/galería: descarga lenta, versión más reciente en servidor y lease de 30 segundos; historias de desactualizada/vencida y cola local pendiente/conflicto. Para probar desactualizada, descargar primero en Con datos y después seleccionar el escenario. La cola real con conflicto sigue usando el recorrido existente: capturar, provocar conflicto al sincronizar y volver a quitar la red.

### Archivos adicionales de esta revisión permitidos en A

Además de la lista previa, únicamente estos archivos y sus baselines afectadas:

- `apps/private-web/src/app/(account)/maintenance/synchronization/page.tsx`
- `apps/private-web/src/components/offline-scope.tsx` y `offline-scope.test.tsx`
- `apps/private-web/src/components/system-state/local-data.ts`
- `apps/private-web/src/features/account-shell/access-provider.tsx`
- `apps/private-web/src/features/navigation/private-shell.tsx` y `offline-presentation.ts`
- `apps/private-web/src/features/sync/lifecycle.ts`, `local-queue.stories.tsx`, `synchronization-center.tsx`, `synchronization-center.test.tsx` y `offline-work.css`
- `apps/private-web/src/features/work-orders/execution-screen.tsx`, `execution.css` y `work-orders-authorization.ts`
- `apps/private-web/src/server/demo/state.ts`
- `packages/ui/src/components/domain/evidence.tsx` y `evidence.test.tsx`
- `tests/e2e/maintenance/offline-field-flow.ts`
- `tests/visual/review-page.ts`
- `docs/qa/phase-7/ux-signoff.md` (solo esta revisión, sin inventar aprobación)

P13/F6, phase-6.docx, B y la propuesta separada de WebAuthn siguen fuera. No cambian permisos remotos, políticas de retención, migraciones, versiones esperadas ni idempotencia.

### Checklist UX nuevo — seis preguntas sí/no

Demo Técnico, `/maintenance/work-orders?view=assigned`; 390, 768 y 1280 px (la galería también conserva 375/1440):

1. ¿Queda clara la diferencia entre consultar, confirmar descarga/reserva y actualizar disponibilidad, con fecha, progreso y resultado?
2. ¿Folio/máquina, estado, fecha límite y Abrir se distinguen sin viñetas ni botones pegados?
3. ¿Al descargar, quitar la red y recargar la misma pestaña aparecen las órdenes y el contexto conocido, sin pedir sesión mientras la descarga sea válida?
4. ¿El vencimiento explica qué pasó y qué hacer, sin anunciar disponibilidad al mismo tiempo?
5. ¿El centro offline permite revisar pendientes/conflictos locales y explica por qué no permite sincronizar?
6. ¿El editor permite fotos, revisión de pendientes y regreso con foco visible, un H1 y sin desbordamiento ni acciones administrativas inútiles?

### Evidencia de este candidato — 10/11/2026

- `pnpm check`: 1.059/1.059 pruebas en 136 archivos; formato, lint, tipos y 88 pares de contraste. `tmp/f7-18-ux-check-final.log`.
- `pnpm build`: 14/14 tareas. `tmp/f7-18-ux-build-final.log`.
- Integración: 208/208 en 21 archivos (310,17 s), incluida reserva vencida no limpiada. `tmp/f7-18-ux-integration.log`. Se ejecutó antes de los últimos ajustes exclusivamente visuales de contador, botón Abrir y estado de carga; el servidor no cambió después.
- E2E Linux focal actual: 12/12 (37,5 s). Descarga real, recarga offline en la misma pestaña, identidad conocida, consulta de cola, editor y recorrido de foto → quitar → contador actualizado; móvil 375/390, tableta 768 y escritorio 1280. `tmp/f7-18-ux-e2e.log`.
- Baselines Linux: generación integral de 1.356/1.356 y regeneración final de las cuatro vistas previas (4/4) después de esperar el estado de carga real. `tmp/f7-18-ux-visual-update.log` y `tmp/f7-18-ux-preview-update.log`.
- 805 diferencias frente al árbol recibido (785 actualizadas y 20 nuevas), revisadas en 493 grupos visuales, más las cuatro vistas previas finales y recorridos completos. [Inventario SHA-256](../qa/phase-7/evidence/20261110-f7-18-ux-baselines.json). Incluye alineación de capturas antiguas con iconos, variantes de botón y contraste que ya estaban en HEAD; no son cambios nuevos de tokens/iconos en esta revisión. También refleja el componente PhotoCapture compartido y la presentación común del shell. No se cambiaron tolerancias ni se desactivaron comprobaciones.
- Durante la inspección se corrigió Abrir partido en tableta (`flex-shrink: 0`, sin salto de texto), contador de fotos obsoleto al quitar una imagen y captura prematura de la vista previa mientras consultaba. Los E2E cubren los dos primeros; la captura espera el indicador de carga del Button existente.
- Los 50 archivos de código/pruebas del manifiesto `tmp/f7-18-ux-candidate.json` coinciden entre Windows y Linux. Los 36 archivos de B conservan sus hashes; WebAuthn permanece separado. Se conserva la referencia local previa de next-env después del build.

Suite UI integral Linux sin filtros ni actualización: salida 0, **2.376 pasadas y 1 intermitente que pasó al reintentar**, 17,0 min (`tmp/f7-18-ux-ui-full.log`). No se presenta como una pasada sin reintentos. La cola local de escritorio amplio falló esperando el texto exacto Guardado en este dispositivo: una sincronización iniciada antes de quitar la red lo sustituyó legítimamente por No fue posible conectar con el servidor. Tus cambios siguen guardados en este dispositivo. Se corrigió únicamente esa expectativa para aceptar ambos mensajes; la recarga continúa comprobando campos persistidos y el cierre exige las fotos. Repetición posterior de los recorridos afectados: **24/24, tres repeticiones, cero reintentos**, 1,6 min (`tmp/f7-18-ux-retest.log`). No se modificaron tolerancias, tiempos máximos ni el comportamiento de producción por este resultado.

Galería final: **1.356 capturas, cero observaciones**, salida 0 (`tmp/f7-18-ux-gallery.log`). Recorridos grabados: **12/12 verificados**, salida 0 (`tmp/f7-18-ux-walkthroughs.log`); los 12 videos enlazados existen y no están vacíos. La galería se generó con la expectativa estricta anterior; los recorridos finales ya usan la expectativa corregida. El código de producción es idéntico en ambas pasadas. Las pruebas automatizadas no sustituyen esta revisión humana ni los pendientes físicos/lector de P13.

El inventario `docs/qa/phase-7/evidence/20261110-f7-18-ux-baselines.json` y sus 805 rutas quedan agregados a los archivos de evidencia de A; el inventario anterior de 173 capturas se conserva como evidencia histórica, no como hash del candidato actual. Esta revisión sigue sin commit ni push, F7-18 NO aprobada y gate F7 NO aprobado.

Artefactos actuales: [galería](../../tmp/f7-18-ux-artifacts/gallery/index.html), [recorridos](../../tmp/f7-18-ux-artifacts/videos/index.html), [UI integral](../../tmp/f7-18-ux-artifacts/playwright-report/index.html), [24 repeticiones sin reintentos](../../tmp/f7-18-ux-artifacts/retest/playwright-report/index.html) y [resumen verificable](../../tmp/f7-18-ux-summary.json). El aviso sin git de la galería corresponde a la copia Linux sin metadatos Git; se cotejó el código con el candidato local por SHA-256.

**Correcciones listas para nueva revisión UX. F7-18 NO aprobada; gate F7 NO aprobado.** Permanecen pendientes la revisión humana del checklist anterior, pruebas físicas/lector y decisiones/firmas de cierre ya registradas; WebAuthn sigue siendo una propuesta separada pendiente de aprobación de ADR-027. Sin commit, push, migraciones remotas ni cambios de configuración remota.

## Corrección de caché instalada y regreso superior — 10/11/2026

Solicitud posterior a la evidencia f7-18-ux: no se atribuyen sus resultados al nuevo candidato. Sin commit ni push; B y WebAuthn separados.

Causa raíz: el SW cache-first conservaba el nombre fijo v5 aunque app.js/app.css se recompilaran. El navegador no detectaba cambios en sw.js y seguía usando recursos instalados antiguos. Se añade versionado SHA-256 determinista del contenido del shell público y del código del worker (excluyendo el propio valor de versión). Incluye HTML, JS y CSS genéricos; una recompilación idéntica conserva el hash. La instalación solicita recursos con cache reload para evitar también una respuesta HTTP antigua. Las lecturas usan exclusivamente CURRENT_CACHE. Se mantiene la lista cerrada de recursos públicos, nunca HTML autenticado/API, y la activación elimina solo cachés del shell obsoleto: no toca IndexedDB, leases, scope ni capturas.

Barra superior después del aviso de pestaña y antes de Trabajo en campo: Volver a las órdenes a la izquierda y Centro de sincronización a la derecha, wrap móvil, altura mínima 44 px y gap space-4. Folio y código de máquina visibles. Retirada la navegación duplicada del pie; permanecen Revisar cierre y Volver a la orden secundario, con el mismo gap. Los anchors nativos mantienen beforeunload cuando el guardado está en curso o falló. Los cambios ya confirmados localmente no requieren confirmación para salir y se comprueban al reabrir. Checklist sin viñetas con foco, paneles uniformes, PhotoCapture con contador según requisito y ausencia de Administración ya estaban implementados: el versionado hace llegar esos cambios a instalaciones antiguas.

Archivos adicionales de A: turbo.json, scripts/build-offline.mjs, scripts/offline-cache.mjs, scripts/offline-cache.test.mjs, docs/runbooks/maintenance.md, docs/qa/phase-7/evidence/20261110-f7-18-cache-baselines.json; cambios acotados en public/sw.js, offline-work.tsx/.css, offline-shell.spec.ts y ux-review.routes.ts; cuatro baselines offline-work-editor--descargada--*.png y documentación de esta revisión. No se añaden componentes ni APIs de negocio; el demo usa el mismo editor real y conserva los requisitos ficticios de fotos (el contador refleja su mínimo, no un número fijo).

Validación automatizada terminada; revisión UX pendiente. El E2E reproduce v5 con CSS antiguo, recompila sin cambiar worker y confirma que sigue antiguo; después instala la versión por contenido, recarga sin red y comprueba 16 px con getComputedStyle y Cache Storage mediante Chrome DevTools Protocol, conservando un registro IndexedDB de prueba. No se borran datos manualmente. El navegador personal del usuario no se controla ni se presenta como inspeccionado.

Checklist UX (Técnico demo, orden descargada, 390/768/1280/1440):

1. ¿Volver a las órdenes está antes del encabezado y permite corregir una selección equivocada sin bajar al pie?
2. ¿Folio y máquina identifican claramente la orden abierta?
3. ¿Ambas filas tienen separación, botones distinguibles de al menos 44 px y ningún desbordamiento?
4. ¿El regreso sin red muestra las órdenes descargadas y al reabrir conserva el trabajo guardado?
5. ¿Checklist, fotos y requisitos son legibles y sus enlaces llevan el foco al campo correcto?
6. ¿Una actualización online seguida de recarga muestra la versión nueva sin borrar manualmente caché o datos?

F7-18 NO aprobada; gate F7 NO aprobado. Pendientes humanos y aprobación de ADR-027 sin cambios.

Turbo incluye los scripts de construcción offline como dependencias globales y conserva public/offline-work/** y public/sw.js entre las salidas del build. Así un acierto de caché restaura también el editor y su worker, y un cambio en el script invalida el resultado anterior. Las cuatro capturas regeneradas, con hashes anteriores/nuevos, están en [inventario de esta corrección](../qa/phase-7/evidence/20261110-f7-18-cache-baselines.json); los manifiestos previos se conservan como históricos.

Resultados confirmados de este candidato (logs f7-18-cache): check 1.060/1.060 en 137 archivos, 88 pares de contraste; build 14/14; E2E focal Linux 7/7 sin reintentos (14,3 s); baselines 4/4 con --update-snapshots=all (11,4 s), inspeccionadas en 375, 768, 1280 y 1440 px. La navegación real también se prueba a 390 px. La prueba inicial de check tuvo un timeout de 5 s en una prueba de Máquinas bajo carga concurrente; al repetir sin esa carga pasó completa, sin modificar el test ni sus límites. La primera integración tuvo dos fallos de subida por CSP porque el build no incluía ICE24_STORAGE_ORIGIN; se recompiló con http://127.0.0.1:54329, exactamente como ci.yml, sin cambiar la política de producción. Se conserva el log inicial y se repite la suite completa. Integración final: **208/208 en 21 archivos**, 383,13 s, salida 0 (`tmp/f7-18-cache-integration.log`). Las capturas históricas de F5/F6 generadas por integración se archivaron en tmp y se restauraron exactamente al estado previo; se conserva la referencia local previa de next-env. UI integral 2.380/2.380 sin reintentos; galería 1.356 capturas sin observaciones y 12 recorridos grabados verificados.

Cotejo del candidato: 53 archivos fuente coinciden byte a byte entre Windows y Linux; el worker tiene idéntica lógica al excluir el valor generado CACHE_VERSION. El valor difiere porque Vite incluye rutas relativas del directorio de construcción en comentarios del JS; cada hash corresponde al bundle real de esa compilación. CSS y HTML coinciden. No se impone un hash de otra plataforma a sus assets.

Suite UI Linux integral final: **2.380/2.380, 17,5 min, sin reintentos**, salida 0 (`tmp/f7-18-cache-ui-full.log`). [Evidencia de Chrome DevTools Protocol](../qa/phase-7/evidence/20261110-f7-18-cache-browser.json): solo caché build-f3d05814f256ce17ef900791, gap calculado 16px y registro ficticio conservado tras recarga sin red; origen aislado de pruebas, sin borrar IndexedDB. Este JSON se añade al inventario permitido de evidencia de A. Galería y recorridos finales terminados con salida 0: 1.356 capturas, cero observaciones y 12 videos enlazados verificados, existentes y no vacíos.

Artefactos de esta revisión: [UI integral](../../tmp/f7-18-cache-artifacts/playwright-report/index.html), [galería](../../tmp/f7-18-cache-artifacts/gallery/index.html), [recorridos](../../tmp/f7-18-cache-artifacts/videos/index.html) y [resumen con hashes](../../tmp/f7-18-cache-summary.json). El manifiesto sin git corresponde a la copia Linux sin .git, cotejada con las fuentes locales; no es un commit publicado. Formato final, check de infraestructura y git diff --check pasaron. B conserva sus 36 hashes; la propuesta WebAuthn sigue separada. Sin commit, push, cambios remotos ni migraciones.

**Listo para nueva revisión del checklist. F7-18 NO aprobada; gate F7 NO aprobado.** No se inspeccionó el navegador personal del usuario ni se sustituyen pruebas físicas/lector, decisiones o firmas pendientes por estos resultados automatizados.

## Aprobación UX y publicación autorizada — 10/11/2026

Revisor: Usuario solicitante, respuesta en chat.

> Ya revisé en el demo las superficies de F7-18 (Preparar mi ruta / descarga, lista sin conexión al recargar, Centro de sincronización sin red y editor de campo con navegación superior) y todo está bien.

Se registran como Aprobado exclusivamente las cuatro filas F7-18 de [ux-signoff](../qa/phase-7/ux-signoff.md). No acredita lector de pantalla ni pruebas físicas, no aprueba F7-D03 ni ADR-027 y no cierra el gate F7. P13/F6, phase-6.docx, B y WebAuthn permanecen fuera del commit. Publicación a rama y PR autorizada; fusión no autorizada.
