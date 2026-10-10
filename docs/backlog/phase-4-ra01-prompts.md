# Fase 4 (complemento RA-01) — Prompts para Claude Code / Codex

Guía para completar las tareas nuevas de Fase 4 (**TASK-F4-18 a F4-22**), que nacen del requerimiento adicional RA-01: componentes y frecuencias configurables por cliente. Pega un prompt por sesión en una sesión nueva del agente, abierta en la raíz del repo `ICE24OS`.

> Estas tareas deben quedar en `main` **antes de iniciar la Fase 7**, porque F7-01 genera los mantenimientos con los componentes y las frecuencias que se definen aquí. Pueden hacerse en paralelo con la Fase 6.

## Orden

| Prompt | Tarea                                               | Depende de | Rama                             |
| ------ | --------------------------------------------------- | ---------- | -------------------------------- |
| P1     | F4-18 Catálogo oficial + catálogo propio por cuenta | `main`     | `feat/f4-18-account-catalog`     |
| P2     | F4-19 Componentes por máquina                       | P1         | `feat/f4-19-machine-components`  |
| P3     | F4-20 Frecuencias de fábrica y del cliente          | P2         | `feat/f4-20-frequency-overrides` |
| P4     | F4-21 Recálculo de calendarios                      | P3         | `feat/f4-21-schedule-recalc`     |
| P5     | F4-22 UI + migración de máquinas existentes         | P4         | `feat/f4-22-components-ui`       |
| P6     | Gate de cierre del complemento RA-01                | Todo       | `docs/f4-ra01-gate`              |

> Regla de oro: **un prompt = una rama = un PR**. Haz merge del PR antes del siguiente prompt (`git checkout main; git pull`).

## Decisiones de dirección que todos los prompts deben respetar

Vienen de `context/Requerimientos_Adicionales_v1.1.md`:

- **D1:** no hay frecuencia mínima que bloquee. Si el cliente se aparta del valor de fábrica, ve una advertencia de posible pérdida de garantía y debe confirmarla (queda auditado). Hay un botón para restablecer los valores de fábrica.
- **D2:** el propietario (OW) puede cambiar todo. El administrador de sucursal, que es el rol existente Operador (OP), solo puede cambiar componentes y frecuencias de las máquinas de sus sucursales; nada a nivel cuenta (catálogo propio ni frecuencias de cuenta). Los demás roles solo consultan.
- **D3:** el cliente elige del catálogo los componentes que le aplican. Si alguno no existe, lo crea con su frecuencia y su propia actividad (pasos, checklist y evidencia).
- **D4:** la frecuencia del cliente no afecta el indicador sanitario ni el portal público.

## Bloque de push (igual para todos)

```powershell
pnpm check
pnpm build
$env:ICE24_BROWSER_TESTS="1"; pnpm test:integration

git add -A
git commit -m "<mensaje del bloque>"
git push -u origin <rama del bloque>
gh pr create --base main --title "<mensaje del bloque>" --body-file docs/tasks/<reporte>.md
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main; git pull
```

Recuerda: las líneas del cuerpo del commit no pueden pasar de 100 caracteres (commitlint).

---

## P1 — F4-18: Catálogo oficial y catálogo propio por cuenta

