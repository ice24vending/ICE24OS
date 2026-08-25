# Runbook — Desarrollo local

## Prerrequisitos

- Node.js 24.19.0 y pnpm 11.19.0 mediante Corepack.
- Docker Desktop activo para Supabase, mocks y Testcontainers.
- Puertos libres: 3000, 3001, 3002 y 54320–54324; WireMock usa 9080.

## Preparación

```bash
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

Copiar `.env.example` a `.env` únicamente si se usa el contenedor PostGIS alternativo. El valor `LOCAL_POSTGRES_PASSWORD` debe ser local, desechable y nunca reutilizado o registrado en Git.

## Dependencias locales

Supabase local es la opción principal y suministra PostgreSQL/PostGIS, Auth, Storage, Studio e Inbucket:

```bash
pnpm local:infra
pnpm local:infra:stop
```

WireMock simula adaptadores HTTP sin usar credenciales de proveedores:

```bash
pnpm local:mocks
docker compose --profile mocks down
```

PostGIS independiente es una alternativa de diagnóstico:

```bash
docker compose --profile database up -d
docker compose --profile database down
```

## Aplicaciones

```bash
pnpm dev:private
pnpm dev:api
pnpm dev:public
pnpm --filter @ice24/worker dev
pnpm --filter @ice24/pdf-worker dev
```

La aplicación privada queda en `http://127.0.0.1:3000`, la API en `http://127.0.0.1:3001/v1/health`, OpenAPI en `/v1/docs` y el portal público en `http://127.0.0.1:3002`.

## Pruebas de integración

`pnpm test:integration` crea y elimina un contenedor efímero PostGIS. Si falla antes de iniciar, confirmar que Docker responde a `docker version`; no se debe convertir la prueba en mock.

## Fallos y recuperación

- Puerto ocupado: detener el proceso conflictivo; no cambiar puertos compartidos sin actualizar contratos.
- Supabase inconsistente: ejecutar `supabase stop --no-backup` sólo sobre el proyecto local y volver a iniciar. Esto elimina datos locales desechables.
- Migración PostGIS: verificar `select postgis_version();`. Su reversión sólo consiste en eliminar la extensión cuando no existen objetos dependientes; en caso contrario, restaurar el volumen local desechable.
- Datos protegidos en navegador: cerrar sesión deberá invocar la limpieza de `@ice24/offline`; durante Fase 1 no se cachean requests autenticados.

Nunca copiar datos o secretos de producción a este entorno.
