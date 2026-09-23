# Verificación pública de Vercel

## Estado vigente tras redeploy

Verificación del 23/09/2026 a las 17:19:05–17:19:06 UTC contra `https://ice-24-os-api.vercel.app`:

| Ruta             | HTTP | Resultado                                 |
| ---------------- | ---- | ----------------------------------------- |
| /v1/health       | 200  | runtime=ok; configuration=ok; service=api |
| /v1/health/live  | 200  | process=ok; service=api                   |
| /v1/health/ready | 200  | runtime=ok; configuration=ok; service=api |
| /                | 404  | JSON de aplicación: Cannot GET /          |

Comando utilizado para cada ruta: `curl.exe -sS -i --max-time 25 https://ice-24-os-api.vercel.app<RUTA>`.

Identificador de health: `cle1::iad1::8zlns-1790183945086-d52bd3592b43`. Correlación: `1fd1603c-7139-4b59-a065-51e58303cfd4`. Timestamp del cuerpo: `2026-09-23T17:19:05.184Z`.

El fallo HTTP 500 de arranque no se reproduce en estas comprobaciones. La captura del responsable muestra el nuevo despliegue Ready del commit 4211d6e, en el entorno Vercel Production utilizado como Preproducción. El responsable reporta SUPABASE_URL configurada con el proyecto kuovqjekmootoaotmebh. No se inspeccionaron las variables privadas de Vercel.

Alcance: el controlador de salud devuelve comprobaciones de proceso/configuración sin consultar PostgreSQL o Storage. Este resultado no acredita migraciones, IAM/RBAC en destino, antivirus, backup ni RPO/RTO. La captura de Supabase muestra No migrations; debe verificarse el estado real de migraciones antes de aprobar el ambiente funcional.

Las entradas siguientes son el historial anterior al redeploy, no el estado vigente.

Consulta real: 2026-09-23 16:53:22 UTC.

Endpoint: https://ice-24-os-api.vercel.app/v1/health

Comando: `curl.exe --max-time 25 -sS -i https://ice-24-os-api.vercel.app/v1/health`

Resultado: HTTP 500 Internal Server Error.

Encabezado `X-Vercel-Error`: `FUNCTION_INVOCATION_FAILED`.

Identificador Vercel: `cle1::sl5j6-1790182402809-7519ac84a936`.

La captura aportada muestra Ready, commit 4211d6e y Environment Production. El responsable denomina el ambiente Preproducción. Esta diferencia requiere aclaración de uso y configuración; no demuestra por sí sola un error de despliegue.

El endpoint de salud falló en esta consulta. Se requieren los Runtime Logs para determinar la causa. Las advertencias de compilación no permiten atribuir la causa del HTTP 500.

La información de respaldo contiene placeholders y ejemplos, no un archivo o snapshot identificable ni un registro de restauración. RPO y RTO no medidos.

La designación vigente del responsable confirma a Eduardo como Sponsor / Dirección y a Calixto Isaac Galeana Medrano como Liderazgo Técnico / QA / SecOps / Becario a cargo.

## Revalidación pública

Consulta real: 2026-09-23 16:57:08 UTC.

Comando: `curl.exe -sS -i --max-time 25 https://ice-24-os-api.vercel.app/v1/health`

Resultado: HTTP 500 Internal Server Error. Encabezado `X-Vercel-Error`: `FUNCTION_INVOCATION_FAILED`.

Identificador: `cle1::d9rh6-1790182628794-0cc6fc5f30b4`.

El fallo persiste. La captura de Ready acredita el estado del despliegue mostrado, no la salud de la función. No se atribuye el fallo a las advertencias de build sin inspeccionar Runtime Logs.

## Diagnóstico con Runtime Logs aportados

El archivo JSONL aportado contiene 17 registros del despliegue `dpl_AXS1sodSej2DziLgHjfPk9FUZnCu`. El request `d9rh6-1790182628794-0cc6fc5f30b4` coincide con la comprobación pública y registra `SUPABASE_URL is required in staging and production`, originado en `parseServiceConfig` durante `createHandler`. El esquema local convierte cadena vacía en undefined y rechaza su ausencia en staging/production: la variable no está disponible con valor en ese despliegue.

Los registros de la ruta raíz también muestran `No exports found in module /var/task/apps/api/src/main.js`. Debe revisarse la selección de entrypoint si persiste tras corregir la configuración; no se acredita todavía resolución del arranque.

Acción inmediata: configurar la URL real del proyecto Supabase en las variables de entorno de `ice-24-os-api`, con alcance Production porque ese es el entorno Vercel del despliegue observado, y crear un nuevo despliegue. Revalidar `/v1/health` y Runtime Logs. No sustituir la validación por modo development ni utilizar una URL ficticia. Esta corrección continúa pendiente de ejecución y comprobación.

F4-12 corresponde a traslados, retiro y transferencia; F4-15 a paneles centrales; F4-16 a UI/UX y accesibilidad. Una prueba de recuperación no sustituye la evidencia funcional pendiente de esos criterios.
