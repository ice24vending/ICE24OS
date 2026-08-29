# Runbook — Health checks

- API: `/v1/health/live`, `/v1/health/ready` y alias `/v1/health`.
- Worker: puerto 3003, `/health/live` y `/health/ready`.
- PDF worker: puerto 3004, mismas rutas.

Liveness responde sólo por el proceso y no consulta proveedores. Readiness comprueba que el servicio puede recibir trabajo. Una dependencia necesaria degradada debe producir 503 sin incluir URL, credencial ni excepción. Los probes de base y cola se agregan junto con sus adaptadores; no se finge conectividad antes.
