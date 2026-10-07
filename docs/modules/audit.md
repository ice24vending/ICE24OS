# Auditoría central

Ownership: plataforma. Fuente de requisitos: TASK-F5-04, PRD RF-AUD-002–006 y RF-AUD-014, API AUD-001–003 y Database audit_events.

`audit.events` es un registro inmutable RESTRICTED. Actor humano, sistema o Stripe; contexto opcional para productores sin sesión; ámbito de cuenta y recursos capturado; evidencia resumida, resultado y correlación. No hay operaciones HTTP de escritura.

Los historiales existentes de suscripciones, equipos e identidad generan la proyección central dentro de su transacción mediante triggers. Los datos anteriores/nuevos usan una lista permitida y los cambios de permisos incluyen roles, overrides y ámbitos. El adaptador `appendAuditEvent` permite a nuevos productores escribir usando su misma transacción. Nuevos módulos deben documentar su contrato e integración; los logs técnicos no sustituyen este registro.

API: listado y detalle en el ámbito autorizado; listado global requiere permiso separado y MFA. El BFF valida consultas y evita usar el contexto de una pestaña anterior. El visor `/audit` presenta filtros, cursor anterior/siguiente, detalle, carga, vacío y error; no ofrece edición ni exportación.

No hay backfill: las fuentes históricas siguen disponibles en sus módulos. No se captura IP retroactivamente. [Reporte](../tasks/task-f5-04.md), [runbook](../runbooks/audit.md), [módulo API](../../apps/api/src/modules/audit/README.md).

## Interfaz (F5-15)

El visor `/audit` filtra por fechas, tipo de evento, actor, resultado, tipo e ID de entidad, correlación, sucursal y máquina (y ámbito global para ICE24), acepta filtros desde enlaces (`/audit?correlationId=`) y muestra sin permiso un estado sin datos. Ver [Interfaz de servicios de cuenta](account-services-ui.md).
