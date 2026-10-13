# Galería de revisión UX (salida generada)

`pnpm ux:snapshots` escribe aquí `index.html`, `manifest.json` y las capturas en `img/`. Ninguno de esos archivos se versiona (están en `.gitignore`):

- Son binarios que cambian con cada ajuste visual (≈ 6 MB por corrida, 105 capturas en P0) y harían crecer el repositorio en cada PR.
- Se regeneran en cada PR: el job `ux-review` de CI los publica como artefacto `ux-review-gallery` (30 días).
- La comparación contra una referencia aprobada (regresión visual) es responsabilidad de F6-12, con sus propias baselines.

La lista de pantallas, estados y tamaños está en [`tests/visual/ux-review.routes.ts`](../../../../tests/visual/ux-review.routes.ts); la guía para revisores, en [QA de Fase 6](../README.md).
