# Seguridad de archivos privados

Aplica a F5-08 (carga preautorizada, confirmación y lectura temporal) y a las tareas F5-09 y F5-10 que la completan. Diseño en [docs/modules/files.md](../modules/files.md).

## Amenazas y controles

| Amenaza                                 | Control                                                                                                                                                                                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso entre cuentas                    | La cuenta sale del contexto autorizado, nunca del cliente. La clave del objeto es `<account_id>/<file_id>/v<n>/<uuid>` y un trigger rechaza cualquier versión o sesión fuera de ese prefijo. Las funciones filtran por cuenta y responden 404.                                                            |
| Acceso fuera del ámbito                 | `files.resource_in_scope` y `files.file_visible` exigen que cada vínculo (cuenta, sucursal, máquina) esté en el ámbito del usuario; los archivos de cuenta requieren ámbito completo.                                                                                                                     |
| URLs públicas permanentes               | Buckets privados; sólo URLs firmadas: subida para una ruta exacta sin sobrescritura, lectura de 5 minutos (máximo 15) con descarga forzada. No se guardan URLs; cada lectura se firma y audita de nuevo.                                                                                                  |
| Robo de la credencial de almacenamiento | La llave de servicio vive sólo en la API. El navegador recibe URLs con token por objeto.                                                                                                                                                                                                                  |
| Confirmar la carga de otro              | Token aleatorio de 256 bits, de un solo uso, entregado una vez; en base de datos sólo su SHA-256 (columna sin privilegio de lectura). La sesión pertenece al usuario y a la cuenta que la crearon.                                                                                                        |
| Archivo distinto al autorizado          | La confirmación compara tamaño y tipo reales (`HEAD`) con lo autorizado y rechaza diferencias. El SHA-256 declarado viaja al trabajo de verificación para compararlo con el calculado (F5-09).                                                                                                            |
| Malware o contenido activo              | Toda versión nace en `QUARANTINE` con `scan_status = PENDING`. Restricciones y triggers impiden `AVAILABLE` sin hash, escaneo limpio y salida de cuarentena; las lecturas de archivos no verificados se niegan y auditan. Si el escáner no está disponible, el archivo permanece en cuarentena (ADR-019). |
| Tipos peligrosos y tamaños excesivos    | Lista blanca por propósito (PDF, JPEG, PNG) y límite por propósito, validados en navegador, BFF, API y base de datos; los buckets limitan a 50 MiB y a los mismos tipos.                                                                                                                                  |
| Nombres maliciosos                      | Sin rutas, barras invertidas ni caracteres de control; el nombre nunca forma parte de la clave del objeto.                                                                                                                                                                                                |
| CSRF y pestañas con otro contexto       | BFF con verificación de origen, token CSRF, cabecera de contexto y `Idempotency-Key`.                                                                                                                                                                                                                     |
| Fuga en registros                       | `redactSignedUrl` (`@ice24/observability`) elimina `token` y firmas de URLs en logs; las respuestas usan `Cache-Control: no-store` y la descarga `Referrer-Policy: no-referrer`.                                                                                                                          |
| Repudio                                 | `audit.events`: `FileUploadAuthorized`, `FileUploadCompleted`, `FileUploadRejected`, `FileUploadAborted`, `FileReadAuthorized` y `FileReadDenied`, con actor, contexto, cuenta, correlación y resultado.                                                                                                  |

## Privilegios

RLS activo en todas las tablas `files.*` sin políticas para `anon` ni `authenticated` (sin acceso desde el navegador). El rol de servicio sólo lee metadatos y ejecuta las funciones `security definer` (con `search_path` vacío); no puede insertar ni actualizar directamente ni leer `token_hash` o `request_hash`.

## Pendientes

- F5-09: consumidor de `file_scans`, validación de firma y hash, antimalware y promoción a `originals`.
- F5-10: registro de descargas (`download_events`) e historial (DOC-013).
- Supabase emite URLs de subida firmadas con vigencia propia de 2 horas; la sesión ICE24 expira antes y un objeto subido tarde nunca se confirma: queda en `quarantine` hasta su retención de 7 días.
