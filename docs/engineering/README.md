# Ingeniería de Fase 1

## Línea base fijada

| Componente             |      Versión |
| ---------------------- | -----------: |
| Node.js                |  24.19.0 LTS |
| pnpm                   |      11.19.0 |
| Turborepo              |      2.10.11 |
| TypeScript             |        6.0.3 |
| Next.js                |       16.3.1 |
| React                  |       19.2.8 |
| NestJS                 |       11.2.1 |
| Prisma                 |        7.9.1 |
| Vitest                 |       4.1.11 |
| Testcontainers         |       12.1.0 |
| OpenTelemetry API      |        1.9.1 |
| OpenTelemetry Node SDK |      0.221.0 |
| Terraform              | >=1.11, <2.0 |
| Vercel provider        |       5.11.0 |
| Supabase provider      |       1.10.1 |

TypeScript 7.0.2 fue evaluado y descartado temporalmente porque `typescript-eslint` 8.67 declara compatibilidad hasta `<6.1`. La combinación fijada se valida mediante instalación desde lockfile, tipos, pruebas y build.

## Límites de dependencias

- Las aplicaciones pueden importar paquetes; los paquetes no importan aplicaciones.
- `contracts` no conoce ORM, UI ni almacenamiento local.
- `domain` no tiene dependencias de framework o infraestructura.
- `authorization` niega por defecto y valida cuenta, acción y ámbito.
- `database` no exporta entidades Prisma como contratos.
- `offline` versiona su esquema y ofrece una operación explícita de limpieza protegida.

`pnpm check:boundaries` valida ciclos y dependencias internas prohibidas a partir de los manifiestos del workspace.

## Evaluación de dependencias

Se conservaron únicamente componentes del stack aprobado. Las dependencias directas están fijadas y el lockfile es obligatorio. Vercel es el runtime productivo aprobado; las imágenes de contenedor son artefactos locales/portables y un registry productivo futuro deberá fijarlas por digest.
