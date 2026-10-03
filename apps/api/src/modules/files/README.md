# Archivos privados

Módulo de plataforma para F5-08. Application autoriza y deriva el ámbito (cuenta, sucursales, máquinas) del contexto activo; Infrastructure usa las funciones `files.*` de PostgreSQL y el adaptador `SupabaseObjectStorage` (puerto `ObjectStoragePort`); Interface publica FIL-001 a FIL-005.

- Los bytes nunca pasan por la API: se emite una URL firmada de subida para `quarantine/<account_id>/<file_id>/v1/<uuid>` y un token de un solo uso cuyo hash queda en `files.upload_sessions`.
- La confirmación consulta el objeto con `HEAD`, registra la versión en cuarentena con escaneo `PENDING` y encola `FILE_SCAN` en `file_scans` (F5-09).
- Las lecturas sólo se firman (5 minutos) para archivos `AVAILABLE` con versión verificada y quedan auditadas.
- Errores ApiError: 404 fuera de cuenta o ámbito, 409 estado o idempotencia, 413, 415, 422 `FILE_UPLOAD_MISMATCH`, 409 `FILE_NOT_AVAILABLE`, 503 almacenamiento no disponible.

Diseño en [docs/modules/files.md](../../../../../docs/modules/files.md), seguridad en [docs/security/files.md](../../../../../docs/security/files.md) y reporte en [task-f5-08](../../../../../docs/tasks/task-f5-08.md).
