# Runbook — Mantenimiento programado

## Órdenes y estados P3

Aplicar `20261103000100_phase7_work_orders.sql` antes de desplegar P3. Expansión sin backfill, duración esperada de segundos. No se ha aplicado a entornos remotos. Verificar asignación desde ticket y actividad, repetición idempotente, inicio por técnico responsable y auditoría. El ticket conserva el enum de P2; su referencia a la orden permite mostrar «Orden asignada» antes del inicio. Un consumidor anterior no puede modificar su diagnóstico tras vincularlo.

Si no aparece un técnico: comprobar usuario/membresía activos, rol TC vigente, ámbito de sucursal/máquina y denegaciones explícitas. No ampliar permisos para evadir el control. Una máquina trasladada bloquea cambios de su orden hasta revisión autorizada.

Ante 409, recuperar origen/orden y comparar versiones; no reenviar sobrescribiendo. Ante respuesta perdida, conservar cuerpo, versión y clave idempotente. Si falla auditoría, la transacción revierte también orden, vínculos y contador. Consultar correlación y eventos WorkOrderCreated/Assigned/Transitioned y TicketAssigned/WorkOrderStarted.

Recálculo: las actividades asignadas se conservan y bloquean su clave; no se cancelan por nueva frecuencia/plantilla. Verificar que la orden conserva definición, procedimiento y piezas originales. Un cierre bloqueado por falta de ejecución/evidencia es esperado en P3; P4/P5 habilitarán esos registros. No marcar hechos de cierre desde SQL para sortear guardas.

Reversión: retirar los consumidores P3 y mantener tablas, columnas, vistas, vínculos y auditoría. Conservar el worker que protege actividades asignadas durante la reversión; un worker anterior podría cancelarlas. Nunca borrar órdenes ni atrasos. La caché Linux usa explícitamente `/cache/pnpm-store` para evitar reinstalar descargas en cada contenedor.

## Tickets P2

Para integración local con Chromium, compilar como CI: `$env:ICE24_STORAGE_ORIGIN="http://127.0.0.1:54329"; pnpm build`, después `$env:ICE24_BROWSER_TESTS="1"; pnpm test:integration`. El origen se incorpora a CSP en compilación; establecerlo solo al ejecutar las pruebas no basta. Un error `connect-src 'self'` al enviar al doble de almacenamiento indica que falta esa compilación, no que deban relajarse las reglas CSP.

Las capturas usan `ICE24_DEMO_CAPTURE_LOADING=1` para sostener 15 s el estado de carga simulado mientras cargan fuentes y se estabiliza la imagen. La demo interactiva mantiene 2.5 s; las tolerancias visuales permanecen intactas.

Aplicar migraciones hasta `20261102000200_phase7_tickets.sql` antes de desplegar P2. Expansión sin backfill de tickets, tiempo esperado de segundos. Verificar opciones de una máquina, creación con clave idempotente y evento `TicketCreated`; repetir devuelve el mismo ticket sin duplicar auditoría. Diagnóstico requiere `If-Match` y emite `TicketDiagnosed`.

Conflicto: recuperar detalle actual y comparar con datos locales antes de reenviar. Error de red: reintentar mismos datos y clave. Foto no asociable: revisar carga confirmada, propósito, cuenta, máquina y estado; nunca evadir cuarentena ni publicar objetos. Los tickets requieren conexión.

Reversión: retirar versión/rutas de aplicación P2 y conservar tablas, asociaciones, contadores e historial. No borrar tickets ni `audit.events`. No se han aplicado estas migraciones a entornos remotos.

El runner Linux excluye la galería y videos generados al copiar fuentes: no son insumos de pruebas y pueden cambiar mientras `ux:snapshots` escribe. Las baselines de `tests/visual/__screenshots__` sí se copian. Esto evita `tar: file changed as we read it` sin omitir código ni pruebas. El estado de carga de UI-TKT-01 se verifica seleccionando una máquina y esperando la consulta de sistemas, no suponiendo una carga inicial inexistente.

