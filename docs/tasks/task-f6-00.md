# TASK-F6-00 — Arranque de Fase 6 y sala de revisión UX

Estado: implementada el 10/10/2026 en la rama `feat/f6-00-ux-review-harness`, creada desde `main` `700bff2`. PR por abrir. No implementa tokens ni componentes nuevos (F6-01 en adelante).

## Objetivo

Preparar la Fase 6 y dar a personas no técnicas tres formas de ver y manipular las pantallas: galería de capturas, catálogo Storybook y la aplicación en modo demo con personas ficticias.

Fuentes: [prompts de Fase 6](../backlog/phase-6-prompts.md) (P0), `context/Implementation_Plan.md` (Fase 6), `context/TASKS.md` (TASK-F6-01 a F6-12), `context/UI_UX.md`, `context/AppFlow.md`, `context/PROJECT_RULES.md`, [estado de Fase 5](../backlog/phase-5-status.md) y [F5-15](task-f5-15.md).

## Entregables

| #   | Entregable                       | Resultado                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `docs/backlog/phase-6-status.md` | [Estado de Fase 6](../backlog/phase-6-status.md): secuencia P0–P10, dependencias, paralelismo, decisiones abiertas y tabla de estado                                                                                                                                                                                                                                                               |
| 2   | Storybook                        | Storybook 10.6.1 con React + Vite 8.3.0 en `.storybook/`; historias de `packages/ui/src` y `apps/private-web/src`; complementos de documentación y accesibilidad; controles y viewports (Móvil 375, Tableta 768, Escritorio 1280 y 1440) del núcleo. Scripts `pnpm storybook` y `pnpm storybook:build` (`storybook-static/`, ignorado). Historia de ejemplo `Base/StatusPanel` con cinco variantes |
| 3   | Modo demo                        | `apps/private-web/src/server/demo` y `src/features/demo`: activado solo con `ICE24_DEMO_MODE=1` y bloqueado con `NODE_ENV=production` o `VERCEL_ENV=production`. Cinco personas, dos cuentas, panel flotante «Demo» (persona, cuenta, sucursal, modo de cuenta y conexión). Documentado en `.env.example`                                                                                          |
| 4   | `pnpm ux:snapshots`              | `scripts/ux-snapshots/run.ts`: levanta la web privada en modo demo, recorre `tests/visual/ux-review.routes.ts` (9 pantallas, 35 estados) × 3 viewports y genera `docs/qa/phase-6/ux-review/index.html` con 105 capturas                                                                                                                                                                            |
| 5   | CI                               | Job `ux-review` en `.github/workflows/ci.yml`: compila, ejecuta `ux:snapshots` y `storybook:build`, y sube los artefactos `ux-review-gallery` y `storybook-static` (30 días)                                                                                                                                                                                                                       |
| 6   | `docs/qa/phase-6/README.md`      | [Guía para directivos](../qa/phase-6/README.md): cómo abrir cada herramienta y qué validar                                                                                                                                                                                                                                                                                                         |
| 7   | Este reporte                     | —                                                                                                                                                                                                                                                                                                                                                                                                  |

## Diseño del modo demo

El modo demo no crea una lógica paralela de permisos ni un segundo camino de autenticación; se conecta en los dos puntos por los que ya pasa toda la web privada:

- **Sesión** (`readBrowserSession`): si el modo está activo y existe la cookie `ice24_demo`, devuelve una sesión de la persona elegida. Fuera del modo la cookie se ignora y se usa la sesión cifrada real.
- **API** (`callPrivateApi`): si la sesión es de demo y el modo está activo, responde `demoApiResponse` en el mismo proceso en lugar de llamar a la API. El token de demo (`ice24-demo.` + estado) nunca sale del servidor; fuera del modo se enviaría a la API real, que lo rechaza.

Cada respuesta se decide con `authorize()` de `@ice24/authorization`, con el sujeto que construiría la API (rol, alcance de cuenta, sucursal o máquina, modo de la cuenta y MFA). Los permisos de cada rol son copia de los que siembran las migraciones (`authz.role_permissions`); `personas.test.ts` lee las migraciones y falla si difieren (se comprobó agregando un permiso indebido al Técnico). Los indicadores de equipos (`equipment-workspace`) replican `configurationAccess` de la API con el mismo `authorize()`.

| Persona del panel         | Rol  | Alcance                               |
| ------------------------- | ---- | ------------------------------------- |
| Dueño                     | `OW` | Cuenta completa                       |
| Administrador de sucursal | `OP` | Sucursal asignada (RA-01-D2)          |
| Técnico                   | `TC` | Máquinas de la sucursal asignada      |
| Solo lectura              | `AU` | Cuenta completa, sin escritura        |
| Operador ICE24            | `IO` | Cuenta completa con permisos de ICE24 |

