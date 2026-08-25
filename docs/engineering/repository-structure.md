# Estructura del repositorio

```text
apps/       private-web, public-portal, api, worker, pdf-worker
packages/   contracts, ui, domain, authorization, database, offline,
            config, observability, testing
infra/      contenedores y, desde Fase 2, infraestructura desplegable
supabase/   configuración y migraciones del entorno local
tests/      integraciones que atraviesan dependencias reales
docs/       decisiones, contratos, runbooks, plantillas y reportes
```

Cada aplicación compila y arranca de forma independiente. Los módulos de negocio futuros deben usar `domain → application → infrastructure/interface` dentro de su dominio, siguiendo `context/PROJECT_RULES.md`.
