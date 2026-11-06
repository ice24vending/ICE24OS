# Corrección del timeout de UI quality — PR #63

05/11/2026. Ajuste local, sin commit ni push.

## Diagnóstico

El [job 127041654776](https://github.com/ice24vending/ICE24OS/actions/runs/41965564726/job/127041654776), ejecutado por push a `main` sobre `26925727910cd40194a0e4ca5db721207d761dde`, no presentó un fallo de las pruebas: las 2078 pruebas finalizaron correctamente en 49,3 minutos. Los logs registran el inicio de `pnpm test:ui` a las 04:06:15 UTC y el resultado correcto a las 04:55:35 UTC. La galería comenzó a las 04:55:36 UTC y seguía capturando pantallas cuando GitHub canceló el job a las 05:05:12 UTC, al agotarse su límite global de 60 minutos. Los recorridos y la subida de artefactos no llegaron a ejecutarse.

## Cambio

- Tres grupos de pruebas con `--shard=1/3`, `2/3` y `3/3`, sin cancelar los otros grupos cuando uno falla.
- Galería y recorridos en un job independiente, sin consumir el presupuesto de las pruebas.
- Se conserva el nombre obligatorio `ui-quality` como agregador: solo pasa si todos los grupos y las evidencias terminan correctamente; fallo, cancelación u omisión bloquean el resultado.
- Reportes por grupo y subida de artefactos con `always()`. Límites por paso de 45 minutos para pruebas, 40 para galería y 10 para recorridos; cada job mantiene su límite de 60 minutos.
- Sin cambios en baselines, aserciones, reintentos, cantidad de workers o tolerancias de comparación.

Se utiliza el [sharding oficial de Playwright](https://playwright.dev/docs/test-sharding) y las dependencias y condiciones de [GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

## Validación local

- `actionlint` valida el workflow sin errores.
- Inventario real de Playwright: 721 + 721 + 720 = 2162 pruebas en el árbol actual P4/P5/P6; la unión coincide con la suite completa, sin omisiones ni duplicados.
- La suite completa de este árbol ya pasó en Linux: 2162 pruebas, 15,3 minutos; galería de 1224 capturas y ocho recorridos correctos. Véase [validación de ejecución y offline](execution-offline-validation.md). Estas ejecuciones validan el producto, no simulan el rendimiento de los runners de GitHub.

La corrección requiere publicarse para validar sus tiempos reales en GitHub. No se relanzó el workflow antiguo: un reintento seguiría usando la definición que acumula pruebas y galería en un solo presupuesto. El check remoto cancelado no cambia de estado por esta corrección local.
