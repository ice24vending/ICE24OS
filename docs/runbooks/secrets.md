# Runbook — Secretos y rotación

Git contiene únicamente nombres de secretos. Los valores viven en GitHub Environments y en los almacenes protegidos de Supabase/Vercel. El estado Terraform remoto también es sensible.

## Rotación

1. Crear credencial nueva con mínimo privilegio.
2. Guardarla en el ambiente protegido sin eliminar la anterior.
3. ejecutar plan/deploy y comprobar readiness, trazas y errores;
4. revocar la anterior;
5. registrar actor, fecha, alcance y siguiente vencimiento.

Cadencia: 90 días en producción y 180 días fuera de producción, o inmediatamente tras sospecha. Tokens nunca se pasan por argumentos visibles, logs, comentarios, artefactos o `.tfvars`. Gitleaks y `check:infra` son gates, no sustituyen la revisión.