```text
Eres un ingeniero senior en el monorepo ICE24OS (pnpm + Turbo, NestJS en apps/api, Next.js en apps/private-web, Supabase/PostgreSQL, Vitest y Playwright). Vas a ejecutar TASK-F4-18, un complemento de la Fase 4 (ya cerrada) que nace del requerimiento RA-01.

ANTES DE ESCRIBIR CÓDIGO lee: context/PROJECT_RULES.md, context/Requerimientos_Adicionales_v1.1.md (RA-01 y decisiones D1–D4), context/TASKS.md (TASK-F4-04, TASK-F4-18 a F4-22), context/ICE24_OS_PRD_v1.0.md (RF-TPL-001 a RF-TPL-016), context/Database.md (component_catalog, model_components), docs/modules/equipment.md, supabase/migrations/20260917000100_phase4_equipment.sql, packages/contracts/src/equipment.ts y apps/api/src/modules/equipment (templates.store.ts, equipment-admin.controller.ts, equipment.controller.ts).

Crea la rama feat/f4-18-account-catalog desde main actualizado.

OBJETIVO: que, además del catálogo oficial de ICE24, cada cuenta pueda registrar componentes y características propios, visibles solo para ella, para cualquier máquina (hielo o agua, ICE24, con marca del cliente o externa).

Entregables:
1. Migración NUEVA en supabase/migrations (nunca edites las existentes): agrega a equipment.catalog_entries el alcance (`OFFICIAL` | `ACCOUNT`) y `account_id` (nulo si es oficial, obligatorio si es de cuenta), con CHECK de coherencia. Sustituye la unicidad global de `code` por unicidad por alcance (oficial global; de cuenta, por account_id). Incluye índices, RLS o filtro equivalente al que ya usa el módulo y una estrategia de reversión documentada. Los registros existentes quedan como OFFICIAL.
2. Agrega a la definición de un componente propio, en data jsonb validado por contrato, una actividad de mantenimiento opcional (nombre, frecuencia por defecto con unidad, pasos/checklist y evidencia requerida), siguiendo D3 y la forma de actividades que ya usan las plantillas.
3. packages/contracts/src/equipment.ts: esquemas Zod (o el mecanismo que ya use el repo) para crear, editar, listar y retirar componentes de cuenta; versiona según context/API.md. No expongas filas de base de datos como contrato.
4. API: endpoints de cuenta para el CRUD de componentes propios (sin borrado; retiro = status retired), con idempotencia, concurrencia optimista (row_version) y auditoría usando el productor de auditoría de Fase 5. Solo propietario/administrador de la cuenta puede escribir (D2): usa packages/authorization, sin lógica paralela. Los endpoints de ICE24 para el catálogo oficial siguen como están.
5. Listar catálogo para una cuenta = oficiales activos + propios de esa cuenta.
6. Pruebas: unitarias de contratos; integración de aislamiento multiempresa (la cuenta A no ve, usa ni edita componentes de la cuenta B); un rol sin permiso recibe el error 403 estándar; un cliente no puede editar un componente oficial.
7. Actualiza docs/modules/equipment.md y crea docs/tasks/task-f4-18.md (archivos cambiados, requisitos cubiertos RF-TPL-013, pruebas, riesgos, deuda y validación manual).

Reglas: TypeScript estricto, ESLint con 0 warnings, Prettier, pnpm check:boundaries, commits convencionales. No toques producción ni secretos. No desactives pruebas. Si algo contradice los documentos, detente y repórtalo como bloqueo.

VALIDACIÓN: pnpm check, pnpm build y ICE24_BROWSER_TESTS=1 pnpm test:integration en verde.
```

**Push** — rama `feat/f4-18-account-catalog` · commit `feat(equipment): add account-scoped component catalog (F4-18)` · reporte `docs/tasks/task-f4-18.md`

---

## P2 — F4-19: Componentes por máquina

