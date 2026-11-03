# Fase 7 — Prompts modulares para Claude Code / Codex

Guía para completar la **Fase 7 — Mantenimiento, tickets, órdenes y offline operativo** (TASK-F7-01 a F7-17) y cerrar los pendientes heredados de la Fase 6. Cada prompt es independiente: abre una sesión nueva del agente (Claude Code o ChatGPT Codex) en la raíz del repo `ICE24OS` y pega el bloque completo. Cuando el agente termine y todo esté en verde, pégale el bloque **Push** que viene debajo de cada prompt.

**Criterio de salida de la fase** (Implementation_Plan): _un técnico puede descargar una orden, completarla sin internet, adjuntar evidencia, sincronizarla, detectar un conflicto y obtener un cierre auditado sin duplicar actividades._ Además, el gate no se aprueba mientras siga vigente la excepción **EXC-F6-01**.

## Antes de empezar

1. La rama `docs/f6-carryover-tasks` (pendientes de la Fase 6 añadidos a TASKS.md) debe estar **integrada en `main`**. Si no lo está: crea su PR, haz merge y luego `git checkout main; git pull`.
2. No dejes cambios sin commit en tu copia local antes de abrir un prompt (`git status` limpio).
3. Si usas **Codex en la nube**, primero tiene que estar en GitHub todo lo que el prompt necesita (haz merge del PR anterior). Si Codex no puede ejecutar alguna validación en su sandbox (Docker, Supabase local, navegador), debe decirlo y tú la corres localmente: **nunca se da por verde algo que no se ejecutó**.

## Orden y paralelismo

| Prompt | Tareas                                                                  | Depende de      | ¿En paralelo?   |
| ------ | ----------------------------------------------------------------------- | --------------- | --------------- |
| P0     | Arranque F7, decisiones, datos demo de mantenimiento y sala de revisión | Gate F6 en main | —               |
| P1     | F7-01 Actividades programadas + KPI «Mantenimientos próximos»           | P0              | Sí, con P6      |
| P2     | F7-02 Tickets                                                           | P0              | Sí, con P1 y P6 |
| P3     | F7-03 + F7-04 Orden de trabajo + máquina de estados                     | P1, P2          | Sí, con P6      |
| P4     | F7-05 + F7-06 Ejecución, diagnóstico y tipos de evidencia               | P3              | Sí, con P6      |
| P5     | F7-07 Revisión, observaciones, corrección, reapertura y anulación       | P4              | Sí, con P6/P7   |
| P6     | F7-09 Base offline: esquema IndexedDB y protección local                | P0              | Sí, con P1–P5   |
| P7     | F7-08 + F7-10 Responsable único, bloqueo lógico y descarga de órdenes   | P3, P6          | —               |
| P8     | F7-11 + F7-12 Cola local, reintentos y API de sincronización            | P7              | —               |
| P9     | F7-14 UI móvil de órdenes y evidencia offline                           | P4, P8          | Sí, con P10     |
| P10    | F7-13 + F7-15 Conflictos y centro de sincronización                     | P8              | Sí, con P9      |
| P11    | F7-16 Borrado local al cerrar sesión, perder permiso o desactivar       | P6, P8          | Sí, con P9/P10  |
| P12    | F7-17 Suite de campo: conexión, cierres, fotos pendientes, concurrencia | P9, P10, P11    | —               |
| P13    | Pendientes F6 (EXC-F6-01) + gate de salida de Fase 7                    | Todo            | —               |

> Regla de oro: **un prompt = una rama = un PR**. Haz merge del PR antes de empezar un prompt que dependa de él (`git checkout main; git pull`). Si trabajas en paralelo, cada sesión en su propia rama (o worktree) y se integran por orden de la tabla. Los prompts que tocan migraciones de `packages/database` (P1, P2, P3, P4, P5, P7, P8, P10) **no deben correr en paralelo entre sí** para evitar choques de numeración de migraciones.

## Cómo verán y manipularán las pantallas tus jefes

Desde P0 hay cuatro formas, de menor a mayor esfuerzo para ellos:

1. **Galería de capturas** (`pnpm ux:snapshots`, o artefacto `ux-review-gallery` del PR): ahora con una sección **«Fase 7 — Mantenimiento y offline»**, cada pantalla UI-MNT/TKT/WO/SYNC en móvil, tablet y escritorio y en cada estado (carga, vacío, error, sin permiso, lectura, offline, pendiente de sincronizar, conflicto).
2. **Videos de recorrido** (`pnpm ux:walkthroughs`, o artefacto `ux-walkthroughs` del PR): videos cortos generados con Playwright de los flujos completos (crear ticket → asignar → ejecutar → cerrar; descargar orden → sin internet → sincronizar → conflicto). Sirven para que Dirección vea el flujo de punta a punta sin instalar nada, sobre todo el offline, que no se aprecia en una foto.
3. **Catálogo interactivo (Storybook)**: componentes nuevos (checklist, captura de evidencia, firma, tarjeta de orden, comparador de conflicto…) con controles para cambiar estado, rol y tamaño.
4. **App real en modo demo** (`$env:ICE24_DEMO_MODE="1"; pnpm dev:private` → http://localhost:3000/?demo=1), y **si Dirección lo aprueba en P0, también en el Preview de Vercel de cada PR**, con un enlace protegido que pueden abrir desde su celular. El panel **Demo** gana controles de Fase 7: «Persona Técnico con orden descargada», «Sin conexión», «Fotos pendientes», «Provocar conflicto» y «Revocar permiso».

Cada prompt termina pidiendo al agente un **«Checklist de revisión UX»**: qué abrir, con qué persona, qué pulsar y qué deben comprobar tus jefes. Las respuestas se registran en `docs/qa/phase-7/ux-signoff.md` antes del merge.

## Reglas comunes de la Fase 7 (todos los prompts las citan)

```text
REGLAS COMUNES FASE 7 (ICE24OS):
1. Lee siempre antes de escribir código: context/PROJECT_RULES.md, la tarea en context/TASKS.md (Fase 7), la Fase 7 de context/Implementation_Plan.md, context/AppFlow.md §15 (Flujo 7) y §27 (Flujo 19), context/UI_UX.md §12.5, §13.5, §14.8, §14.18, §15.3 y §20, docs/backlog/phase-7-status.md, docs/backlog/open-decisions.md y docs/modules/maintenance.md. Reutiliza lo existente: packages/ui (base, domain, patterns, layouts), packages/authorization (authorize()), packages/offline (Dexie), packages/contracts, el modo demo de apps/private-web/src/server/demo y los patrones de apps/api/src/modules/equipment.
2. Alcance: no amplíes el PRD. Si encuentras una contradicción entre documentos o una decisión no tomada, regístrala en docs/backlog/open-decisions.md (o propone un ADR en docs/decisions/) y usa el valor «Propuesta» de phase-7-status.md, marcándolo visiblemente como provisional. No inventes reglas de negocio.
3. Seguridad y datos: aislamiento multiempresa en todas las consultas, authorize() en API y BFF, auditoría (actor, contexto, correlación, valores relevantes, resultado) en toda acción sensible, versión esperada (optimistic concurrency) e idempotencia según packages/contracts. Archivos siempre privados, sin URLs públicas permanentes. Migraciones con compatibilidad y reversión; nunca borres historial ni atrasos.
4. UI: solo tokens semánticos y componentes de packages/ui (sin colores sueltos), fiel a la referencia aprobada (ADR-025 y docs/design-system/reference/). Cada pantalla cubre carga, vacío, error, sin permiso, modo lectura y sin conexión; funciona en 375, 768, 1280 y 1440 px; teclado completo, foco visible, áreas táctiles ≥ 44 px y WCAG 2.2 AA. Textos en español claro para el técnico de campo.
5. Revisión UX (obligatorio en toda tarea con interfaz): (a) datos ficticios en el modo demo para cada persona (Dueño, Administrador de sucursal, Técnico, Solo lectura, Operador ICE24) que permitan ver cada estado; (b) rutas × estados × viewports en tests/visual/ux-review.routes.ts bajo la sección «Fase 7 — Mantenimiento y offline», con su recuadro «Qué revisar»; (c) historias de Storybook con controles (args) para los componentes nuevos, incluida su «Matriz de estados»; (d) si el flujo tiene varios pasos, un recorrido en tests/visual/walkthroughs/ para pnpm ux:walkthroughs; (e) baselines visuales nuevas de pnpm test:ui:update generadas en el contenedor Linux de Playwright, señaladas en el PR como «requiere aprobación UX».
6. Calidad: TypeScript estricto, ESLint con 0 warnings, Prettier, límites de workspace, commits convencionales. Nunca desactives pruebas, reglas ni umbrales para pasar; si algo es inevitable, justifícalo en docs/qa/phase-7/ con responsable.
7. Documentación: actualiza docs/modules/maintenance.md, docs/qa/phase-7/traceability.md (fila de la tarea), docs/backlog/phase-7-status.md y el runbook si aparece un fallo operativo nuevo. Escribe docs/tasks/task-f7-XX.md con: archivos cambiados, requisitos cubiertos, pruebas ejecutadas (con números reales), riesgos, deuda, validación manual pendiente y «Checklist de revisión UX».
8. VALIDACIÓN (todas en verde antes de terminar): pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots (y pnpm ux:walkthroughs si existe). En PowerShell la variable se pone con $env:ICE24_BROWSER_TESTS="1". Si una validación no se puede ejecutar en tu entorno, dilo explícitamente; no la reportes como aprobada.
9. AL TERMINAR muestra: resumen de validaciones (comando → resultado → nº de pruebas), lista de archivos cambiados y el «Checklist de revisión UX» con comandos, URLs, persona del panel Demo a usar, pasos concretos y 4–6 preguntas sí/no para Dirección. No hagas commit ni push hasta que te lo pida con el bloque PUSH.
```

## Bloque Push (plantilla)

Debajo de cada prompt está su bloque **Push** ya llenado con rama, commit y reporte. Pégalo en la misma sesión del agente cuando haya terminado. Si prefieres hacerlo tú en PowerShell:

```powershell
# 1) Validaciones: TODAS deben salir en verde
pnpm check
pnpm build
$env:ICE24_BROWSER_TESTS="1"; pnpm test:integration
pnpm test:ui
pnpm ux:snapshots
pnpm ux:walkthroughs        # desde P0

# 2) Solo si todo pasó
git status                  # que no entren .env, test-results/, playwright-report/, storybook-static/, tmp/ ni .tmp/
git add -A
git commit -m "<mensaje del bloque>"
git push -u origin <rama del bloque>
gh pr create --base main --title "<mensaje del bloque>" --body-file <reporte del bloque>
gh pr checks --watch        # esperar CI y UI quality en verde

# 3) Revisión de Dirección (galería, videos, Storybook o Preview) → registrar en docs/qa/phase-7/ux-signoff.md
# 4) Tras la aprobación UX
gh pr merge --squash --delete-branch
git checkout main; git pull
```

Si algo falla: **no hagas push**. Dile al agente: _«La validación X falló con este error: … Corrígelo sin desactivar pruebas, reglas ni umbrales y vuelve a correr todas las validaciones.»_ Si no tienes `gh`, crea el PR desde GitHub con el enlace que imprime `git push`.

---

## P0 — Arranque de Fase 7, decisiones y sala de revisión de mantenimiento

```text
Eres un ingeniero senior en el monorepo ICE24OS (pnpm 11 + Turbo, Next.js en apps/private-web, API en apps/api, worker en apps/worker, paquetes compartidos en packages/, Vitest y Playwright). Iniciamos la Fase 7 (Mantenimiento, tickets, órdenes y offline operativo).

Lee docs/backlog/phase-7-prompts.md completo (sobre todo «Reglas comunes de la Fase 7», que debes cumplir) y además: docs/backlog/phase-6-status.md, docs/qa/phase-6/evidence/20261030-declaracion-cierre.md (pendientes que pasan a la Fase 7), docs/qa/phase-6/evidence/20261030-excepcion-d02.md, docs/qa/phase-6/README.md, apps/private-web/src/server/demo/*, tests/visual/ux-review.routes.ts, scripts/ux-snapshots/* y .github/workflows/ui-quality.yml.

Crea la rama chore/f7-00-bootstrap desde main actualizado. NO implementes todavía lógica de mantenimiento.

Entregables:
1. docs/backlog/phase-7-status.md con el formato de phase-6-status.md: secuencia P0–P13 de phase-7-prompts.md, dependencias, tabla de estado y pendientes heredados de F6.
2. Decisiones que bloquean la fase, cada una con una «Propuesta» concreta, alternativas y responsable para que Dirección apruebe (agrégalas a docs/backlog/open-decisions.md enlazando DEC-009, DEC-018, DEC-022 y DEC-004 cuando correspondan):
   - Política de evidencia y firma (tipos, obligatoriedad por plantilla, tamaño máximo y compresión de fotos, firma dibujada vs nombre + confirmación).
   - Política de resolución de conflictos (quién resuelve, opciones: conservar local / conservar servidor / combinar campo a campo, motivo obligatorio).
   - Offline: vigencia máxima de una orden descargada, duración del bloqueo lógico, cuota local por orden y por dispositivo, qué hacer si el dispositivo nunca vuelve.
   - Permisos de revisión, corrección, reapertura y anulación por rol.
3. docs/modules/maintenance.md (esqueleto: alcance, entidades, estados, eventos, permisos, offline, enlaces a PRD/TRD/AppFlow/UI_UX) y docs/qa/phase-7/ con README.md (guía para directivos, igual de sencilla que la de Fase 6, explicando las cuatro formas de revisión), traceability.md (filas F7-01…F7-17 vacías) y ux-signoff.md (por pantalla: Aprobado / Cambios solicitados / Comentario / Revisor / Fecha).
4. Modo demo de mantenimiento: fixtures ficticios (máquinas con actividades próximas, vencidas y completadas; tickets; órdenes en cada estado; una orden «descargada» por el Técnico) y nuevos controles en el panel Demo, aunque de momento solo cambien el estado simulado: «Orden descargada», «Fotos pendientes», «Provocar conflicto», «Revocar permiso del técnico». Deben respetar authorize() real.
5. Galería: sección «Fase 7 — Mantenimiento y offline» en ux-review.routes.ts y en la galería, con maquetas provisionales de UI-MNT-01, UI-MNT-02, UI-TKT-01, UI-TKT-02, UI-WO-01, UI-WO-02, UI-WO-03, UI-WO-04 y UI-SYNC-01 marcadas «Maqueta — sin lógica».
6. Videos de recorrido: script pnpm ux:walkthroughs (Playwright con video y pasos rotulados en pantalla) que lea flujos declarativos de tests/visual/walkthroughs/*.ts y genere docs/qa/phase-7/walkthroughs/index.html con los videos. Ignora los .webm en git y súbelos como artefacto ux-walkthroughs en ui-quality.yml.
7. Pendiente F6 «modo demo en Preview»: redacta ADR (siguiente número libre) con la propuesta para que Dirección revise sin instalar nada: habilitar demo solo si VERCEL_ENV=preview + ICE24_DEMO_MODE=1 + Vercel Deployment Protection activo, sin secretos ni base de datos reales en Preview, banner permanente «DEMO — datos ficticios», noindex, y pruebas que demuestren que en production sigue bloqueado. Resuelve en el mismo ADR cómo probar offline real (service worker) en modo demo, ya que hoy el demo se bloquea con NODE_ENV=production. Implementa el cambio detrás de esa bandera pero déjalo DESACTIVADO hasta que el ADR tenga firma de Dirección; documenta los pasos de activación en Vercel.
8. Pendiente F6 «12 recorridos con lector de pantalla»: crea docs/qa/phase-7/screen-reader-walkthroughs.md con el guion paso a paso de los 12 recorridos (autenticación, cambio de contexto, dashboard vacío y navegación por rol × móvil/tableta/escritorio) para NVDA en Windows, VoiceOver en iPhone y TalkBack en Android, con columnas de resultado; las pantallas nuevas de F7 se irán agregando.
9. Pendiente F6 «ui-quality requerido»: documenta en docs/qa/phase-7/README.md los clics exactos en GitHub (Settings → Branches → main) para que el administrador lo active.
10. Agrega este archivo docs/backlog/phase-7-prompts.md al commit si aún no está versionado.
11. Reporte docs/tasks/task-f7-00.md.

Cumple las «Reglas comunes de la Fase 7» (validación incluida). Al terminar, además del Checklist de revisión UX, dame la lista de decisiones que mis jefes (Axel Quevedo Zamudio y Eduardo Ramos) deben aprobar, redactada como preguntas cortas de sí/no u opción múltiple.
```

**Push P0**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (que no entren .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni videos .webm), luego:
   git add -A
   git commit -m "chore(maintenance): bootstrap phase 7, demo data and review room (F7-00)"
   git push -u origin chore/f7-00-bootstrap
4. Abre el PR: gh pr create --base main --title "chore(maintenance): bootstrap phase 7, demo data and review room (F7-00)" --body-file docs/tasks/task-f7-00.md (si no hay gh, dame el enlace de GitHub para crearlo).
5. gh pr checks --watch. Si CI o UI quality fallan, corrige y vuelve al paso 1.
6. NO hagas merge. Dime dónde descargar los artefactos (ux-review-gallery, ux-walkthroughs, storybook-static) para enviárselos a Dirección.
```

---

## P1 — F7-01: Generación y recálculo de actividades programadas + KPI del Resumen

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tarea: TASK-F7-01 en context/TASKS.md (incluidos los criterios RA-01 y F6-CIERRE). Lee además docs/tasks/task-f4-20.md, task-f4-21.md (frecuencia efectiva y componentes activos) y docs/tasks/task-f4-13.md o el código de calendarios iniciales de la Fase 4.

Rama feat/f7-01-scheduled-activities desde main.

- Contratos en packages/contracts/src/private/maintenance y migración en packages/database: actividades programadas con estado (programada, próxima, vencida, en atención, completada…) según el diagrama de AppFlow §15, ventana de aviso y zona horaria de la sucursal.
- apps/api/src/modules/maintenance/scheduling + apps/worker/src/processors/maintenance-scheduling: generación y recálculo idempotente usando componentes activos y la frecuencia efectiva de F4-20; al cambiar plantilla o frecuencia solo se recalculan actividades futuras; NUNCA se borran ni ocultan atrasos.
- Pruebas: unitarias por zona horaria (incluye cambio de horario), fecha de instalación, nueva versión de plantilla, componente retirado, reejecución del job sin duplicados; integración con Testcontainers; aislamiento multiempresa.
- UI: UI-MNT-01 (calendario: programado, próximo, vencido, crítico) y UI-MNT-02 (lista con filtros en la URL por estado, máquina, sucursal y responsable) en apps/private-web/src/features/maintenance, reemplazando las maquetas de P0.
- F6-CIERRE: regresa al Resumen la tarjeta KPI «Mantenimientos próximos» (periodo «Próximos 7 días», icono tool, tono info) con el conteo real del contexto activo, enlace a UI-MNT-02 filtrada y oculta si el módulo está deshabilitado o el rol no tiene permiso. Datos demo para verla.
- Demo/galería/Storybook según la regla 5; recorrido «Ver mantenimientos vencidos desde el Resumen».
- Reporte docs/tasks/task-f7-01.md.

Checklist UX: incluye qué ve cada persona (Dueño vs Técnico vs Solo lectura) y una pregunta sobre si los colores/etiquetas de «próximo», «vencido» y «crítico» se entienden sin explicación.
```

**Push P1**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(maintenance): generate and recalculate scheduled activities (F7-01)"
   git push -u origin feat/f7-01-scheduled-activities
4. gh pr create --base main --title "feat(maintenance): generate and recalculate scheduled activities (F7-01)" --body-file docs/tasks/task-f7-01.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P2 — F7-02: Tickets con máquina, sistema, prioridad, descripción y evidencia

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tarea: TASK-F7-02 en context/TASKS.md. Revisa el módulo de archivos de la Fase 5 (apps/api/src/modules/files y apps/private-web/src/features/files) y el expediente de máquina de TASK-F4-10.

Rama feat/f7-02-tickets desde main.

- Contratos, migración y apps/api/src/modules/tickets: ticket con folio, máquina, sistema/componente, prioridad, descripción, evidencia inicial (archivos privados vía el módulo de archivos existente), estado y vínculo con la actividad o la orden que lo atienda. Creación idempotente; auditoría de creación y cambios.
- Permisos por rol y ámbito (quién crea, ve y edita) con pruebas positivas y negativas de aislamiento entre cuentas y sucursales.
- UI: UI-TKT-01 (crear ticket: buscar máquina, elegir sistema, prioridad con explicación, descripción y fotos, con useUnsavedChanges de F6-11) y UI-TKT-02 (detalle: diagnóstico, asignación pendiente, seguimiento cronológico). Acceso desde el expediente de máquina y desde la lista.
- Validaciones claras en español; si el módulo está deshabilitado o la cuenta en modo lectura, se explica qué se puede hacer.
- Demo/galería/Storybook según la regla 5; recorrido «Reportar una falla con foto desde el celular».
- Reporte docs/tasks/task-f7-02.md.
```

**Push P2**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(maintenance): add tickets with machine, system, priority and evidence (F7-02)"
   git push -u origin feat/f7-02-tickets
4. gh pr create --base main --title "feat(maintenance): add tickets with machine, system, priority and evidence (F7-02)" --body-file docs/tasks/task-f7-02.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P3 — F7-03 + F7-04: Orden de trabajo, asignación y máquina de estados

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tareas: TASK-F7-03 y TASK-F7-04 en context/TASKS.md. F7-01 y F7-02 ya están en main. Revisa usuarios y permisos delegados de TASK-F4-03 y las plantillas de F4-05/F4-06.

Rama feat/f7-03-04-work-orders-state-machine desde main.

TASK-F7-03:
- Contratos, migración y apps/api/src/modules/work-orders: orden generada desde ticket o actividad programada, con responsable (solo técnicos con acceso a la sucursal), checklist y procedimiento tomados de la versión de plantilla vigente (congelados en la orden), piezas previstas y folio.
- UI-WO-01 (lista: asignadas, descargadas, pendientes; filtros en URL) y la acción «Asignar técnico» en UI-TKT-02 y en la actividad.

TASK-F7-04:
- Máquina de estados explícita en packages/domain (sin lógica de estados dispersa en la UI): estados y transiciones de AppFlow §15 (Programado, Próximo, En atención, Completado, Con observaciones, No conforme, etc.). Cada transición valida estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica, y genera auditoría.
- Las transiciones no permitidas devuelven el error de contrato correspondiente y la UI solo ofrece las acciones posibles (botón deshabilitado con motivo cuando ayuda a entender).
- Pruebas exhaustivas de la tabla de transiciones (válidas e inválidas), concurrencia con versión esperada y autorización por rol.
- Genera un diagrama Mermaid de la máquina de estados en docs/modules/maintenance.md a partir del código o verifícalo con una prueba para que no se desincronice.

Demo/galería/Storybook según la regla 5 (una historia «Línea de estados de la orden»); recorrido «Del ticket a la orden asignada». Reportes docs/tasks/task-f7-03.md y task-f7-04.md.
```

**Push P3**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(maintenance): add work orders, assignment and state machine (F7-03, F7-04)"
   git push -u origin feat/f7-03-04-work-orders-state-machine
4. gh pr create --base main --title "feat(maintenance): add work orders, assignment and state machine (F7-03, F7-04)" --body-file docs/tasks/task-f7-04.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P4 — F7-05 + F7-06: Ejecución, diagnóstico, pruebas, recomendación y tipos de evidencia

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tareas: TASK-F7-05 y TASK-F7-06 en context/TASKS.md. Aplica la política de evidencia y firma aprobada (o la «Propuesta» vigente) de docs/backlog/phase-7-status.md.

Rama feat/f7-05-06-execution-evidence desde main.

TASK-F7-06 (primero, porque F7-05 la usa):
- Tipos de evidencia declarados por la plantilla: foto antes/después, foto de pieza, lectura numérica con unidad y rango, lote, firma. Obligatoriedad y cantidad por actividad según la plantilla; validación en servidor (tipo, tamaño, integridad) y en cliente; archivos privados vía el módulo de archivos.
- Componentes en packages/ui/src/components/domain: captura de foto con vista previa y compresión, lectura con unidad, lote y firma (accesible: alternativa por teclado y lector de pantalla según la política). Con historias y matriz de estados.

TASK-F7-05:
- UI-WO-02 (ejecutar orden): checklist, diagnóstico, actividades realizadas, piezas usadas, pruebas, recomendación y evidencia, con guardado de borrador y useUnsavedChanges.
- UI-WO-03 (cierre): resumen de lo capturado, lista de requisitos faltantes con enlace a cada uno, y resultado Completada / Con observaciones / No conforme. El servidor rechaza el cierre si falta algo obligatorio (no confíes solo en la UI).
- Pruebas: cierre bloqueado por cada requisito faltante, cierre exitoso, evidencia inválida, permisos, auditoría.

Demo/galería/Storybook según la regla 5; recorrido «Ejecutar y cerrar una orden con fotos y firma (en línea)». Reportes docs/tasks/task-f7-05.md y task-f7-06.md.

Checklist UX: pregunta explícitamente si un técnico entendería en el celular qué le falta para cerrar.
```

**Push P4**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(maintenance): add order execution and template-declared evidence (F7-05, F7-06)"
   git push -u origin feat/f7-05-06-execution-evidence
4. gh pr create --base main --title "feat(maintenance): add order execution and template-declared evidence (F7-05, F7-06)" --body-file docs/tasks/task-f7-05.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P5 — F7-07: Revisión, observaciones, corrección, reapertura y anulación

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tarea: TASK-F7-07 en context/TASKS.md. Usa la matriz de permisos aprobada (o «Propuesta») para revisión, corrección, reapertura y anulación. Reutiliza el componente Comparator de packages/ui/src/components/domain.

Rama feat/f7-07-review-correction desde main.

- Revisión de una orden cerrada con observaciones; corrección versionada (la versión original nunca se modifica ni se borra), reapertura y anulación con motivo obligatorio, actor y fecha. Todo vía la máquina de estados de F7-04 y con versión esperada.
- UI-WO-04: motivo, comparación lado a lado entre versión original y vigente (qué cambió, quién y cuándo) y historial de versiones accesible.
- Pruebas positivas y negativas de aislamiento entre cuentas, ámbitos y acciones; auditoría completa; intento de anular sin permiso o sin motivo.

Demo/galería/Storybook según la regla 5; recorrido «Corregir una lectura mal capturada y ver el historial». Reporte docs/tasks/task-f7-07.md.
```

**Push P5**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(maintenance): add review, correction, reopening and annulment (F7-07)"
   git push -u origin feat/f7-07-review-correction
4. gh pr create --base main --title "feat(maintenance): add review, correction, reopening and annulment (F7-07)" --body-file docs/tasks/task-f7-07.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P6 — F7-09: Esquema IndexedDB y protección local (base offline)

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tarea: TASK-F7-09 en context/TASKS.md. Lee packages/offline/src (Dexie, pendingOperations, clearProtectedLocalData), docs/tasks/task-f0-14.md y la sección 20 de context/UI_UX.md. Este prompt puede correr en paralelo con P1–P5: no toques packages/database ni módulos de mantenimiento de la API.

Rama feat/f7-09-offline-schema desde main.

- Evoluciona el esquema Dexie de packages/offline a una versión nueva con migración desde OFFLINE_SCHEMA_VERSION=1 sin perder operaciones pendientes: almacenes para órdenes descargadas (paquete mínimo), borradores de ejecución, archivos/evidencias pendientes (Blobs), cola de operaciones y metadatos (usuario, cuenta, versión de paquete, fecha de descarga y vencimiento).
- Todas las escrituras relacionadas en una transacción; manejo de cuota llena (QuotaExceededError) y de almacenamiento no disponible (modo privado) con mensajes claros.
- Protección local factible: documenta en un ADR qué se puede y qué no (p. ej. cifrado con WebCrypto y llave no exportable ligada a la sesión, navigator.storage.persist(), sin guardar tokens en IndexedDB) y el riesgo residual. Implementa lo aprobado o lo propuesto.
- Cada registro lleva accountId y userId; lectura siempre filtrada por el contexto activo.
- Service worker / caché de la app shell para que una orden descargada abra tras recargar sin conexión, según lo decidido en el ADR de P0. Si la decisión aún no está aprobada, implementa lo mínimo detrás de bandera y documéntalo.
- Pruebas con fake-indexeddb: migración v1→v2, transacciones, cuota llena, aislamiento por cuenta/usuario, datos corruptos.
- Storybook/galería: estado «Almacenamiento lleno» y «Almacenamiento no disponible» del componente SyncStatus.
- Reporte docs/tasks/task-f7-09.md.
```

**Push P6**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(offline): versioned IndexedDB schema and local data protection (F7-09)"
   git push -u origin feat/f7-09-offline-schema
4. gh pr create --base main --title "feat(offline): versioned IndexedDB schema and local data protection (F7-09)" --body-file docs/tasks/task-f7-09.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P7 — F7-08 + F7-10: Responsable único, bloqueo lógico y descarga de órdenes

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tareas: TASK-F7-08 y TASK-F7-10 en context/TASKS.md. F7-03, F7-04 y F7-09 ya están en main. Usa la vigencia de descarga y la duración del bloqueo aprobadas (o «Propuesta»).

Rama feat/f7-08-10-offline-download desde main.

TASK-F7-08:
- Al descargar, la orden queda con un único responsable activo y un bloqueo lógico (quién, dispositivo, desde cuándo, hasta cuándo). Otro usuario no puede ejecutarla mientras dure; un administrador autorizado puede liberarla o reasignarla con motivo, y eso queda auditado y se avisa al técnico al reconectar.
- Reintentos de descarga no duplican bloqueos; vencimiento del bloqueo manejado por el worker.

TASK-F7-10:
- Endpoint en apps/api/src/modules/synchronization que entrega el «paquete offline mínimo» de una orden autorizada (orden, máquina, checklist y procedimiento congelados, evidencias requeridas, piezas previstas, versión) y nada más; validación de permiso, módulo, estado de cuenta y contexto.
- En apps/private-web/src/features/sync: botón explícito «Descargar para trabajar sin conexión» en UI-WO-01/UI-WO-02 con progreso, tamaño estimado, confirmación de espacio y estado «Disponible sin conexión». Guarda en el esquema de F7-09.
- Pruebas: descarga sin permiso, de otra cuenta, de orden ya bloqueada por otro, reintento idempotente, liberación administrativa, vencimiento.

Panel Demo: el control «Orden descargada» ahora usa la descarga real. Galería/Storybook/recorrido «Descargar una orden antes de salir a campo». Reportes docs/tasks/task-f7-08.md y task-f7-10.md.
```

**Push P7**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(sync): single assignee lock and explicit offline order download (F7-08, F7-10)"
   git push -u origin feat/f7-08-10-offline-download
4. gh pr create --base main --title "feat(sync): single assignee lock and explicit offline order download (F7-08, F7-10)" --body-file docs/tasks/task-f7-10.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P8 — F7-11 + F7-12: Cola local, reintentos y API de sincronización

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tareas: TASK-F7-11 y TASK-F7-12 en context/TASKS.md, AppFlow §27.1–27.2 y los contratos de idempotencia y concurrencia de TASK-F1-07 en packages/contracts.

Rama feat/f7-11-12-sync-queue-api desde main.

TASK-F7-11:
- Cola local en packages/offline con estados Pendiente, Sincronizando, Cargada, Error, Conflicto (y Resuelta, que llega en P10), orden por dependencia (p. ej. subir archivo antes de cerrar orden), reintentos con backoff y jitter, límite de intentos y reanudación tras cerrar el navegador. El id de operación es la llave de idempotencia y nunca cambia entre reintentos.
- Detección de conexión (online/offline y verificación real contra /health), sin bloquear la UI.

TASK-F7-12:
- API en apps/api/src/modules/synchronization: recibe operaciones con llave idempotente y versión esperada; valida permisos, estado, versión y bloqueo; aplica la operación en una transacción; responde aceptada / error recuperable / error definitivo / conflicto. Reenviar la misma operación devuelve el mismo resultado sin duplicar ejecuciones ni archivos.
- Subida de evidencias reanudable o por partes según lo que soporte el módulo de archivos; validación de tipo, tamaño, integridad (hash) y malware/fallo; archivos privados.
- OpenAPI, errores y ejemplos de contrato actualizados; pruebas de contrato.
- Pruebas: mismo envío 2 y 10 veces, respuesta perdida tras aplicar en servidor, servidor caído a mitad, versión desactualizada, permiso revocado entre descarga y envío, archivo corrupto.

UI: indicador de sincronización en el shell (reutiliza SyncStatus) con conteo de pendientes y enlace «Ver pendientes». Galería/Storybook/recorrido «Volver a tener señal y ver cómo se sube todo». Reportes docs/tasks/task-f7-11.md y task-f7-12.md.
```

**Push P8**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(sync): local queue with retries and idempotent sync API (F7-11, F7-12)"
   git push -u origin feat/f7-11-12-sync-queue-api
4. gh pr create --base main --title "feat(sync): local queue with retries and idempotent sync API (F7-11, F7-12)" --body-file docs/tasks/task-f7-12.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P9 — F7-14: UI móvil de órdenes y evidencia offline

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tarea: TASK-F7-14 en context/TASKS.md y context/UI_UX.md §14.8 (Orden de trabajo móvil con offline), §20.3 y §20.4 (qué se permite y qué se bloquea offline). F7-05, F7-06, F7-10, F7-11 y F7-12 ya están en main. Usa los layouts de F6-09 (apps/private-web/src/features/maintenance/mobile).

Rama feat/f7-14-mobile-offline-ui desde main.

- Flujo completo en celular SIN conexión después de descargar: abrir orden (también tras recargar), checklist, diagnóstico, piezas, fotos (cámara del dispositivo con compresión), lecturas, lote, firma y revisión de cierre; cada cambio se guarda localmente al instante y se ve «Guardado en este dispositivo».
- Acciones que requieren servidor (§20.4) se muestran deshabilitadas con motivo, no ocultas.
- Banner de modo sin conexión, contador de pendientes, uso con una mano, áreas táctiles ≥ 44 px, legible con luz exterior (contraste), sin desplazamiento horizontal a 375 px.
- Estados: carga, vacío (sin órdenes descargadas), error, sin permiso, lectura, sin conexión, fotos pendientes, almacenamiento lleno.
- Pruebas E2E en Playwright con viewport móvil y context.setOffline(true): descargar → quitar red → completar → recargar sin red → la orden sigue ahí → devolver red → se sincroniza → aparece Completada una sola vez. Axe sin violaciones serias en cada paso.
- Agrega las pantallas nuevas al guion docs/qa/phase-7/screen-reader-walkthroughs.md.

Recorrido estrella para Dirección: «Orden completa en campo sin internet» (video con pasos rotulados, en móvil 375). Reporte docs/tasks/task-f7-14.md.

Checklist UX: incluye cómo probarlo en un celular real (Preview de Vercel si está activo o la IP local con pnpm dev:private) poniendo el teléfono en modo avión.
```

**Push P9**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(web): mobile offline work order and evidence flow (F7-14)"
   git push -u origin feat/f7-14-mobile-offline-ui
4. gh pr create --base main --title "feat(web): mobile offline work order and evidence flow (F7-14)" --body-file docs/tasks/task-f7-14.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P10 — F7-13 + F7-15: Conflictos y centro de sincronización

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tareas: TASK-F7-13 y TASK-F7-15 en context/TASKS.md, AppFlow §27 y UI_UX §14.18 (Resolución de conflicto offline). Usa la política de conflictos aprobada (o «Propuesta»). Reutiliza Comparator, SyncStatus y los estados globales de F6-10.

Rama feat/f7-13-15-conflicts-sync-center desde main.

TASK-F7-13:
- Cuando la versión esperada no coincide (modificación concurrente), el servidor NO sobrescribe: registra un conflicto con ambas versiones completas (local y servidor), actor, dispositivo, fecha y campos en disputa; la operación local pasa a Conflicto.
- Pruebas: dos técnicos/administrador modificando la misma orden, conflicto con archivos, reenvío de una operación en conflicto (no crea conflictos duplicados).

TASK-F7-15:
- Centro de sincronización (lista de operaciones locales con entidad, fecha/hora, archivos, intentos y estado; reintentar y descartar con confirmación) y UI-SYNC-01 (comparación lado a lado, campo por campo, con las opciones de la política, motivo obligatorio y confirmación).
- Solo resuelve quien tiene permiso; la resolución crea una versión nueva auditada y el conflicto pasa a Resuelta; ambas versiones originales se conservan.
- Panel Demo: «Provocar conflicto» genera un conflicto real sobre la orden descargada.

Galería/Storybook/recorridos «Detectar y resolver un conflicto» (Técnico + Administrador). Reportes docs/tasks/task-f7-13.md y task-f7-15.md.

Checklist UX: pregunta si un administrador entiende, sin ayuda, qué versión es cuál y qué pasará al confirmar.
```

**Push P10**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(sync): conflict detection and authorized resolution center (F7-13, F7-15)"
   git push -u origin feat/f7-13-15-conflicts-sync-center
4. gh pr create --base main --title "feat(sync): conflict detection and authorized resolution center (F7-13, F7-15)" --body-file docs/tasks/task-f7-15.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P11 — F7-16: Borrado local al cerrar sesión, perder permiso o desactivar usuario

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tarea: TASK-F7-16 en context/TASKS.md, TASK-F3-09 (cierre de sesión individual, por usuario y global) y el riesgo «Usuario desactivado conserva datos» de la Fase 7 en Implementation_Plan.md.

Rama feat/f7-16-local-wipe desde main.

- Borrado de datos locales sensibles (órdenes, borradores, evidencias, cola, llaves) al: cerrar sesión, cierre global de sesiones, perder permiso o acceso a la sucursal, desactivar usuario, cambiar de cuenta sin acceso, y vencer la vigencia de descarga. La revocación se verifica al abrir la app y al reconectar.
- Antes de borrar al cerrar sesión voluntariamente, si hay pendientes sin subir, avisa claramente y ofrece sincronizar primero; en revocación forzosa, informa qué se perdió localmente y deja registro en el servidor (auditoría) de qué operaciones no llegaron.
- Panel Demo: «Revocar permiso del técnico» y «Desactivar usuario» disparan el flujo real.
- Pruebas unitarias y E2E de cada disparador, incluida la app abierta sin conexión cuando ocurre la revocación (al reconectar se limpia).
- Reporte docs/tasks/task-f7-16.md.
```

**Push P11**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "feat(offline): wipe local data on sign-out, permission loss or deactivation (F7-16)"
   git push -u origin feat/f7-16-local-wipe
4. gh pr create --base main --title "feat(offline): wipe local data on sign-out, permission loss or deactivation (F7-16)" --body-file docs/tasks/task-f7-16.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Dime qué artefactos y qué enlace de Preview (si está activo) enviar a Dirección.
```

---

## P12 — F7-17: Suite de campo (pérdida de conexión, cierre inesperado, fotos pendientes, concurrencia)

```text
Monorepo ICE24OS, Fase 7. Lee docs/backlog/phase-7-prompts.md y cumple las «Reglas comunes de la Fase 7». Tarea: TASK-F7-17 en context/TASKS.md y todos los riesgos de la Fase 7 en Implementation_Plan.md.

Rama test/f7-17-field-suite desde main.

- tests/e2e/maintenance-offline (Playwright, viewport móvil): pérdida de conexión en cada paso del flujo, red intermitente, cierre inesperado de la pestaña a mitad de una transacción, recarga sin red, fotos pendientes grandes con cuota casi llena, respuesta perdida del servidor, dos dispositivos sobre la misma orden, permiso revocado a mitad, reloj del dispositivo desfasado y zona horaria distinta.
- packages/offline/src/__tests__: casos de cola, transacciones y migraciones complementarios.
- Criterio de salida de la Fase 7 como una sola prueba E2E nombrada «criterio de salida F7»: descargar, completar sin internet, adjuntar evidencia, sincronizar, detectar conflicto y cierre auditado sin actividades duplicadas (verifica conteos en base de datos y auditoría).
- Guion manual docs/qa/phase-7/field-tests.md para hacer en un celular real (modo avión, bajar al sótano, cerrar la app a la fuerza, batería baja) con columnas escenario / dispositivo / datos / resultado / defecto / severidad / responsable.
- Reporte de la suite en docs/qa/phase-7/evidence/<fecha>-suite-campo.md con escenarios, datos, resultados reales, defectos y severidad. No inventes resultados.
- Reporte docs/tasks/task-f7-17.md.
```

**Push P12**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla o deja warnings: NO hagas commit ni push. Corrige sin desactivar pruebas, reglas ni umbrales y repite el paso 1. Si una prueba de campo revela un defecto real del producto, no la debilites: corrige el defecto o regístralo con severidad y avísame antes de continuar.
3. Si todo pasó: revisa git status (sin .env, test-results/, playwright-report/, storybook-static/, tmp/, .tmp/ ni .webm), luego:
   git add -A
   git commit -m "test(offline): field suite for connectivity loss, crashes, pending photos and concurrency (F7-17)"
   git push -u origin test/f7-17-field-suite
4. gh pr create --base main --title "test(offline): field suite for connectivity loss, crashes, pending photos and concurrency (F7-17)" --body-file docs/tasks/task-f7-17.md (sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge. Recuérdame qué pruebas manuales de docs/qa/phase-7/field-tests.md tengo que hacer en un celular real.
```

---

## P13 — Pendientes de Fase 6 (EXC-F6-01) y gate de salida de Fase 7

> Antes de este prompt, una persona debe ejecutar con lector de pantalla (NVDA en Windows y VoiceOver/TalkBack en celular) los recorridos de `docs/qa/phase-7/screen-reader-walkthroughs.md` y las pruebas manuales de `docs/qa/phase-7/field-tests.md`, y anotar resultados. El agente no puede hacerlo por ti; solo registra lo que tú reportes.

```text
Monorepo ICE24OS. Prepara el cierre de la Fase 7 siguiendo exactamente el formato de docs/qa/phase-6 (traceability.md, evidence/AAAAMMDD-declaracion-cierre.md, ux-signoff.md) y cumple las «Reglas comunes de la Fase 7» de docs/backlog/phase-7-prompts.md.

Rama chore/f7-gate desde main actualizado.

Pendientes heredados de F6:
- Registra en docs/qa/phase-6/ux-signoff.md los resultados de los 12 recorridos con lector de pantalla que yo ejecuté (te los pego al final). Si todos pasan, retira la excepción EXC-F6-01 en docs/qa/phase-6/evidence/20261030-excepcion-d02.md con fecha y responsable; si alguno falla, regístralo como defecto con severidad y NO retires la excepción.
- Verifica si `ui-quality` ya es check requerido en main (gh api repos/ice24vending/ICE24OS/branches/main/protection) y registra el resultado.
- Registra el estado del ADR de demo en Preview (aprobado/activo o pendiente).
- DEC-020, DEC-018 y O-02 quedan fuera del gate: solo actualiza su estado.

Gate F7:
- docs/qa/phase-7/traceability.md completa: F7-01…F7-17 → requisitos PRD/TRD/AppFlow/UI_UX → archivos → pruebas → evidencia (galería, videos, reporte a11y, suite de campo).
- Ejecuta y registra resultados reales con números: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm test:ui, pnpm ux:snapshots, pnpm ux:walkthroughs, pnpm storybook:build y la prueba «criterio de salida F7».
- Verifica «Resultado esperado», riesgos y criterio de salida de la Fase 7 en Implementation_Plan.md, y que cada decisión de phase-7-status.md esté aprobada o registrada como pendiente con responsable.
- docs/qa/phase-7/evidence/<fecha>-declaracion-cierre.md con dictamen (aprobado / aprobado con pendientes / rechazado), pendientes que pasan a la Fase 8 y tabla de firmas para Axel Quevedo Zamudio, Eduardo Ramos y Tech Lead/QA.
- docs/qa/phase-7/ux-signoff.md listo para que Dirección marque cada pantalla.
- Actualiza docs/backlog/phase-7-status.md (tareas integradas con sus PRs) y context/TASKS.md con los pendientes que pasan a la Fase 8.
- No inventes resultados: si algo falla o falta, regístralo como defecto o pendiente y no lo marques aprobado.

Resultados de mis recorridos con lector de pantalla y pruebas de campo:
<PEGA AQUÍ TUS RESULTADOS>
```

**Push P13**

```text
PUSH (solo si todo está en verde):
1. Vuelve a ejecutar: pnpm check · pnpm build · ICE24_BROWSER_TESTS=1 pnpm test:integration · pnpm test:ui · pnpm ux:snapshots · pnpm ux:walkthroughs · pnpm storybook:build. Muéstrame comando → resultado → nº de pruebas.
2. Si CUALQUIERA falla: NO hagas commit ni push; regístralo como defecto en la declaración de cierre y avísame.
3. Si todo pasó: revisa git status, luego:
   git add -A
   git commit -m "docs(qa): phase 7 exit gate"
   git push -u origin chore/f7-gate
4. gh pr create --base main --title "docs(qa): phase 7 exit gate" --body-file docs/qa/phase-7/evidence/<fecha>-declaracion-cierre.md (usa el nombre real del archivo; sin gh: dame el enlace).
5. gh pr checks --watch; si algo falla, corrige y vuelve al paso 1.
6. NO hagas merge hasta que Dirección firme la declaración y el ux-signoff.
```