Rutas de la API cubiertas: contexto actual y lista de contextos, perfil y sesiones, suscripción, auditoría (cuenta y global), trabajos (lista, detalle, colas), logs de integración, avisos (resumen y lista), y de equipos `equipment-workspace`, `branches`, `machines`, `technical-models`, `catalogs`, `equipment-requests`, `machine-transfers`, `account-users` y `accounts/{id}`. Cualquier otra ruta responde 404. Las escrituras se autorizan igual que en la API (403 `FORBIDDEN` o `ACCOUNT_READ_ONLY`), pero si se permiten **no se guardan**: responden 503 `DEPENDENCY_UNAVAILABLE` y la pantalla muestra su estado de servicio no disponible.

Simulación de red: «Carga lenta» retrasa 2.5 s las lecturas de datos (no las del shell, ver hallazgo H1); «Error del servicio» responde 503; «Sin conexión» hace fallar la llamada como una red caída y fija `navigator.onLine` en falso en el navegador, de modo que aparece el aviso real de sin conexión.

Cambiar de cuenta desde «Cambiar de cuenta» y cerrar sesión también funcionan en demo (`/api/session-context` y `/api/auth/logout` actualizan o borran la cookie de demo sin llamar a la API).

## Decisiones

- **Capturas no versionadas.** `img/`, `index.html` y `manifest.json` de la galería están en `.gitignore`: ≈ 6 MB de binarios por corrida que cambiarían en cada PR. CI los publica como artefacto. Ver [README de la galería](../qa/phase-6/ux-review/README.md).
- **Storybook con React + Vite**, sin el framework de Next.js: las historias deben ser de componentes presentacionales. Las pantallas que usan router o datos de servidor se revisan en el modo demo.
- **El modo demo solo funciona con `next dev`.** La regla pedida (bloqueo con `NODE_ENV=production`) lo impide en cualquier compilación, incluida la URL de Preview de Vercel. Queda como decisión abierta en el estado de la fase.
- **Suspendida = todo denegado.** `authorize()` niega cualquier operación con la cuenta suspendida; el demo lo refleja (perfil y contexto incluidos), igual que lo haría la API con ese sujeto.
- **`typecheck:review`** (`tsconfig.review.json`) revisa tipos de `.storybook`, historias, `tests/visual` y el script de la galería; se agregó a `pnpm check`. Las historias se excluyen de la compilación de `@ice24/ui`.

## Hallazgos de UX para tareas siguientes

| ID  | Hallazgo                                                                                                                                                                                                                                | Tarea sugerida |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| H1  | El layout de cuenta espera el contexto y dos consultas de permiso antes de enviar la página. Si esas lecturas son lentas, la pantalla queda en blanco y los `loading.tsx` existentes nunca se ven (el contenido llega junto con ellos). | F6-06, F6-10   |
| H2  | El menú muestra «Suscripción» y «Archivos privados» a cualquier rol; el Técnico ve «sin permiso» al abrir Suscripción.                                                                                                                  | F6-07          |
| H3  | En móvil la navegación ocupa varias filas y el encabezado de equipos repite «Perfil · Cambiar cuenta».                                                                                                                                  | F6-06          |
| H4  | La pantalla de equipos usa su propia barra de pestañas y botones, distintos de los del shell.                                                                                                                                           | F6-03, F6-09   |

## Archivos

- Nuevos: `.storybook/main.ts`, `.storybook/preview.ts`, `.storybook/env.d.ts`, `tsconfig.review.json`, `packages/ui/src/status-panel.stories.tsx`, `apps/private-web/src/server/demo/{mode,personas,fixtures,state,session,api}.ts` y sus pruebas `{personas,api,gate}.test.ts`, `apps/private-web/src/features/demo/{demo-panel.tsx,demo-panel.css,demo-slot.tsx}`, `apps/private-web/src/app/api/demo/route.ts`, `scripts/ux-snapshots/{run,gallery}.ts`, `tests/visual/ux-review.routes.ts`, `docs/backlog/phase-6-status.md`, `docs/qa/phase-6/README.md`, `docs/qa/phase-6/ux-review/README.md`, este reporte.
- Modificados: `apps/private-web/src/server/session/session.ts` y `supabase-auth.ts` (puntos de conexión del demo), `apps/private-web/src/app/layout.tsx` (panel), `page.tsx` (`/?demo=1` y enlace al demo), `api/session-context/route.ts` y `api/auth/logout/route.ts` (cuenta y salida en demo), `apps/private-web/package.json` (`@ice24/authorization`), `package.json` (scripts y dependencias de Storybook, Vite y React en la raíz), `pnpm-lock.yaml`, `vitest.config.ts` (alias de `@ice24/authorization`), `packages/ui/tsconfig.json`, `.github/workflows/ci.yml`, `.gitignore`, `eslint.config.mjs` (ignora `storybook-static/`), `.env.example`, `docs/tasks/README.md`, `docs/backlog/README.md`.
- También se versiona `docs/backlog/phase-6-prompts.md`, que estaba sin seguimiento.

