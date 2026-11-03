# F7 — Validación con Docker

02/11/2026. Docker iniciado manualmente por el usuario; daemon 29.7.2 disponible. No se hicieron commits, push ni cambios en entornos remotos. Los contenedores de integración usan bases temporales de Testcontainers.

## Resultados

- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: **154 pruebas aprobadas en 19 suites**. Log: `evidence/20261102-integration-docker-verified.txt`.
- `pnpm check`: **810 pruebas aprobadas en 110 archivos**, además de formato, lint y comprobaciones estáticas. Log: `evidence/20261102-check-docker-followup.txt`.
- `pnpm test:ui:update -- --workers=8`: **1687 pruebas aprobadas**, sin fallos ni reintentos; 976 baselines Linux. Log: `evidence/20261102-ui-update-linux-verified.txt`.
- `pnpm test:ui -- --workers=8`: **1687 pruebas aprobadas**, sin fallos ni reintentos, en la comparación final. Log: `evidence/20261102-ui-linux-verified.txt`.

## Ajustes verificados

La prueba heredada de configuración de módulos esperaba únicamente equipment/files; ahora incluye maintenance y conserva las verificaciones de permiso, versión, aislamiento y auditoría.

El recorrido móvil esperaba contenido visible antes de ejecutar axe, pero el botón Filtros aún podía estar cambiando del estado deshabilitado de SSR al habilitado. La prueba ahora espera explícitamente que ese control esté habilitado, tanto tras recargar como tras navegar al calendario. No se excluyeron reglas ni se alteraron umbrales. El escenario pasó tres veces consecutivas en Linux, sin reintentos, antes de reiniciar la suite completa.

## Entorno y conservación

Imagen de CI: `mcr.microsoft.com/playwright:v1.62.1-noble`, Node 24.19.0, pnpm 11.24.0 y lockfile congelado. Se usan ocho workers en las ejecuciones completas locales, con los mismos casos y umbrales de CI.

Antes de generar, se guardaron las 486 baselines originales en `tmp/f7-baselines-before-20261102-184506.zip`. La nueva matriz comprende 976 capturas. Las baselines generadas requieren aprobación UX; un resultado automatizado no constituye firma de Dirección ni cierra EXC-F6-01.

Se conservan los logs de los intentos iniciales. El primer intento de integración tuvo una expectativa desactualizada; el primer intento visual se interrumpió después de diagnosticar el recorrido móvil para reiniciar con la corrección incluida. Los resultados válidos se registran en los logs terminados en `verified` y en la comparación final.

La generación añadió 490 baselines, modificó 307 y conservó 179 sin cambios. Requiere aprobación UX. Se revisó visualmente una muestra del calendario Linux a 1440 px.

La integración regeneró 22 capturas históricas de F5/F6 que estaban limpias al inicio. Se conservaron las nuevas en evidence/integration-captures/ y se restauraron los archivos históricos a su contenido inicial. Las baselines solicitadas en tests/visual/**screenshots** conservan su actualización Linux.