```text
Monorepo ICE24OS. Ejecutas TASK-F4-19 (complemento RA-01 de Fase 4). F4-18 ya está en main.

Lee: context/PROJECT_RULES.md, context/Requerimientos_Adicionales_v1.1.md (D1–D4), context/TASKS.md (TASK-F4-19), docs/tasks/task-f4-18.md, docs/modules/equipment.md, supabase/migrations (la de Fase 4 y la de F4-18), packages/contracts/src/equipment.ts y apps/api/src/modules/equipment (machines.store.ts, requests.store.ts, transfers.store.ts, templates.store.ts).

Crea la rama feat/f4-19-machine-components desde main.

OBJETIVO: que cada máquina tenga su propia lista de componentes y que el propietario/administrador decida cuáles aplican.

Entregables:
1. Migración nueva: tabla equipment.machine_component_configs con machine_id, component_catalog_id (oficial o de la misma cuenta que la máquina; valídalo con trigger o FK compuesta), origen (TEMPLATE_DEFAULT, TEMPLATE_OPTIONAL, ACCOUNT_CUSTOM), estado active/inactive, valid_from/valid_to, actor_id, motivo y row_version. Sin borrado físico; historial sin solapamientos por componente (sigue el patrón exclude using gist de machine_periods).
2. Al activar una máquina (flujo de aprobación de F4-08/F4-10), precarga los componentes por defecto de su versión de plantilla en la misma transacción.
3. Contratos y API: listar componentes de una máquina (activos + historial), agregar uno del catálogo (oficial o propio), activar/desactivar, con idempotencia, versión esperada y auditoría con valores anterior y nuevo. D2: escribe el propietario (cualquier máquina) o el Operador (OP) solo si la máquina es de una de sus sucursales; crea un permiso nuevo (p. ej. equipment.machine-components-manage) para OW y OP evaluado con el alcance BRANCH de packages/authorization; el resto consulta. Prueba que un OP de otra sucursal recibe 403.
4. Transferencia (F4-12): la configuración de componentes viaja con la máquina y forma parte del historial técnico. Un componente propio de la cuenta origen sigue referenciado en el historial y queda documentado qué ve la cuenta destino (propón el comportamiento y regístralo como decisión en el reporte; si no está claro, márcalo como bloqueo).
5. Agrega la sección de componentes al expediente de la API de máquinas (machines.store.ts), sin romper las secciones existentes.
6. Pruebas: precarga al activar, aislamiento multiempresa, permisos D2, concurrencia (dos ediciones con la misma row_version → una falla con conflicto), transferencia y no borrado.
7. Actualiza docs/modules/equipment.md y crea docs/tasks/task-f4-19.md (RF-TPL-014).

Mismas reglas de calidad que el resto del repo. VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration en verde.
```

**Push** — rama `feat/f4-19-machine-components` · commit `feat(equipment): configure components per machine (F4-19)` · reporte `docs/tasks/task-f4-19.md`

---

## P3 — F4-20: Frecuencias de fábrica y frecuencias del cliente

```text
Monorepo ICE24OS. Ejecutas TASK-F4-20 (complemento RA-01 de Fase 4). F4-18 y F4-19 ya están en main.

Lee: context/PROJECT_RULES.md, context/Requerimientos_Adicionales_v1.1.md (decisiones D1–D4, OBLIGATORIAS), context/TASKS.md (TASK-F4-06, F4-13, F4-20, F7-01, F8-01, F8-02, F8-14), docs/tasks/task-f4-19.md, docs/modules/equipment.md, packages/domain, packages/contracts/src/equipment.ts y apps/api/src/modules/equipment/templates.store.ts (cómo se definen hoy actividades y frecuencias dentro de template_versions.definition).

Crea la rama feat/f4-20-frequency-overrides desde main.

OBJETIVO: las frecuencias y ventanas de alerta de la plantilla ICE24 son el valor de fábrica; el propietario/administrador puede definir las suyas para mantenimiento y sanitización, por cuenta o por máquina/componente/actividad.

Entregables:
1. Migración nueva: tabla equipment.maintenance_frequency_overrides con account_id, alcance (ACCOUNT | MACHINE), machine_id (si aplica), component_catalog_id y/o activity_code, tipo (MAINTENANCE | SANITATION), frecuencia + unidad, anticipación de alerta + unidad, warranty_warning_acknowledged_at, actor_id, vigencia y row_version. Sin borrado físico: restablecer = cerrar la vigencia del override.
2. Función de dominio pura en packages/domain: resolveEffectiveFrequency(plantilla, overridesCuenta, overridesMáquina) → { valor, unidad, alerta, fuente: TEMPLATE | ACCOUNT | MACHINE, valorFabrica }. Prioridad: máquina → cuenta → plantilla. Con pruebas unitarias exhaustivas (sin overrides, solo cuenta, solo máquina, ambos, override cerrado, unidades distintas).
3. D1: no hay mínimo que bloquee; solo se valida que sea un valor positivo con unidad válida. Si el valor difiere del de fábrica, la API exige un campo de confirmación de advertencia de garantía (sin él responde un error de validación con código propio documentado en context/API.md) y lo guarda en la auditoría.
4. Endpoints: consultar frecuencias efectivas de una máquina (con valor de fábrica y fuente), crear/editar override, "restablecer valores de fábrica" por componente, por máquina y por cuenta. D2: overrides de cuenta y restablecer de cuenta solo OW; overrides de máquina OW u OP de la sucursal de la máquina (reutiliza el permiso de F4-19 o crea uno análogo). Idempotencia, versión esperada y auditoría.
5. D4: deja una prueba explícita de que nada en esta tarea modifica sanitary_status ni publication_status de la máquina.
6. NO recalcules calendarios aquí (eso es F4-21); solo emite el evento de dominio "frecuencias cambiadas" por el outbox de Fase 5 para que F4-21 lo consuma.
7. Pruebas de integración: aislamiento, permisos, advertencia obligatoria, restablecer, conservación del valor de fábrica.
8. Actualiza docs/modules/equipment.md, context/API.md si agregas códigos de error, y crea docs/tasks/task-f4-20.md (RF-TPL-015).

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration en verde.
```

