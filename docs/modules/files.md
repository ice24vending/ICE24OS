# Archivos privados: carga preautorizada y lectura temporal

Ownership: plataforma. Fuente de requisitos: TASK-F5-08; Architecture (almacenamiento de objetos y cuarentena); Database `file_objects`, `file_versions`, `file_bindings`; API `FileObject`, FIL-001 a FIL-005. Seguridad en [docs/security/files.md](../security/files.md).

## Flujo

```mermaid
sequenceDiagram
  participant B as Navegador
  participant W as BFF private-web
  participant A as API files
  participant D as PostgreSQL files.*
  participant S as Storage privado
  B->>W: metadatos (nombre, tipo, tamaño, propósito, recurso) + CSRF
  W->>A: FIL-001 + Idempotency-Key
  A->>D: create_upload_session (política, ámbito, hash del token)
  A->>S: firma de subida para quarantine/<cuenta>/<archivo>/v1/<aleatorio>
  A-->>B: uploadUrl (PUT), uploadToken de un solo uso, expiresAt
  B->>S: PUT directo de los bytes (nunca pasan por BFF ni API)
  B->>W: confirmar (uploadToken, sha256 calculado en el navegador)
  W->>A: FIL-002
  A->>S: HEAD del objeto (tamaño y tipo reales)
  A->>D: complete_upload: versión v1 en QUARANTINE, scan PENDING, job FILE_SCAN
  A-->>B: 202 Job (queued); el archivo queda VERIFYING
```

1. **Autorización (FIL-001).** `files.create_upload_session` valida propósito (`files.upload_purposes`), tipo, tamaño, nombre y que el recurso vinculado exista en la cuenta y en el ámbito del usuario. Crea `file_objects` (`PENDING_UPLOAD`), el vínculo `file_bindings` (`ORIGINAL`) y `upload_sessions` con el SHA-256 del token, vigencia de 10 minutos (máximo 15) y clave `<account_id>/<file_id>/v1/<uuid>`. La misma `Idempotency-Key` con el mismo cuerpo devuelve el mismo archivo con un token nuevo; con otro cuerpo responde 409 `IDEMPOTENCY_CONFLICT`.
2. **Subida directa.** El navegador hace `PUT` a la URL firmada del bucket privado `quarantine`. La firma sólo sirve para esa ruta exacta y no permite sobrescribir.
3. **Confirmación (FIL-002).** La API consulta el objeto con `HEAD` y `files.complete_upload` compara token, tamaño y tipo con lo autorizado. Si coincide, registra la versión 1 (`storage_zone = QUARANTINE`, `scan_status = PENDING`, `available_at` nulo), deja el archivo en `VERIFYING`, crea el trabajo `FILE_SCAN` en `infra.async_jobs` y envía el mensaje a la cola `file_scans` (con DLQ `file_scans_dlq`). Si el objeto no existe responde 422 sin cerrar la sesión; si tamaño o tipo difieren, rechaza el archivo (`REJECTED`, `UPLOAD_MISMATCH`). Repetir la confirmación devuelve el mismo trabajo.
4. **Verificación (F5-09).** El consumidor de `file_scans` valida firma, hash y malware, y sólo entonces llena `sha256`, marca `CLEAN`, mueve la versión a `PRIVATE_ORIGINAL` y el archivo a `AVAILABLE`. Los triggers impiden cualquier atajo.
5. **Lectura temporal (FIL-004).** `files.authorize_read` comprueba cuenta, ámbito de todos los vínculos y que la versión vigente esté verificada; audita `FileReadAuthorized` o `FileReadDenied`. La API firma una URL de lectura de 5 minutos con descarga forzada. Cada solicitud genera una URL nueva: no se guardan ni se reutilizan URLs.
6. **Cancelación y expiración (FIL-005).** El creador puede abortar una carga pendiente (`EXPIRED`, `ABORTED`). `pg_cron` ejecuta `files.expire_upload_sessions()` cada 5 minutos.

## Datos

