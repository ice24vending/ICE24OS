# Corrección del empaquetado de Vercel — PR #63

Fecha: 04/11/2026. Despliegue fallido: `dpl_ENcegsXGX18EonTa2GcN4WXHCeWu`, commit `a5068ce`.

## Diagnóstico

Las ocho tareas de build finalizaron correctamente. La compilación posterior del empaquetador Node de Vercel falló con `NODE_TYPESCRIPT_ERROR` / `TS2339` en `work-orders.store.ts`, líneas 483, 484 y 604: no reconocía `code` y `message` en la variante rechazada del resultado de `evaluateWorkOrderTransition`. El typecheck local, incluido `tsconfig.vercel.json`, no reproducía el fallo.

Se sustituyen las dos comprobaciones por comprobaciones estructurales con `in`: `code` identifica el resultado rechazado y `message` permite obtener su explicación. Se conserva la unión tipada y no se añaden casts, `any` ni supresiones del compilador. No cambian los permisos, las transiciones permitidas ni las excepciones HTTP.

## Validación antes de publicar

- `pnpm --filter @ice24/api typecheck`: aprobado, incluido el entrypoint de Vercel.
- `pnpm check`: aprobado; 943 pruebas en 120 archivos y cero warnings de ESLint.
- Pruebas específicas de estados, diagrama y contratos: 86 aprobadas.
- Integración de órdenes con PostgreSQL: 14 aprobadas. El primer intento no pudo arrancar porque Docker estaba detenido; se inició Docker y se repitió correctamente.
- `pnpm --filter @ice24/api... build`: compilación de API y dependencias.

La verificación definitiva es el nuevo despliegue Git de este PR. Su resultado y URL se registran en la descripción del PR. Los avisos de variables de entorno de Turbo observados en el log original son distintos del error TS2339; no se agregan secretos a la configuración de build para ocultarlos.
