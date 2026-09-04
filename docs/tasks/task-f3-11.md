# TASK-F3-11 — Deep links y resolución de contexto

- Estado: **Implementada**
- Entrega: resolución 401 sin identidad, 403 sin contexto/permiso y 404 para recurso ajeno, sin metadatos.
- Evidencia: `resolveProtectedResource` y opción `hideResourceExistence` del guard.
- Validación: matriz automatizada de cinco rutas.
- Riesgo: repetir E2E cuando existan recursos de negocio reales.