| Tabla                   | Contenido                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files.upload_purposes` | Política por propósito: tipos, tamaño máximo, sensibilidad y tipos de recurso. Espejo de `FILE_UPLOAD_PURPOSES` en `@ice24/contracts`.                                                                    |
| `files.file_objects`    | Objeto lógico (Database `file_objects`) más `purpose`, `closed_reason`, creador, correlación y versión de fila. Estados `PENDING_UPLOAD`, `VERIFYING`, `AVAILABLE`, `REJECTED`, `QUARANTINED`, `EXPIRED`. |
| `files.file_versions`   | Versión física (Database `file_versions`). `sha256` queda nulo hasta la verificación de F5-09; sólo se llenan los campos de verificación una vez.                                                         |
| `files.file_bindings`   | Vínculo con `ACCOUNT`, `BRANCH` o `MACHINE` validado contra `equipment.*` y la cuenta.                                                                                                                    |
| `files.upload_sessions` | Sesión de carga: hash del token, huella de la solicitud, clave del objeto, tamaño y tipo declarados, estado (`ISSUED`, `COMPLETED`, `ABORTED`, `EXPIRED`, `REJECTED`), trabajo y vigencia.                |

Propósitos iniciales: `equipment_evidence` (JPEG/PNG/PDF, 10 MiB, sucursal o máquina), `machine_photo` (JPEG/PNG, 10 MiB, máquina), `laboratory_analysis_original` (PDF, 25 MiB, sucursal o máquina) y `document_original` (PDF/JPEG/PNG, 25 MiB, cuenta, sucursal o máquina). Agregar uno requiere migración y contrato en el mismo cambio.

## API y permisos

| Ruta                                        | Permiso        | Respuesta y errores                                                                                                                       |
| ------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/files/upload-sessions`        | `files.upload` | 201 `UploadSession`. 400, 404 recurso fuera de ámbito, 409 `IDEMPOTENCY_CONFLICT`, 413 `PAYLOAD_TOO_LARGE`, 415 `UNSUPPORTED_MEDIA_TYPE`. |
| `POST /api/v1/files/{id}/complete-upload`   | `files.upload` | 202 `Job` (`FILE_SCAN`). 404 sesión de otro usuario o cuenta, 409 `STATE_TRANSITION_INVALID`, 422 `FILE_UPLOAD_MISMATCH`.                 |
| `GET /api/v1/files/{id}`                    | `files.read`   | 200 `FileObject` sin claves de almacenamiento ni tokens. 404 fuera de cuenta o ámbito.                                                    |
| `POST /api/v1/files/{id}/download-sessions` | `files.read`   | 201 `{url, expiresAt}` (5 min). 409 `FILE_NOT_AVAILABLE` mientras no esté verificado o para derivados. Permitido en solo lectura.         |
| `POST /api/v1/files/{id}/abort`             | `files.upload` | 204. 409 si ya no está pendiente.                                                                                                         |

Roles: `files.upload` para IA, OW, SA, TC y OP; `files.read` además para AU. Todas las mutaciones exigen `Idempotency-Key`. En cuentas en modo solo lectura se rechazan las cargas (`ACCOUNT_READ_ONLY`) y se permiten las descargas protegidas (`AllowReadOnlyOperation("protected-download")`).

## Interfaz

`/files` (enlace «Archivos privados» en el espacio de trabajo) permite elegir recurso (`?resourceType=branch|machine&resourceId=` o sucursales del usuario), propósito y archivo; valida tipo y tamaño antes de pedir autorización, calcula el SHA-256 con Web Crypto, sube con barra de progreso, confirma y muestra el estado «En verificación (cuarentena)». «Descargar» sólo se habilita cuando el archivo está disponible. Rutas BFF: `/api/files/upload-sessions`, `/api/files/{id}`, `/api/files/{id}/complete`, `/api/files/{id}/download` y `/api/files/{id}/abort`, con sesión, contexto de pestaña, CSRF y clave de idempotencia.

## Configuración

- API: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (sólo servidor), `DATABASE_URL`.
- Web: `ICE24_STORAGE_ORIGIN` (o `SUPABASE_URL`) en el entorno de **build** para añadir el origen del almacenamiento a `connect-src` de la CSP; sin él el navegador no puede subir.
- El adaptador es `ObjectStoragePort`; hoy existe `SupabaseObjectStorage`. Un adaptador S3 implementaría las mismas tres operaciones con URLs prefirmadas.

Operación y fallos en el [runbook de almacenamiento](../runbooks/object-storage.md).