**Push** — rama `feat/f4-20-frequency-overrides` · commit `feat(equipment): add factory and client maintenance frequencies (F4-20)` · reporte `docs/tasks/task-f4-20.md`

---

## P4 — F4-21: Recálculo de calendarios y alertas

```text
Monorepo ICE24OS. Ejecutas TASK-F4-21 (complemento RA-01 de Fase 4). F4-18, F4-19 y F4-20 ya están en main.

Lee: context/PROJECT_RULES.md, context/Requerimientos_Adicionales_v1.1.md, context/TASKS.md (TASK-F4-13, F4-14, F4-21), docs/tasks/task-f4-13.md, task-f4-14.md y task-f4-20.md, apps/api/src/modules/equipment/machines.store.ts (inserción en schedule_jobs y cancelación de actividades), apps/worker/src/processors/scheduling.ts y processors/scheduler, y los consumidores del outbox de Fase 5.

Crea la rama feat/f4-21-schedule-recalc desde main.

OBJETIVO: que el calendario de cada máquina refleje siempre los componentes activos y la frecuencia efectiva.

Entregables:
1. La generación de actividades (F4-13) usa solo componentes activos (F4-19) y la frecuencia efectiva (resolveEffectiveFrequency de F4-20), incluidas las actividades de componentes propios del cliente (D3).
2. Cada actividad guarda en definition un snapshot de la frecuencia aplicada, su fuente (TEMPLATE/ACCOUNT/MACHINE) y el valor de fábrica.
3. Consumidor de los eventos "componentes cambiados" y "frecuencias cambiadas" que encola un job de recálculo idempotente (clave de generación determinista) para la máquina o para todas las máquinas de la cuenta, según el alcance.
4. El recálculo cancela y regenera solo actividades futuras en estado pending; nunca toca in_progress, completed ni históricas (RF-TPL-007). Es compatible con la aplicación de nueva versión de plantilla (F4-14): si llegan ambos eventos, el resultado debe ser el mismo en cualquier orden.
5. Las ventanas de alerta usan la anticipación efectiva.
6. Pruebas: idempotencia (procesar el mismo evento dos veces no duplica), orden de eventos, actividades en curso intactas, desactivar componente → sus actividades futuras se cancelan, override de cuenta aplicado a N máquinas, restablecer valores de fábrica → regresa al calendario de fábrica.
7. Observabilidad: métricas/logs del job con correlación, como en Fase 5. Actualiza docs/runbooks/equipment.md con el fallo nuevo posible (recálculo atascado o en DLQ) y crea docs/tasks/task-f4-21.md (RF-TPL-016).

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration en verde.
```

**Push** — rama `feat/f4-21-schedule-recalc` · commit `feat(scheduling): recalculate schedules on component or frequency changes (F4-21)` · reporte `docs/tasks/task-f4-21.md`

---

## P5 — F4-22: Pantallas de componentes y frecuencias + migración de máquinas existentes

