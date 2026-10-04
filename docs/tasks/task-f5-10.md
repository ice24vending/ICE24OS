# TASK-F5-10 — URLs temporales y registro de descargas

Estado: Implementada y validada con evidencias locales completas; lista para PR hacia main. Rama: `feat/f5-10-temporary-downloads-audit`.

## Alcance y trazabilidad

- TASKS F5-10; dependencias F5-04, F5-08 y F5-09 implementadas.
- PRD RF-DOC-009, RF-DOC-013, RF-AUD-013, RF-AUD-016, RF-SUB-009 y CA-RPT-003.
- TRD § archivos: URL breve, autorización por objeto y auditoría; Architecture: HTTPS firmado directo al almacenamiento.
- Database: `download_events` append-only, versión, actor, resultado y correlación.
- API FIL-004 conserva solicitud y respuesta. Cada solicitud vuelve a autorizar y no reutiliza URLs.

## Plan

1. Migración aditiva para sesiones de autorización y eventos de descarga; aislamiento y permisos mínimos.
2. Firmar únicamente versiones disponibles, limpias, no purgadas y no expiradas; limitar TTL por expiración del archivo.
3. Guardar resultado y auditoría antes de devolver URL; fallar cerrado ante errores de persistencia.
4. Pruebas unitarias, integración y pgTAP; ejecutar `pnpm check`.

## Límites explícitos

`AUTHORIZED` registra la emisión autorizada de una URL, no confirma que el navegador haya recibido todos los bytes. La transferencia sigue siendo directa a Storage. `EXPIRED` registra intentos sobre versiones/sesiones expiradas, no un evento sintético por cada URL que vence sin usarse.

DOC-013 pertenece al dominio de documentos: aún no existen documentos ni `document_versions`; no se introduce un endpoint que confunda identificadores de archivo con documentos. Relaciones a documentos/reportes/exportaciones se incorporarán con esos módulos. No se habilitan descargas públicas ni derivados inexistentes.

## Validación

Resultados completos al final de este reporte.

## Implementación entregada

- Migración aditiva `20261003000700_phase5_downloads.sql`: sesiones inmutables y `download_events`, RLS, grants mínimos, índices y funciones `prepare_download`/`finish_download`. No modifica migraciones anteriores ni elimina datos.
- FIL-004 conserva `{version,purpose}` y `201 {url,expiresAt}`. La vigencia máxima de cinco minutos queda limitada por expiración del archivo; la firma descuenta ocho segundos de presupuesto de red. Se comprueba que Storage firma exactamente el objeto autorizado.
- Autorización y resultado final tienen transacciones propias; falla cerrada ante error de firma, registro o cambio de disponibilidad/ámbito. `AUTHORIZED`, `DENIED`, `EXPIRED`, `ERROR` tienen contrato compartido. La finalización de una sesión es idempotente; solicitudes HTTP repetidas generan nuevas sesiones auditadas.
- UI muestra la hora límite recibida en vez de prometer siempre cinco minutos. OpenAPI y mensajes de error incluyen expiración y pérdida de autorización.
- Compatibilidad F4: la descarga de `equipment.files` ahora registra `EVIDENCE_DOWNLOAD_AUTHORIZED` dentro de la transacción existente antes de entregar URL, sin guardar tokens. Mantiene su tabla y cadena de auditoría, proyectada a auditoría central por F5-04. No fabrica versiones para archivos heredados.

## Archivos

Creados: este seguimiento, `supabase/migrations/20261003000700_phase5_downloads.sql`, `supabase/tests/database/phase5_downloads_test.sql` y `apps/api/src/modules/equipment/files-download.test.ts`.

Modificados: `apps/api/src/modules/files/{application/files.port.ts,application/files.service.ts,application/files.service.test.ts,infrastructure/files.database.ts,infrastructure/supabase-storage.ts,infrastructure/supabase-storage.test.ts,interface/files.controller.ts,interface/files-error.filter.ts,README.md}`; `apps/api/src/modules/equipment/files.store.ts`; `apps/private-web/src/features/files/uploader.tsx`; `packages/contracts/src/{files.ts,files.test.ts}`; `tests/integration/{files.test.ts,file-scans.test.ts}`; `docs/{modules/files.md,security/files.md,runbooks/object-storage.md,backlog/phase-5-status.md}`. Ningún archivo eliminado. Se normalizaron saltos de línea de archivos previos señalados por Prettier, sin diferencias de contenido adicionales.

