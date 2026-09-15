# Estado de Fase 4 — Cuentas, sucursales, usuarios, equipos y plantillas

Fecha de revisión: 14 de septiembre de 2026.

## Resultado

**Habilitada para iniciar.** El gate de Fase 3 quedó `COMPLETADO Y APROBADO` en la corrida `F3-20260914-SCOPE-03`. La implementación funcional de F4-01 a F4-17 todavía no existe en el repositorio y debe comenzar por F4-01 respetando el orden de dependencias de `context/TASKS.md`.

## Revalidación local

- `pnpm check`: aprobado; formato, lint, tipos, límites del workspace, verificadores de infraestructura/identidad y 47 pruebas en 14 archivos.
- `pnpm build`: aprobado; 14/14 paquetes.
- `pnpm test:integration`: aprobado; 1/1 integración PostgreSQL/PostGIS con Docker.
- `supabase test db`: aprobado; 29/29 comprobaciones, incluidas 18/18 de identidad.

## Dependencias previas resueltas

1. Docker, integración y pgTAP se ejecutaron correctamente.
2. Supabase Auth local acreditó login negativo, MFA, revocación y recuperación.
3. El aislamiento multi-cuenta se comprobó por API/SQL y fue validado visualmente por el responsable.
4. Pentest externo, evaluación formal de accesibilidad y firmas departamentales quedaron eximidos para el alcance de entrega individual.

El expediente que acredita el gate anterior está en [F3-20260914-SCOPE-03](../qa/phase-3/evidence/F3-20260914-SCOPE-03/README.md).

El siguiente trabajo es F4-01: contratos privados, persistencia y API de cuenta titular. Después continúan sucursales, usuarios, catálogos, plantillas y máquinas conforme a `context/Implementation_Plan.md`.
