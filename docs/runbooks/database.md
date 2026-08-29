# Runbook — PostgreSQL/PostGIS

Supabase PostgreSQL es la fuente de verdad. TLS es obligatorio; no se exponen credenciales al navegador. `postgis`, `pgmq` y `pg_cron` se habilitan mediante migraciones.

## Promoción

1. Aplicar primero Terraform y esperar que el proyecto esté saludable.
2. Vincular Supabase CLI al project ref del ambiente.
3. Ejecutar `supabase db push --include-all --linked`.
4. Verificar `select postgis_version();`, `select * from pgmq.list_queues();` y los jobs `ice24_*` en `cron.job`.
5. Confirmar que tablas `infra.*` tienen RLS y no conceden acceso a `anon` o `authenticated`.

Los cambios destructivos usan expand/contract. Nunca editar migraciones ya promovidas. Ante error se corrige con una migración nueva o se restaura en un proyecto de recuperación conforme al runbook de backup.