```text
Monorepo ICE24OS. Ejecutas TASK-F4-22 (complemento RA-01 de Fase 4). F4-18 a F4-21 ya están en main.

Lee: context/PROJECT_RULES.md, context/UI_UX.md, context/AppFlow.md, context/Requerimientos_Adicionales_v1.1.md (D1–D4), context/TASKS.md (TASK-F4-16 y F4-22), docs/tasks/task-f4-18.md a task-f4-21.md, apps/private-web/src/features/equipment (workspace.tsx, equipment.css) y el estado actual de la Fase 6 (docs/backlog/phase-6-status.md): si ya existen componentes de packages/ui, úsalos; si no, sigue el estilo de las pantallas de F4-16.

Crea la rama feat/f4-22-components-ui desde main.

Entregables:
1. Pestaña "Componentes" en el expediente de máquina: lista de activos con origen (fábrica, opcional, propio), agregar del catálogo, crear componente propio con su frecuencia y actividad (pasos/checklist/evidencia), activar/desactivar e historial.
2. Sección "Frecuencias y alertas": por componente o actividad muestra el valor de fábrica ICE24, el valor del cliente y la fuente. Al editar un valor distinto del de fábrica aparece un diálogo de advertencia de posible pérdida de garantía que el usuario debe aceptar (D1). Botón "Restablecer valores de fábrica" por componente, por máquina y en la configuración de cuenta.
3. Configuración a nivel cuenta: aplicar frecuencias a todas mis máquinas de un modelo.
4. D2: el propietario ve todos los controles; el Operador (OP) solo los ve en máquinas de sus sucursales y no ve la configuración de cuenta; los demás roles ven modo lectura. El BFF respeta el mismo permiso.
5. Estados completos: carga, vacío, error, permiso denegado, conflicto de versión (409) y modo lectura de cuenta; responsive en móvil/tablet/escritorio; teclado y WCAG 2.2 AA.
6. Migración de backfill (nueva, idempotente): cada máquina existente recibe sus componentes por defecto de plantilla y ningún override; prueba que ninguna fecha de scheduled_activities cambia. Documenta la reversión.
7. Pruebas: componentes UI (Testing Library + axe), E2E con Playwright del flujo dueño (agregar componente propio → cambiar frecuencia → aceptar advertencia → ver calendario actualizado → restablecer) del flujo Operador (edita una máquina de su sucursal; no ve configuración de cuenta ni puede editar otra sucursal) y del flujo técnico (solo lectura). Si el modo demo / ux:snapshots de Fase 6 ya existe, agrega estas pantallas a tests/visual/ux-review.routes.ts.
8. Crea docs/tasks/task-f4-22.md.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration (y pnpm ux:snapshots si existe) en verde.

AL TERMINAR dame un "Checklist de revisión" con los pasos exactos para que mis jefes prueben: cambiar una frecuencia, ver la advertencia de garantía, restablecer valores de fábrica entrar como Operador de una sucursal y entrar como un rol sin permiso.
```

**Push** — rama `feat/f4-22-components-ui` · commit `feat(private-web): component and frequency settings in machine record (F4-22)` · reporte `docs/tasks/task-f4-22.md`

---

## P6 — Gate de cierre del complemento RA-01

```text
Monorepo ICE24OS. Las tareas TASK-F4-18 a F4-22 ya están en main. Vas a cerrar el complemento RA-01 de la Fase 4.

Lee: context/TASKS.md (F4-18 a F4-22), context/Requerimientos_Adicionales_v1.1.md, docs/tasks/task-f4-18.md a task-f4-22.md, docs/backlog/phase-4-status.md y docs/qa/phase-4/README.md.

Crea la rama docs/f4-ra01-gate desde main.

1. Ejecuta pnpm check, pnpm build e ICE24_BROWSER_TESTS=1 pnpm test:integration y guarda la evidencia en docs/qa/phase-4/ra-01/ (comandos, fecha, commit y resultado; no inventes resultados).
2. Matriz de trazabilidad RA-01 → RF-TPL-013..016 → D1..D4 → tareas → pruebas que lo cubren. Marca cualquier hueco.
3. Agrega a docs/backlog/phase-4-status.md una sección "Complemento RA-01" con estado, evidencia y pendientes, sin cambiar la aprobación original de la fase. Deja un espacio de aprobación para el responsable (no lo firmes).
4. Verifica que F7-01, F8-01, F8-02 y F8-14 tengan lo que necesitan de estas tareas (funciones, eventos y contratos) y lista lo que les falte.
5. Reporte docs/tasks/task-f4-ra01-gate.md.
```

**Push** — rama `docs/f4-ra01-gate` · commit `docs(qa): phase 4 RA-01 complement exit gate` · reporte `docs/tasks/task-f4-ra01-gate.md`
