# Operación de cuentas y equipos

## Propósito y responsables

Operar API, web privada y worker conservando aislamiento, historia y auditoría. El responsable del proyecto coordina incidentes; backend atiende transacciones, DevOps los servicios y QA verifica recuperación. Aplican también los runbooks de [despliegue](deployment.md), [respaldo](backup-restore.md) y [acceso](identity-access.md).

## Preparación

1. Instalar con `pnpm install --frozen-lockfile` y versiones de `package.json`.
2. Configurar `.env.example` mediante los secretos del ambiente: `DATABASE_URL` en API y worker; Supabase y su credencial de servicio solo en backend; OIDC, `PRIVATE_API_URL` y secretos BFF en web privada. No versionar valores reales.
3. Verificar respaldo y aplicar migraciones en orden mediante el procedimiento de despliegue, incluida `20260917000100_phase4_equipment.sql`. No usar reset en bases compartidas.
4. Verificar bucket privado `quarantine` y ClamAV INSTREAM, con `CLAMAV_HOST` y `CLAMAV_PORT` (3310 por defecto).
5. Ejecutar `pnpm check` y `pnpm build`, arrancar API, web privada y worker con configuración del ambiente y comprobar login, contexto y `/workspace`.

## Calendarios y señales

El worker consulta hasta 20 jobs cada cinco segundos. Usa bloqueo por máquina y timeout SQL de 15 segundos. El quinto intento fallido deja el job en `failed`; ese estado es la cola terminal local, sin DLQ externa. Un job obsoleto o de máquina retirada puede completar sin generar actividades. La clave de generación evita duplicados de una misma actividad.

El health check del worker solo verifica runtime y telemetría: no acredita conexión PostgreSQL ni consumo de jobs. Revisar avance con consultas de solo lectura desde una sesión autorizada:

```sql
SELECT status, count(*) AS jobs, min(created_at) AS oldest
FROM equipment.schedule_jobs GROUP BY status;

SELECT id, machine_id, template_id, attempts, last_error, created_at
FROM equipment.schedule_jobs
WHERE status IN ('pending', 'failed')
ORDER BY created_at LIMIT 50;
```

## Diagnóstico

- 401: revisar sesión y autenticación; ingresar nuevamente si expiró.
- 403 o solo lectura: revisar cuenta, membresía, permisos y MFA administrativo. No ampliar permisos como reparación automática.
- 404: comprobar contexto y ámbito; un recurso ajeno debe permanecer oculto.
- 409: recargar versión y contexto, revisar cambios concurrentes y volver a confirmar la intención.
- Jobs sin avance: revisar proceso worker, `DATABASE_URL`, conectividad y bloqueos; el health check no basta.
- Evidencia en cuarentena: reparar escáner o almacenamiento y solicitar `POST /v1/equipment-files/:id/scan` con autorización e idempotencia. No marcar limpio por SQL.

## Reproceso y recuperación

Corregir primero la causa. Revisar máquina y plantilla vigente; registrar ID de job, motivo y responsable. Un operador autorizado puede devolver únicamente el job fallido verificado a pendiente con una consulta parametrizada (`$1` es su UUID):

```sql
UPDATE equipment.schedule_jobs
SET status = 'pending', attempts = 0, last_error = NULL
WHERE id = $1 AND status = 'failed'
RETURNING id, machine_id, template_id, status;
```

Comprobar exactamente una fila modificada, estado posterior `completed`, actividades esperadas y ausencia de duplicados. Si el job era obsoleto, confirmar que las actividades de la plantilla actual permanecen correctas. No reprocesar masivamente ni editar eventos o periodos históricos.

Ante regresión detener nuevas mutaciones y consumo mientras se diagnostica. Revertir aplicación solo a versión compatible con el esquema; no borrar migraciones aplicadas ni tablas. Si hay daño de datos, restaurar primero en entorno aislado siguiendo el runbook y reconciliar máquinas, periodos, eventos y actividades.

Escalar inmediatamente acceso entre cuentas, pérdida de historia o alteración de auditoría. Adjuntar hora UTC, correlación, versión, IDs mínimos y estados; excluir secretos, tokens, contenido privado y URLs firmadas. Recuperación aceptada: acceso autorizado correcto, cuenta ajena denegada, solo lectura respetado y jobs sin fallos persistentes.
