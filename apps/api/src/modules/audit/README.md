# Auditoría

Módulo transversal de plataforma para F5-04. Application autoriza el ámbito, Infrastructure consulta PostgreSQL y el adaptador HTTP publica AUD-001/002/003. No hay endpoints de mutación.

- Datos: `audit.events`, append-only, contratos `@ice24/contracts/audit` exportados desde el paquete raíz.
- Escritura interna: `appendAuditEvent` recibe el PoolClient de una transacción de negocio y un resumen explícito validado. Nunca debe recibir bodies sin depurar ni crear una transacción independiente de la acción.
- Lectura: `audit.read`, aislamiento por cuenta y unión de ámbitos de sucursal/máquina. `audit.global-read` requiere MFA y ámbito completo, asignado inicialmente a IA.
- Clasificación: RESTRICTED, incluidas IP y evidencia; HTTP no-store, SQL parametrizado y timeout 15 segundos.
- Paginación: orden descendente por fecha UTC/UUID; cursor conserva microsegundos. Es una consulta de historial vivo, no un snapshot de varias páginas.
- Errores HTTP siguen ApiError y conservan correlationId. No se registran payloads de auditoría en logs técnicos.
- Operación y estado: [reporte F5-04](../../../../../docs/tasks/task-f5-04.md).

La tabla comienza vacía. La migración `20261002000200_phase5_audit_producers.sql` proyecta de forma transaccional los eventos nuevos de suscripciones, equipos e identidad. Conserva el ID original y filtra los resúmenes; no realiza backfill ni sustituye los historiales existentes. La UI `/audit` consume un BFF de lectura validado y descarta resultados ante un cambio de contexto. Véase el [runbook](../../../../../docs/runbooks/audit.md).