## Programación P1

Aplicar `20261102000100_phase7_scheduling.sql` antes de desplegar API/worker. No se ha aplicado a ningún entorno remoto desde esta tarea. El calendario sigue en `equipment.scheduled_activities`; la API consulta la vista privada `maintenance.scheduled_activity_read`.

Si falta el KPI, comprobar permiso `maintenance.read`, módulo habilitado y contexto activo. Un fallo del servicio no equivale a cero actividades. Si faltan actividades, revisar jobs de recálculo, componentes propios activos, frecuencia efectiva y zona IANA de sucursal; conservar los atrasos y reprocesar mediante el flujo de trabajos existente, nunca borrando registros. Los cambios efectivos generan auditoría con contexto WORKER y correlación.

Reversión: volver primero a API/worker anteriores; conservar columnas y registros. Retirar vista y permiso solo cuando no tengan consumidores. La reversión no debe eliminar el historial ni los atrasos.

## Incidente local de Docker (02/11/2026)

Testcontainers y las baselines Linux requieren un daemon accesible. En el primer intento Docker Desktop falló al iniciar con `sailor-ingest.sock: The file cannot be accessed by the system`. Iniciar Docker y comprobar `docker info` antes de repetir `pnpm test:integration`, `pnpm test:ui:update` y `pnpm test:ui`. No sustituir las baselines por capturas Windows. No se borraron volúmenes, imágenes ni configuración. Si persiste, soporte de Docker debe reparar la instalación; no realizar un factory reset sin autorización.

Ante cambios de interfaz, regenerar `pnpm ux:snapshots` y `pnpm ux:walkthroughs`, revisar diferencias y registrar la firma UX. Preview sigue desactivado conforme a ADR-026.

Resuelto tras el inicio manual de Docker por el usuario. Daemon 29.7.2 verificado; la repetición de integración aprobó 154 pruebas en 19 suites. Evidencia: docs/qa/phase-7/evidence/20261102-integration-docker-verified.txt.

También pasaron la generación y la comparación Linux: 1687 pruebas por ejecución y 976 baselines. Su aprobación UX sigue pendiente; detalle en docs/qa/phase-7/linux-validation.md.

## Ejecución y revisión P4/P5

Aplicar la expansión `20261104000100_phase7_execution_reviews.sql` después de P3 y antes de desplegar API/BFF. No se ha aplicado a entornos remotos. Verificar guardado de borrador, versión incrementada, cierre con evidencia disponible y evento de auditoría. Si un archivo sigue en verificación, consultar su estado desde el control de carga; no editar estados de cuarentena para forzar un cierre. Un 409 exige recargar y comparar; un fallo de red conserva datos y clave del reintento.

Corrección agrega una versión y una revisión; anulación conserva todo el historial y solo usa el arco autorizado desde Completado. Reapertura aprobada en ADR-028: desde cerrada/corregida, por Dueño/Administrador del ámbito y con motivo; comprobar revisión/auditoría, conservación de versiones y guardado nuevo antes del siguiente cierre. Reversión: retirar rutas nuevas y conservar tablas/historial; no ejecutar DELETE/TRUNCATE ni retirar triggers de inmutabilidad.

## Base offline P6

ADR-027 contiene cuotas, migración, cifrado y riesgo residual. `NEXT_PUBLIC_ICE24_OFFLINE_SHELL` no se activa por defecto. Activar solo en un entorno de revisión autorizado; la lista actual de recursos públicos permitidos en caché se describe abajo, en P7–P9. La consulta offline de una orden exige descargar primero su paquete autorizado. Al desactivar bandera, el worker elimina la caché anterior.

