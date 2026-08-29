# ADR-021 — Aprovisionamiento seguro de Fase 2

- Estado: aceptada para implementación; activación remota condicionada.
- Fecha: 25/08/2026.
- Responsable técnico: Tech Lead.
- Aprobaciones externas requeridas: Dirección, Seguridad/Privacidad, Operación y responsable presupuestario.

## Decisión

Implementar Vercel y Supabase conforme al ADR-015 mediante Terraform 1.11, proveedor Vercel 5.11.0 y proveedor Supabase 1.10.1. Cada ambiente tiene raíz y estado HTTP independiente. Los ejemplos nunca crean recursos: `provision_cloud=false`. Producción exige además `production_approved=true` y un GitHub Environment con revisión humana.

Las capacidades PostgreSQL/PostGIS, Storage privado, Auth, PGMQ y pg_cron se aplican mediante una sola configuración de proyecto y migraciones SQL versionadas. Los workers persistentes no se despliegan en Vercel: la base usa pg_cron/PGMQ; cualquier cómputo persistente futuro exige ADR y presupuesto.

## Seguridad del estado y secretos

Terraform obtiene tokens y contraseñas sólo del entorno protegido. El backend HTTP debe cifrar en tránsito y reposo, soportar locking y tener control de acceso. No se permite estado local para staging o producción. Las contraseñas aparecen como sensibles en Terraform, pero siguen existiendo en el estado cifrado; por eso el backend es un gate obligatorio.

## Alternativas descartadas

- Aprovisionar AWS/RDS/SQS/WAF: contradice ADR-015 y el presupuesto aprobado.
- Guardar `.tfstate` en Git o artefactos: expone secretos y pierde locking confiable.
- Ejecutar workers persistentes en funciones: no respeta límites de ejecución.
- Marcar despliegue/restauración como exitosos sin cuentas ni evidencia: rompe la Definition of Done.

## Consecuencias

La base está lista para planear y promover, pero el alta real sigue siendo una operación externa deliberada. La región, residencia, términos comerciales, backend de estado, WAF pagado y proveedor OTLP se validan antes del primer apply.

