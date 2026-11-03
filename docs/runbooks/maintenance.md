# Runbook — Mantenimiento programado

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
