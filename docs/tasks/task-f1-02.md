# TASK-F1-02 — Aplicaciones base

- Estado: implementada; evidencia visual manual pendiente.
- Archivos principales: `apps/private-web`, `apps/public-portal`, `apps/api`, `apps/worker`, `apps/pdf-worker`.
- Criterios cubiertos: cinco builds independientes; PWA responsive con carga, vacío, error, permiso y lectura; portal aislado; API `/v1`; workers con log estructurado.
- Validación: build 14/14; PWA y portal responden HTTP 200; API health/OpenAPI responden 200; ambos workers arrancan y cierran con código 0.
- Seguridad: el service worker no cachea requests ni datos protegidos y la superficie pública no consume datos privados.
- Pendiente manual: teclado, contraste, zoom/reflow y capturas en móvil/tableta/escritorio. El navegador automatizado local no abrió por permisos del entorno.
