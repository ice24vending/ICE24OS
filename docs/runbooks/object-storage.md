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
| Archivos en `VERIFYING` sin avanzar                    | Falta el consumidor de `file_scans` (F5-09) o está en DLQ. Revisar el [Centro de trabajos](queues.md) (`FILE_SCAN`).                                                                                           |
| Sesiones `ISSUED` vencidas                             | `pg_cron` `ice24_expire_upload_sessions` (cada 5 min). Ejecutar manualmente `select files.expire_upload_sessions();` y revisar `cron.job_run_details`.                                                         |

Consultas útiles (rol de servicio): `select status, count(*) from files.file_objects group by 1;` y `select status, count(*) from files.upload_sessions where created_at > now() - interval '1 day' group by 1;`. Nunca copiar URLs firmadas en tickets: contienen credenciales temporales.
