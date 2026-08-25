# TASK-F1-09 — Pruebas unitarias e integración

- Estado: implementada; ejecución de integración pendiente por Docker.
- Archivos principales: `vitest.config.ts`, `vitest.integration.config.ts`, `tests/integration/postgis.test.ts`, pruebas junto a paquetes.
- Criterios cubiertos: Vitest como único runner unitario; Testcontainers usa PostGIS real efímero; no hay delays arbitrarios.
- Validación: 8 archivos y 16 pruebas unitarias pasan. La integración falla antes del test con `Could not find a working container runtime strategy`.
- Riesgo: el primer pull request debe demostrar la prueba PostGIS en GitHub Actions antes de merge.
- Deuda: ninguna; el fallo de infraestructura no fue convertido en skip o mock.
