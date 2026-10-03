# Runbook — Almacenamiento de objetos

Los buckets `quarantine`, `originals`, `derivatives` y `exports` son privados. Sólo el servicio firma URLs; desde F5-08 el aislamiento por cuenta lo da el prefijo `<account_id>/<file_id>/` controlado en `files.*` (ver [módulo de archivos](../modules/files.md)).

## Controles

- No crear buckets públicos ni URLs permanentes.
- Cuarentena acepta PDF/JPEG/PNG hasta 50 MiB y nunca se consume antes del resultado antimalware.
- Originales no se eliminan por transferencia de activo.
- Exportaciones admiten hasta 100 MiB y tienen clase temporal de siete días.
- Una URL firmada dura como máximo 15 minutos; el TTL de caché debe ser menor o igual.
- El borrado automático de originales/derivados queda bloqueado hasta dictamen legal y soporte de legal hold.

Para verificar privacidad, una petición anónima y otra autenticada sin política deben recibir denegación; service role se usa sólo en servidor.

## Cargas preautorizadas (F5-08)

| Síntoma                                                | Causa probable y acción                                                                                                                                                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El navegador no sube (error de red, CSP `connect-src`) | La web se construyó sin `ICE24_STORAGE_ORIGIN`/`SUPABASE_URL`. Reconstruir con la variable y verificar el encabezado `Content-Security-Policy`.                                                                |
| 503 `DEPENDENCY_UNAVAILABLE` al autorizar o descargar  | Storage caído o `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` ausentes en la API. Revisar salud de Storage; la sesión ya creada se recupera repitiendo la solicitud con la misma `Idempotency-Key` (token nuevo). |
| 422 `FILE_UPLOAD_MISMATCH`                             | Objeto ausente (la subida no terminó) o tamaño/tipo distintos. Si el archivo quedó `REJECTED`, el usuario debe subirlo de nuevo; el objeto queda en `quarantine` hasta su retención.                           |
| Archivos en `VERIFYING` sin avanzar                    | El worker no tiene escáner o Storage configurado (log `file_scans_disabled`) o el trabajo está en `RETRY_WAIT`. Ver [Verificación antimalware](#verificación-antimalware-f5-09).                               |
| Sesiones `ISSUED` vencidas                             | `pg_cron` `ice24_expire_upload_sessions` (cada 5 min). Ejecutar manualmente `select files.expire_upload_sessions();` y revisar `cron.job_run_details`.                                                         |

Consultas útiles (rol de servicio): `select status, count(*) from files.file_objects group by 1;` y `select status, count(*) from files.upload_sessions where created_at > now() - interval '1 day' group by 1;`. Nunca copiar URLs firmadas en tickets: contienen credenciales temporales.

## Verificación antimalware (F5-09)

| Síntoma                                                                            | Causa probable y acción                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Log `file_scans_disabled` al arrancar el worker                                    | `errorCode` indica la causa: `SCANNER_NOT_CONFIGURED`, `SCANNER_MISCONFIGURED`, `SIMULATED_SCANNER_FORBIDDEN` (simulación fuera de development/test) o `STORAGE_NOT_CONFIGURED`. Corregir `FILE_SCANNER`/`CLAMAV_HOST`/`CLAMAV_PORT` o `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` y reiniciar. Los archivos esperan en `VERIFYING`. |
| Trabajos `FILE_SCAN` en `RETRY_WAIT` con `SCANNER_UNAVAILABLE` o `SCANNER_TIMEOUT` | clamd caído, saturado o sin firmas. Verificar que `PING` a `$CLAMAV_HOST:3310` responda `PONG` y que `freshclam` esté al día. Los reintentos continúan solos (15 s × 2^(n-1)).                                                                                                                                                      |
| `STORAGE_UNAVAILABLE` u `OBJECT_MISSING`                                           | Storage caído o el objeto ya no está en `quarantine` (retención de 7 días vencida). Revisar salud de Storage; si el objeto no existe, el usuario debe subirlo de nuevo.                                                                                                                                                             |
| Archivos `QUARANTINED` (trabajo `DEAD_LETTER`)                                     | Se agotaron 5 intentos. Resolver la causa y reprocesar desde el Centro de trabajos (INT-004, motivo obligatorio): el archivo vuelve a `VERIFYING` (`FileScanRequeued`) y se escanea de nuevo. Los bytes siguen en `quarantine` hasta su retención.                                                                                  |
| Log `file_security_alert` o evento `FileSecurityAlertRaised`                       | Archivo infectado o con hash/firma distintos: ya está `REJECTED` y sus bytes se eliminaron. Revisar `audit.events` (`FileMalwareDetected`/`FileIntegrityRejected`) por correlación, avisar a seguridad y, si hay patrón, revisar al usuario y la cuenta. No restaurar el archivo.                                                   |
| Rechazo con bytes aún en `quarantine` (`purged_at` nulo)                           | El borrado falló; el trabajo se reintenta con acción `PURGE`. Si quedó en DLQ, reprocesarlo; la retención de 7 días del bucket es el respaldo.                                                                                                                                                                                      |

Consultas: `select scan_status, count(*) from files.file_versions group by 1;`, `select status, error_code, count(*) from infra.async_jobs where job_type = 'FILE_SCAN' group by 1, 2;` y `select operation, result, count(*) from audit.events where entity_type = 'FileObject' and origin = 'WORKER' and occurred_at_utc > now() - interval '1 day' group by 1, 2;`. Para probar el escáner en desarrollo usar únicamente el archivo de prueba EICAR, nunca malware real.
