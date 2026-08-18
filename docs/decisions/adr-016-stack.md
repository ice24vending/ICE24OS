# ADR-016 — Stack y política de versiones

- Estado: aceptada para iniciar Fase 1.
- Fecha: 17/08/2026.
- Responsable: Tech Lead.

## Decisión

Se confirma el stack del TRD: TypeScript estricto, pnpm workspaces y Turborepo; Next.js/React/App Router para PWA y portal público; NestJS para API y workers; REST/OpenAPI; PostgreSQL/PostGIS; Prisma más SQL explícito; Dexie/IndexedDB; Playwright para E2E/PDF; Testcontainers; Docker, Terraform y OpenTelemetry.

Se elige **Vitest** como único runner unitario por soporte directo de TypeScript/ESM, ejecución rápida y API compatible con Jest. Playwright seguirá siendo el runner E2E; no se mezclan responsabilidades.

Node.js se fija en la línea **24 LTS**. En agosto de 2026 Node 26 sigue como Current y Node 24 es LTS; producción sólo usará líneas LTS soportadas.

## Política

- Fase 1 fijará versiones exactas en `packageManager`, `.nvmrc`/mise, imágenes Docker y lockfile.
- Frameworks: último major estable compatible verificado por un spike; no RC, beta, canary ni early access en componentes críticos.
- Dependencias directas con rangos conservadores y lockfile obligatorio; imágenes por digest en producción.
- Renovación mensual y parches de seguridad críticos en 72 horas desde que exista corrección compatible.
- Cambio de major mediante PR dedicado, pruebas completas, notas de migración y rollback.
- Se revisa la línea Node seis meses antes de EOL; la actualización de runtime precede al fin de soporte.
- Prisma no gobierna PostGIS/RLS: migraciones y consultas SQL explícitas son parte soportada del stack.

## Alternativas descartadas

- Jest: maduro y habitual en NestJS, pero añade más transformación/configuración para un monorepo ESM moderno.
- Node 26: no es LTS en la fecha de decisión.
- Server Actions como API de negocio: impedirían el contrato independiente requerido.
- Microservicios: no existe evidencia de escala que justifique su costo.

Fuentes: TRD 18–20; Project Rules 5; [calendario oficial de Node.js](https://nodejs.org/en/about/previous-releases); [características de Vitest](https://main.vitest.dev/guide/features).
