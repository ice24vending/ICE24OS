# Runbook — Despliegue y promoción

El workflow Deploy ejecuta plan o promoción sobre un GitHub Environment protegido. Development, test, staging y production usan estados y secretos separados.

## Promoción

1. Ejecutar quality e infrastructure CI.
2. Lanzar Deploy con el ambiente y `apply=false`.
3. Revisar plan, costo esperado y cambios destructivos.
4. Obtener revisión del ambiente; para producción validar `PRODUCTION_APPROVED=true`.
5. Repetir con `apply=true` desde `main`.
6. Verificar health, dashboard, OIDC discovery y migraciones.
7. Registrar deployment IDs y resultado en evidencia operativa.

Vercel despliega por la integración Git conectada. Terraform administra proyectos, dominios y firewall; Supabase CLI promueve migraciones.

## Rollback

Promover el deployment Vercel anterior. Las migraciones compatibles permanecen; usar expand/contract. Si la escritura nueva dañó datos, bloquear tráfico y seguir backup/restore hacia un proyecto de recuperación. Nunca usar `terraform destroy` como rollback.
