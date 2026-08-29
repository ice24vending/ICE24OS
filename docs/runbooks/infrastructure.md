# Runbook — Infraestructura Terraform

## Alcance y guardas

Cada raíz en `infra/terraform/environments` tiene estado HTTP separado. Los ejemplos usan `provision_cloud=false`; no cambiarlo en Git. Un apply autorizado lo inyecta desde un GitHub Environment. Producción requiere también `production_approved=true`.

## Preparación

1. Configurar un backend HTTP con TLS, cifrado en reposo, locking y credenciales de mínimo privilegio.
2. Exportar `TF_HTTP_ADDRESS`, endpoints de lock/unlock y credenciales sin escribirlos en archivos.
3. Exportar `SUPABASE_ACCESS_TOKEN`, `VERCEL_API_TOKEN` y variables `TF_VAR_*` descritas por `.github/workflows/deploy.yml`.
4. Verificar región, residencia, costo y términos antes de crear el primer proyecto.

## Validación segura

```bash
terraform -chdir=infra/terraform/environments/development init -backend=false
terraform -chdir=infra/terraform/environments/development validate
terraform fmt -check -recursive infra/terraform
```

Para un plan remoto usar el workflow Deploy con `apply=false`. Revisar altas, reemplazos, destrucciones y cambios de plan antes de promover.

## Fallos y rollback

- Fallo de settings inmediatamente después del alta: no recrear el proyecto; reintentar el mismo plan contra el estado bloqueado.
- Drift: ejecutar plan, investigar el cambio externo e importar o revertir deliberadamente.
- Apply parcial: conservar estado y plan, no borrar recursos manualmente.
- Rollback de aplicación: promover el deployment inmutable anterior de Vercel.
- Rollback de infraestructura: crear un plan inverso revisado; `prevent_destroy` protege proyectos Supabase.