## Resultados de validación local (03/10/2026)

- `pnpm check`: correcto en ejecución final: formato, lint con 0 errores y 0 advertencias, 21 tareas de tipos, fronteras de módulos, infraestructura, identidad y 219 pruebas unitarias en 42 archivos.
- `pnpm test:integration`: 72 correctas en 9 archivos; 5 omitidas por `ICE24_BROWSER_TESTS` desactivado. Incluye 2 casos nuevos F5-10, migración completa, API Nest, PostgreSQL real, doble HTTP de Storage, emisión repetida, error de firma, expiración, registro inmutable, aislamiento y cambio de ámbito/disponibilidad.
- Regresión de equipos repetida tras la auditoría heredada: 14 pruebas correctas, 1 de navegador omitida.
- pgTAP completo: 197 aserciones correctas en 10 archivos; 23 nuevas para sesiones, permisos, RLS, TTL, auditoría, aislamiento, error, idempotencia, inmutabilidad y expiración. Ejecutado contra Supabase local/PGMQ real con la migración incluida en cada transacción y rollback final; no cambia el estado persistente local.
- El primer intento de integración dentro del sandbox no tuvo acceso a Docker; la ejecución autorizada fuera del sandbox pasó. El primer `pnpm check` detectó saltos de línea incompatibles en 19 archivos previos: corregidos sin diferencias semánticas. Un caso de integración esperaba el texto SQL en vez del error de dominio: corregido para verificar el contrato del adaptador.

## Operación, riesgos y pendientes

- Desplegar migración antes de API. Reversión: deshabilitar FIL-004, conservar registros. No volver a la API anterior sin registro.
- Dos transacciones cortas por emisión más llamada a Storage; índices por versión, usuario y cuenta. Sin nuevos servicios, dependencias, colas, proveedores ni cambios de costo contratado.
- Tokens ya entregados siguen válidos hasta su vencimiento; sincronizar relojes de API, PostgreSQL y Storage. La API reserva tiempo de firma y falla cerrado si falta vigencia.
- Caída de proceso entre autorización y finalización: sesión sin resultado terminal, diagnosticable con el runbook; no afirmar descarga completa ni rellenar eventos retrospectivos.
- La migración física de evidencias F4 a `files.file_versions` sigue siendo deuda: requiere backfill de objetos y vínculos; mientras tanto su emisión queda auditada por la ruta heredada.
- DOC-013, descargas públicas, marcas de agua y relaciones con documentos/reportes/exportaciones requieren sus módulos y permisos correspondientes. No se anticipa ese alcance en F5-10.
- Pendientes: Storage en staging, revisión humana, CI y despliegue. Sin ADR nuevo; evidencias locales completas en el apartado siguiente.

## Evidencias de publicación F5-10

Validación del 03/10/2026 (America/Mexico_City), Windows, Docker, Chromium y Supabase local real:

- [pnpm check](../qa/phase-5/evidence/20261003-f5-10-check.txt): 219 unitarias correctas, formato, lint y tipos sin errores.
- [Build](../qa/phase-5/evidence/20261003-f5-10-build.txt): correcto.
- [Integración con Chromium](../qa/phase-5/evidence/20261003-f5-10-integration.txt): 77 pruebas correctas, sin omisiones; las pruebas de fallos usan dobles de Storage y clamd.
- [Supabase CLI](../qa/phase-5/evidence/20261003-f5-10-supabase.txt): migraciones locales, lint y 197 aserciones pgTAP en 10 archivos, con PGMQ real. Sin reset de la base local.
- [Storage real](../qa/phase-5/evidence/20261003-f5-10-storage.txt): subida y descarga firmadas, mismos bytes, bloqueo público, auditoría y expiración; identidad y veredicto CLEAN sintéticos. Objetos eliminados y fixtures relacionales revertidos al terminar.
- [Escritorio](../qa/phase-5/evidence/20261003-f5-10-desktop.png) y [móvil](../qa/phase-5/evidence/20261003-f5-10-mobile.png). Las capturas históricas se preservaron.
- Logs censurados antes de versionar. Reproducción: `tmp/publicar-f5-10.ps1`. Evidencia lista para PR; aprobación y CI remota pendientes.
