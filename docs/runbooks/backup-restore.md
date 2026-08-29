# Runbook — Backup y restauración

Objetivo provisional: RPO 15 minutos, RTO 4 horas para base; objetos críticos RPO 24 horas y RTO 8 horas. Requiere aprobación final de ADR-018.

## Base de datos

1. Crear un proyecto de recuperación vacío y aislado.
2. Obtener conexiones de pooler de origen/destino desde secretos.
3. Generar dumps separados de roles, esquema y datos con Supabase CLI.
4. Restaurar con `psql --single-transaction --set ON_ERROR_STOP=on`.
5. Restaurar historial de `supabase_migrations`, configuración Auth/Storage y verificar extensiones.
6. Comparar conteos, constraints, checksum de fixtures sintéticos y smoke tests.

## Objetos

Inventariar cada objeto con bucket, nombre, versión, tamaño y SHA-256 en `infra.object_backup_manifest`. Copiar a un proyecto de recuperación conservando bucket y metadatos; comparar manifiestos antes de autorizar uso.

## Criterio de aprobación

Usar sólo datos sintéticos. Registrar timestamps, RPO/RTO medidos, comandos/versiones, checksums, defectos y responsables. La prueba falla si falta un objeto, hay checksum distinto, una migración no está aplicada o se excede el objetivo. Nunca restaurar sobre producción.
