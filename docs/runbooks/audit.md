# Auditoría — operación F5-04

## Despliegue

Aplicar `20261002000100_phase5_audit.sql` y después `20261002000200_phase5_audit_producers.sql` antes de la API y web. Son aditivas; no modifican historia existente ni ejecutan backfill. Probar primero en staging con un backup verificado. Las credenciales de servidor nunca llegan al navegador.

Verificar SELECT/INSERT para el rol de servidor, ausencia de UPDATE/DELETE/TRUNCATE, triggers habilitados y falta de acceso directo de anon/authenticated. La conexión de la API debe conservar los privilegios de servidor definidos por la instalación; no usar credenciales de navegador. Verificar la RLS y el rol efectivo antes de habilitar tráfico.

## Diagnóstico

- Un error al insertar auditoría revierte la acción original: buscar correlationId en logs técnicos, sin copiar payloads ni IP a logs. Revisar integridad de actor/contexto y cuenta/sucursal/máquina, estado de migraciones y disponibilidad PostgreSQL.
- 403: verificar `audit.read` o `audit.global-read`, ámbito, estado de membresía/contexto y MFA para global.
- 404 de detalle: evento inexistente o fuera del ámbito; no ampliar permisos para confirmar su existencia.
- 409 del BFF: la cuenta cambió en otra pestaña; recargar antes de consultar.
- Consulta lenta: comprobar plan por account_id/occurred_at_utc/id, filtros y volumen. El timeout es 15 s y el máximo 100 resultados por página.

La proyección conserva el ID del evento fuente. Para verificar una operación conocida, comparar ese ID y correlationId en `subscriptions.events`, `equipment.events` o `audit.security_events` y `audit.events`. Solo los eventos posteriores a la habilitación tienen proyección central; no considerar los anteriores como pérdida.

## Recuperación y límites

No deshabilitar triggers ni reintentar solo la auditoría fuera de la transacción original. Corregir el fallo y reintentar la acción con su idempotency key. No UPDATE/DELETE de evidencias. Si se retira el visor, conservar tablas y triggers. Revertir un productor requiere mantener la generación del evento fuente; preferir reparación hacia adelante.

Una conexión de superusuario puede alterar esquema y deshabilitar triggers: la inmutabilidad cubre DML normal, no administradores de infraestructura hostiles. No se define una retención destructiva. IP y dispositivo no capturados permanecen nulos; no inferir IP desde X-Forwarded-For sin una política de proxies confiables.

## Validación de salida

Comprobar una demo creada, un cambio de suscripción y una modificación de permisos. Confirmar evento central y rollback ante fallo. Consultar con dos cuentas, ámbitos limitados y administrador con/sin MFA. Revisar visor en escritorio/móvil, filtros, paginación, detalle y cambio de contexto. Véase [reporte y evidencia](../tasks/task-f5-04.md).
