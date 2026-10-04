# Archivos privados: carga preautorizada y lectura temporal

Ownership: plataforma. Fuente de requisitos: TASK-F5-08 y TASK-F5-09; Architecture (almacenamiento de objetos y cuarentena); Database `file_objects`, `file_versions`, `file_bindings`; API `FileObject`, FIL-001 a FIL-005. Seguridad en [docs/security/files.md](../security/files.md).

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
4. **Verificación (F5-09).** El worker consume `file_scans`, valida tamaño, hash declarado y firma (bytes mágicos) y consulta el adaptador antimalware; sólo entonces llena `sha256`, marca `CLEAN`, copia los bytes escaneados a `originals`, mueve la versión a `PRIVATE_ORIGINAL` y el archivo a `AVAILABLE`. Los triggers impiden cualquier atajo. Detalle en [Verificación antimalware](#verificación-antimalware-f5-09).
5. **Lectura temporal (FIL-004).** `files.prepare_download` comprueba cuenta, ámbito de todos los vínculos y versión vigente limpia, no purgada y no expirada; audita `FileReadAuthorized` o `FileReadDenied`. La API firma una URL con descarga forzada y vigencia máxima de 5 minutos, limitada también por la expiración del archivo. `files.finish_download` vuelve a comprobar versión, disponibilidad y ámbito y confirma `download_events` y `FileDownloadRecorded` antes de entregar la URL. Cada solicitud genera una URL nueva: no se guardan ni se reutilizan URLs.
6. **Cancelación y expiración (FIL-005).** El creador puede abortar una carga pendiente (`EXPIRED`, `ABORTED`). `pg_cron` ejecuta `files.expire_upload_sessions()` cada 5 minutos.

## Verificación antimalware (F5-09)

```mermaid
sequenceDiagram
  participant Q as Cola file_scans
  participant K as Worker file-scans
  participant D as PostgreSQL files.*
  participant S as Storage privado
  participant V as Adaptador antimalware
  K->>Q: infra.read_queue (visibilidad 300 s, lote 4)
  K->>D: scan_job_start (trabajo RUNNING; SCAN, PURGE, DONE o MISSING)
  K->>S: GET quarantine/<clave>
  K->>K: tamaño, SHA-256 declarado y firma vs tipo autorizado
  K->>V: bytes (nunca credenciales ni URLs)
  alt limpio
    K->>S: POST originals/<clave> (los mismos bytes escaneados)
    K->>D: scan_record_result CLEAN (sha256, PRIVATE_ORIGINAL, AVAILABLE)
    K->>S: DELETE quarantine/<clave> (mejor esfuerzo)
  else infectado o integridad
    K->>D: scan_record_result (REJECTED, alerta en outbox)
    K->>S: DELETE quarantine/<clave>
    K->>D: scan_record_purge
  end
  K->>Q: ack + job_finish
```

| Resultado                          | Versión                                     | Archivo (público)                           | Bytes                                           | Auditoría (`SYSTEM`, origen `WORKER`)        |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| Limpio                             | `CLEAN`, `PRIVATE_ORIGINAL`, `sha256` final | `AVAILABLE` (`available`)                   | Copia en `originals`; se eliminan de cuarentena | `FileScanCompleted`                          |
| Infectado                          | `INFECTED`, permanece en `QUARANTINE`       | `REJECTED`/`MALWARE_DETECTED` (`rejected`)  | Eliminados de `quarantine`; `purged_at`         | `FileMalwareDetected`, `FileObjectPurged`    |
| Hash o tamaño distinto             | `FAILED` con `sha256` calculado             | `REJECTED`/`INTEGRITY_MISMATCH`             | Eliminados                                      | `FileIntegrityRejected`, `FileObjectPurged`  |
| Firma distinta del tipo autorizado | `FAILED`                                    | `REJECTED`/`SIGNATURE_MISMATCH`             | Eliminados                                      | `FileIntegrityRejected`, `FileObjectPurged`  |
| Escáner o Storage no disponible    | Sin cambio (`PENDING`)                      | `VERIFYING` (`processing`)                  | Intactos en `quarantine`                        | `FileScanAttemptFailed` por intento          |
| Reintentos agotados (5)            | `FAILED`                                    | `QUARANTINED`/`SCAN_FAILED` (`quarantined`) | Intactos en `quarantine` (retención de 7 días)  | `FileQuarantined`; trabajo `DEAD_LETTER`     |
| Reproceso de soporte (INT-004)     | `FAILED` → `PENDING`                        | `QUARANTINED` → `VERIFYING` y nuevo escaneo | —                                               | `FileScanRequeued` (más `JobRetryRequested`) |

- **Alerta de seguridad.** Todo rechazo (infectado, hash o firma) publica `FileSecurityAlertRaised` (agregado `FileObject`, sensibilidad `confidential`, sin nombre de archivo) en el outbox para los consumidores de notificaciones (F5-11) y deja un log `warn` `file_security_alert`.
- **Idempotencia.** La entrega es al menos una vez. `scan_job_start` devuelve `DONE` si el veredicto ya existe y `PURGE` si falta borrar bytes rechazados; `scan_record_result` no cambia un veredicto final. La copia a `originals` usa `x-upsert` y ocurre antes de registrar `CLEAN`, de modo que un archivo disponible siempre tiene su objeto.
- **Reintentos.** `infra.fail_job` aplica la política de `file_scans` (5 intentos, 15 s × 2^(n-1), máximo 15 min) y mueve a `file_scans_dlq`; el trabajo `FILE_SCAN` refleja `RETRY_WAIT`/`DEAD_LETTER` en el Centro de trabajos. Mensajes inválidos o sin trabajo registrado van directo a la DLQ (`INVALID_MESSAGE`, `SCAN_JOB_NOT_FOUND`).
- **Adaptador (ADR-019).** `MalwareScanner` recibe sólo bytes. `ClamAvScanner` usa clamd `INSTREAM` por TCP (mismo `CLAMAV_HOST`/`CLAMAV_PORT` que la evidencia F4; las muestras no salen del entorno) y responde `CLEAN`/`INFECTED`; error del motor, respuesta desconocida, conexión rechazada o timeout cuentan como "no disponible" y nunca como limpio. `SimulatedScanner` (sólo `development`/`test`) marca como infectado únicamente el archivo de prueba EICAR. Sin escáner utilizable el worker no consume la cola y los archivos permanecen en `VERIFYING`.

## Datos

| Tabla                   | Contenido                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files.upload_purposes` | Política por propósito: tipos, tamaño máximo, sensibilidad y tipos de recurso. Espejo de `FILE_UPLOAD_PURPOSES` en `@ice24/contracts`.                                                                    |
| `files.file_objects`    | Objeto lógico (Database `file_objects`) más `purpose`, `closed_reason`, creador, correlación y versión de fila. Estados `PENDING_UPLOAD`, `VERIFYING`, `AVAILABLE`, `REJECTED`, `QUARANTINED`, `EXPIRED`. |
| `files.file_versions`   | Versión física (Database `file_versions`). `sha256` queda nulo hasta la verificación de F5-09; sólo se llenan los campos de verificación una vez; `purged_at` marca el borrado de bytes rechazados.       |
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
- Worker (F5-09): `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y el escáner: `FILE_SCANNER=clamav` (o sólo `CLAMAV_HOST`) con `CLAMAV_PORT` (3310) y `FILE_SCAN_TIMEOUT_MS` (30000, entre 1000 y 120000), o `FILE_SCANNER=simulated` en `development`/`test`. En `staging`/`production` la simulación se rechaza y se registra `file_scans_disabled`.

Operación y fallos en el [runbook de almacenamiento](../runbooks/object-storage.md).

## Emisión y registro de descargas (F5-10)

Migración `20261003000700_phase5_downloads.sql`: `download_sessions` guarda la autorización inmutable (actor, cuenta, versión exacta, contexto, motivo, correlación y expiración), y `download_events` registra el resultado append-only. No se guardan URLs, tokens, nombres de archivo ni IP sin pseudonimizar. Las columnas opcionales de IP y máquina quedan vacías en el flujo privado actual. Las relaciones a documentos, reportes y exportaciones se agregarán con los módulos correspondientes; DOC-013 no se implementa usando identificadores de archivos como si fueran documentos.

`AUTHORIZED` significa URL emitida y autorizada, no transferencia de bytes comprobada. Un fallo al firmar genera `ERROR`; una versión o sesión expirada genera `EXPIRED`; una versión no disponible o un ámbito perdido genera `DENIED`. Un recurso inexistente/fuera de ámbito se audita sin vincular su versión a la cuenta solicitante. Si no existe versión (carga sin confirmar), sólo hay auditoría. Nunca se registra éxito de emisión antes de firmar. Cada petición HTTP vuelve a autorizar y crea una sesión nueva, aun con la misma clave de idempotencia; la finalización interna de cada sesión sí es idempotente.

La expiración persistida es el límite superior de la URL. La API descuenta 8 segundos para cubrir el timeout de firma de Storage y redondea la vigencia restante hacia abajo; menos de un segundo utilizable rechaza la emisión. La UI muestra la hora límite recibida. Se necesitan relojes sincronizados en API, PostgreSQL y Storage. Una URL ya entregada sigue siendo una capacidad de portador hasta vencer: cambiar permisos no revoca instantáneamente el token del proveedor.

La auditoría se confirma antes de responder; error de persistencia impide entregar la URL. Una caída del proceso entre autorización y finalización deja una sesión sin evento terminal: no se inventa un resultado de transferencia. `FileReadAuthorized`, `FileReadDenied` y `FileDownloadRecorded` permiten investigar por correlación sin exponer secretos. No hay un nuevo worker: el registro es síncrono para garantizar la persistencia antes de entrega. El escaneo F5-09 se mantiene igual.

Compatibilidad F4: `equipment.files` registra `EVIDENCE_DOWNLOAD_AUTHORIZED` con actor, contexto, cuenta, correlación y huella, en su transacción existente antes de entregar URL (60 segundos). Se conserva el modelo histórico y su proyección a auditoría central; no se crean versiones ficticias para rellenar `download_events`.
