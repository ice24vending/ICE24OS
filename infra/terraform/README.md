# Infraestructura Terraform de ICE24 OS

La pila implementa ADR-015 y ADR-021 sobre Vercel y Supabase. No crea AWS, Kubernetes ni workers persistentes.

```text
environments/  raíces y estados separados para development, test, staging y production
stacks/        composición de la plataforma ICE24 OS
modules/       database, object-storage, messaging, identity, secrets,
               observability, backup, platform y edge
```

Todos los `terraform.tfvars.example` mantienen `provision_cloud=false`. Los secretos se inyectan desde ambientes protegidos y nunca se guardan en `.tfvars`. El backend HTTP con locking es obligatorio para uso remoto; staging y producción no admiten estado local.

Validación sin backend ni credenciales:

```bash
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform/environments/development init -backend=false
terraform -chdir=infra/terraform/environments/development validate
```

El procedimiento de plan, apply, promoción y rollback está en [`docs/runbooks/deployment.md`](../../docs/runbooks/deployment.md).
