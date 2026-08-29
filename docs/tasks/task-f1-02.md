# TASK-F1-02 — Aplicaciones base

- Estado: implementada; auditoría WCAG formal pendiente.
- Archivos principales: `apps/private-web`, `apps/public-portal`, `apps/api`, `apps/worker`, `apps/pdf-worker`.
- Criterios cubiertos: cinco builds independientes; PWA responsive con carga, vacío, error, permiso y lectura; portal aislado; API `/v1`; workers con log estructurado.
- Validación: build 14/14; PWA y portal responden HTTP 200 y fueron revisados a 1440×900 y 390×844 sin desbordamiento horizontal; API health/OpenAPI responden 200; ambos workers arrancan y exponen readiness 200.
- Seguridad: el service worker no cachea requests ni datos protegidos y la superficie pública no consume datos privados.
- Pendiente manual: auditoría formal de teclado, contraste y zoom/reflow para declarar WCAG 2.2 AA; la evidencia visual automatizada de escritorio y móvil ya fue completada.