## Pruebas

| Archivo                | Qué demuestra                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gate.test.ts` (23)    | Matriz de activación (falta la variable, valor distinto de `1`, `NODE_ENV=production`, `VERCEL_ENV=production`). Fuera del modo: la cookie de demo no da sesión, un token de demo va a la API real y `/api/demo` responde 404. Dentro: sin cookie no hay sesión; el panel exige CSRF y mismo origen; solo acepta personas y cuentas ficticias; no redirige fuera del sitio; salir borra la cookie                      |
| `api.test.ts` (43)     | Todas las respuestas de las 30 combinaciones persona × cuenta × modo cumplen los esquemas de `@ice24/contracts`. Autorización: suscripción solo para Dueño e ICE24, auditoría para Dueño y Auditor, auditoría global para nadie, alcance por sucursal, configuración RA-01-D2 por rol, escrituras denegadas con los códigos de la API, aislamiento entre cuentas, alerta crítica solo para el Dueño. Simulación de red |
| `personas.test.ts` (7) | Los permisos de cada rol coinciden exactamente con los sembrados por las migraciones, con su clasificación                                                                                                                                                                                                                                                                                                             |

## Validación ejecutada

Entorno: Windows 11 Pro, Node 24.19.0, pnpm 11.24.0, Chromium de Playwright 1.62.1.

| Comando                                       | Resultado                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | Código 0. Prettier, ESLint sin advertencias, typecheck (21 tareas), `typecheck:review`, fronteras (14 workspaces), infraestructura, identidad y Vitest con 536 pruebas en 78 archivos (antes 463 en 75)                                                                                                                                                                    |
| `pnpm build`                                  | Código 0; 14 de 14 tareas (también con `ICE24_STORAGE_ORIGIN`)                                                                                                                                                                                                                                                                                                             |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Código 0; 145 pruebas en 19 archivos con Chromium, tras compilar con `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329` como CI. Una primera corrida con una compilación sin esa variable falló en las 2 pruebas de carga directa al almacenamiento (CSP `connect-src`); no es un efecto de este cambio. La suite reescribe capturas de evidencia de Fase 5, que se restauraron |
| `pnpm ux:snapshots`                           | Código 0; 105 capturas sin observaciones (sin errores de página, sin respuestas 5xx, estados de carga visibles)                                                                                                                                                                                                                                                            |
| `pnpm storybook:build`                        | Código 0; la historia `Base/StatusPanel` se abrió en Chromium sin errores                                                                                                                                                                                                                                                                                                  |

## Riesgos

- **Desfase de permisos**: si una migración futura cambia un permiso, `personas.test.ts` falla hasta actualizar la copia del demo. Es intencional.
- **Cobertura parcial de rutas**: el expediente de máquina (calendario, componentes, frecuencias, historial) y las pantallas de administración de ICE24 responden 404 en el demo; muestran «Recurso no disponible en este contexto».
- **Escrituras sin efecto**: el demo no guarda cambios; flujos como «aceptar la advertencia de garantía» solo pueden revisarse hasta el envío.
- **`next dev` modifica archivos del repositorio**: reescribe `apps/private-web/next-env.d.ts` (el script de la galería lo restaura) y crea `apps/private-web/AGENTS.md` y `CLAUDE.md` (no incluidos en este cambio).

## Deuda

- Escrituras en memoria por sesión de demo para revisar flujos completos (por ejemplo, F6-11 cambios no guardados).
- Fixtures del expediente de máquina y de las vistas de ICE24.
- Filtros e índice navegable de la galería (F6-05) y comparación visual con baselines (F6-12).

## Validación manual pendiente

1. Revisión de la galería y del panel Demo por dirección, con los cinco puntos de la [guía](../qa/phase-6/README.md#qué-deben-validar-en-esta-etapa-p0).
2. Primera ejecución del job `ux-review` en CI y descarga de ambos artefactos.
3. Abrir `storybook-static/index.html` con doble clic; si el navegador lo bloquea, documentar la alternativa (`pnpm storybook`).
4. Decidir si el modo demo debe funcionar en la URL de Preview de Vercel.