Ante cuota llena, conservar pantalla y registros anteriores, liberar espacio y reintentar. Ante corrupción o vencimiento, reconectar para validar/recuperar paquete; no sustituir datos locales silenciosamente. Pendientes v1 sin usuario se retienen sin mostrarlos a otro usuario: investigar autor/origen antes de reconciliación. Nunca copiar tokens de sesión a IndexedDB. El borrado en logout cubre todos los almacenes y llaves; un fallo se reporta y el BFF mantiene Clear-Site-Data como respaldo.

## P7–P9: leases y cola

Aplicar `20261106000100_phase7_offline_leases.sql` antes de la nueva API/worker. Es una expansión; no elimina historial. No se ha aplicado a entornos remotos. Activar la bandera de cliente únicamente en revisión autorizada, regenerando el build. Reversión: desactivar nuevas descargas, sincronizar o liberar leases con motivo, retirar rutas/worker nuevos y conservar tablas, recibos y auditoría. No retirar el trigger mientras existan leases activos.

- Descarga interrumpida: reintentar desde el mismo navegador/usuario. Solo identificadores no secretos de operación/dispositivo se guardan en localStorage; el paquete sigue cifrado en IndexedDB.
- Dispositivo perdido: Dueño/Administrador del ámbito abre la orden y “Liberar descarga de un dispositivo”, escribe motivo y confirma. No se descarta silenciosamente la copia pendiente. La liberación no altera las reglas de reasignación de órdenes en atención.
- Descarga vencida: el worker `maintenance.offline-lease-expiration` procesa 100 por ventana, usa SKIP LOCKED y registra `WorkOrderOfflineExpired`. Comprobar actividad del scheduler y correlación antes de intervenir; no manipular filas para forzar un cierre.
- Foto recibida y todavía en antivirus: se reconsulta el mismo archivo. Después del límite de intentos, “Reintentar” conserva la clave y el original. Hash incorrecto/rechazo es error definitivo; no promover archivos manualmente.
- Conflicto por liberación/versión: preservar los datos locales; revisión autorizada mediante P10 pendiente. Nunca sobrescribir con la versión del cliente.
- Cierre confirmado pero respuesta perdida: reenviar la misma operación. El recibo servidor devuelve el mismo resultado; no se crea otra ejecución.

El caché v3 contiene cinco recursos públicos genéricos: shell HTML/JS anterior y HTML/JS/CSS del editor. No contiene API, HTML autenticado ni URLs firmadas. En teléfono real usar HTTPS (localhost es la excepción de desarrollo); una IP LAN por HTTP no habilita service worker/WebCrypto.

## Operación P10–P12: conflictos y pérdida local

Si una sincronización devuelve `conflictId`, conservar la operación y abrir el centro de sincronización. No reintentar automáticamente imponiendo una versión. Dueño/Administrador del ámbito compara dispositivo, servidor actual y originales; elige estrategia, explica motivo y confirma. Si la versión cambió, actualizar la comparación antes de reintentar. No editar tablas inmutables ni resolver con SQL manual.

Ante revocación/desactivación: comprobar eliminación de descargas, borradores, evidencia, cola y llaves en el siguiente acceso/reconexión. Un dispositivo desconectado no conoce cambios remotos hasta reconectar o vencer su descarga. Investigar `OfflineLocalDataPurged` y `offline_purge_receipts` por IDs, sin copiar contenido privado. Una ausencia de recibo no prueba que el dispositivo conserve datos ni que haya sincronizado: puede estar desconectado, sin token válido o haber borrado el navegador.

Migración aditiva `20261108000100_phase7_sync_conflicts.sql`: revertir primero las rutas nuevas si es necesario y conservar originales/resoluciones/recibos para auditoría. No truncar ni eliminar tablas de historial. No ejecutar migración remota como parte de pruebas locales.

Validar con `pnpm check`, `pnpm build`, `ICE24_BROWSER_TESTS=1 pnpm test:integration` y `pnpm test:ui`. El servidor dev del criterio F7 usa `.next-field-test`, aislado de `.next/dev`. [Guion manual](../qa/phase-7/field-tests.md); [evidencia](../qa/phase-7/evidence/20261108-suite-campo.md).
