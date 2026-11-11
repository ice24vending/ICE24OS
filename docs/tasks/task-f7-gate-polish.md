# Pulido F7 — navegación, consulta y densidad operativa

Fecha: 11/11/2026. Rama `codex/f7-gate-polish`, desde `main` `ab00e1f` después de integrar PR #67. Publicación del pulido autorizada por el usuario; sin migraciones. No aprueba el gate F7.

## Alcance por punto

1. Resumen: reutiliza `work-orders` y `maintenance/activities`, paginados en su contexto autorizado. Muestra hasta cinco tareas por criticidad/estado, fecha límite e identificador. El técnico solo ve sus órdenes; supervisión incluye actividades sin asignar y órdenes vencidas o por revisar. Los vínculos son de consulta. Diferencia módulo deshabilitado, ausencia de tareas y fallo de consulta; nunca muestra ausencia de tareas ante error de API. El contexto de sucursal/máquina se conserva.
2. Crear orden sin origen válido: estado guiado con Tickets y Lista de actividades, sin invocar un endpoint con identificadores inválidos. Quien carece de permiso continúa viendo la denegación.
3. `SystemState` no genera reintento para `forbidden`, aunque el llamador pase `onRetry`. El listado denegado ofrece Ir al resumen con icono de inicio; creación/detalle ofrecen Volver a órdenes con icono de lista. Ejecución distingue 403 de error de servicio y mantiene contenedor con padding.
4. Revisión: formulario y confirmación solo si hay acciones autorizadas y escritura habilitada. El registro permanece consultable con controles deshabilitados y explicación. Ejecutar/cerrar no ofrecen mutaciones a quien solo consulta. Breadcrumb y H1 dicen Revisión de la ejecución.
5. Texto operativo sin códigos de decisiones internas: descarga, vigencia, sincronización, maqueta y fundamentos. Las decisiones, cuotas y permisos conservan su estado documental; esto no aprueba F7-D03 ni ADR-027.
6. Tickets: mismo contenedor `private-shell` de órdenes, en lista, creación y detalle; Select del design system para máquina, sistema, componente y prioridad. El componente conserva select nativo accesible con apariencia y ayudas comunes. Sin permiso de creación: aviso informativo y regreso a tickets. Rutas de maqueta ya usaban `private-shell`.
7. Órdenes: filas compactas con folio enlazado, máquina/actividad, estado, vencimiento y responsable; descarga secundaria. Cargar más muestra bloques de 20 y conteo real del lote recibido. API conserva cursor y límite máximo 100: si hay más páginas, el conteo dice explícitamente «órdenes cargadas; hay más páginas», sin inventar un total global. Filtros solo se aplican con Aplicar filtros. Técnico sin filtro de responsable y con su identificador fijado en la consulta. Predeterminada técnico: Asignadas; supervisión: Pendientes de iniciar, vista ya existente. Demo usa Ana Torres.

## Preservación de cambios excluidos

P13/gate, Fase 6, phase-6.docx y archivos auxiliares previos se guardaron con `git stash push -u -m "p13-f6-local"`. Identificador estable: `0bd09235b4746deb9c74a7001df1312789aa0261`.

No restaurar sobre esta rama mientras contenga cambios de pulido. Para recuperarlos después en una rama adecuada: `git stash list`, volver al checkout de los pendientes y ejecutar `git stash apply 0bd09235b4746deb9c74a7001df1312789aa0261`. `apply` conserva el respaldo; revisar antes de eliminarlo. Los documentos de estado/UX comunes pueden requerir combinar sus hunks al restaurar.

B y propuesta WebAuthn permanecen en sus worktrees separados. Ningún cambio de P13/F6 se incorpora a este trabajo. Las capturas históricas que integración regenere se archivan y se restituyen a HEAD después de terminar la suite.

## Verificación

Verificación técnica concluida; aprobación UX y gate F7 pendientes. [Resultados estructurados y hashes de logs](../qa/phase-7/evidence/20261111-f7-gate-polish-validation.json).

- `pnpm check`: 1.071/1.071 pruebas, 139 archivos; tipos, formato, lint, límites, 88 contrastes y catálogo de 53 componentes correctos.
- Build con `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329`: 14/14 tareas correctas.
- Matriz automatizada: seis personas × doce rutas × dos tamaños (390/1280), 144 combinaciones; recorrido aprobado en Linux. Verifica ausencia de códigos, layout sin desbordamiento, padding, 403 sin reintento, formulario de revisión oculto en consulta, filas compactas y estados del resumen.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: 208/208, 21 archivos.
- E2E de mantenimiento Linux: 90/90, sin reintentos.
- Inspección técnica de 587 capturas nuevas/modificadas en 52 hojas y vistas individuales antes/después. [Inventario con SHA-256 y área de diferencia](../qa/phase-7/evidence/20261111-f7-gate-polish-baselines.json).
- Regeneración inicial: 636/640; cuatro fallos correspondían al escenario nuevo sin origen, que no consulta opciones ni tiene ese loading. Se conserva su cobertura con red lenta y guía de origen. Repetición focal de origen/resumen: 100/100. Sin desactivar comprobaciones ni cambiar tolerancias.
- UI Linux integral, sin reintentos: 2.528 aprobadas y 8 diferencias visuales (dos matrices por cuatro resoluciones). Se inspeccionaron y regeneraron esas ocho baselines; repetición final sin actualización: 8/8. Los 2.536 casos quedaron verificados entre ambas pasadas; no se presenta como una única corrida integral verde posterior.
- Suite offline focal: 15/15; regresión focal final de listado/ruta/historias: 80/80.
- Galería: 1.436 capturas, cero observaciones; Storybook compilado con el código final.
- Recorridos: 12/12; los doce videos referidos por el índice existen y no están vacíos. Artefactos en `tmp/f7-polish-artifacts/gallery/index.html` y `tmp/f7-polish-artifacts/videos/index.html`.

Los fallos iniciales se conservan en logs locales: fixture unitario incompleto sustituido por definición demo existente; locators del recorrido ajustados al párrafo de EmptyState y ausencia de panel forbidden; Select Sistema se localiza por rol/nombre accesible para excluir la marca visual de requerido. No se cambian umbrales ni tolerancias.

## Checklist de revisión UX (pendiente)

Ejecutar demo con seis personas: Dueño, Administrador de sucursal, Técnico, Solo lectura, Operador ICE24 y Administrador ICE24. Revisar 390 y 1280 px; capturas también 375/768/1280/1440.

1. ¿Resumen muestra tareas reales, máximo cinco y acceso a todas, y diferencia vacío de módulo deshabilitado?
2. ¿Asignar técnico sin origen explica dónde elegirlo, mientras los roles sin permiso reciben un regreso útil sin reintento?
3. ¿Revisión/ejecución/cierre permiten consultar sin presentar acciones que el rol no puede ejecutar?
4. ¿Tickets conserva margen, selects uniformes y aviso informativo para roles de consulta?
5. ¿La lista del técnico permite identificar orden, fecha y responsable, cargar más y descargar sin tarjetas excesivamente altas?
6. ¿Los textos de descarga/sincronización son comprensibles y las pantallas no muestran códigos de decisiones internas?

Abrir `/summary`, `/maintenance`, tickets/lista/nuevo/detalle, órdenes/lista/nueva/detalle/execute/close/review y `/maintenance/synchronization`. Para órdenes de ejecución demo usar `10000000-0000-4000-8000-0000000007d3`; revisión cerrada `10000000-0000-4000-8000-0000000007d4`; ticket `70000000-0000-4000-8000-000000000384`.

No sustituye lector de pantalla ni pruebas físicas; no firma UX por inferencia. Aprobación de este pulido pendiente.

## Correcciones encontradas durante verificación

La pasada integral detectó baselines adicionales de confirmación de ruta, órdenes filtradas, historias offline y matrices de Tickets/Trabajo sin conexión. Se inspeccionaron las cuatro resoluciones antes de aceptar los cambios. El escenario de completadas declara `view=assigned` para no combinarlo con el nuevo valor inicial de supervisión (pendientes). La descarga móvil conserva ancho compacto y alineación derecha.

La prueba de salida voluntaria espera la navegación antes de contar IndexedDB y reconoce la eliminación completa de la base por `Clear-Site-Data`; no se modifica el código de logout ni se omite la comprobación del borrado. Los intentos iniciales y parciales se conservan en `tmp/`. No se cambiaron tolerancias ni se desactivaron pruebas.

## Archivos tocados

Además de las 587 baselines enumeradas en el manifiesto:

- `apps/private-web/public/sw.js`
- `apps/private-web/src/app/(account)/summary/page.tsx`
- `apps/private-web/src/features/maintenance/review-screen.tsx`
- `apps/private-web/src/features/maintenance/tickets-screen.tsx`
- `apps/private-web/src/features/maintenance/tickets.css`
- `apps/private-web/src/features/navigation/destinations.ts`
- `apps/private-web/src/features/summary/maintenance-tasks.test.ts`
- `apps/private-web/src/features/summary/maintenance-tasks.ts`
- `apps/private-web/src/features/summary/summary-screen.tsx`
- `apps/private-web/src/features/summary/summary.css`
- `apps/private-web/src/features/sync/download-order.tsx`
- `apps/private-web/src/features/sync/offline-status.tsx`
- `apps/private-web/src/features/sync/synchronization-center.tsx`
- `apps/private-web/src/features/work-orders/execution-page.tsx`
- `apps/private-web/src/features/work-orders/execution-screen.stories.tsx`
- `apps/private-web/src/features/work-orders/execution-screen.tsx`
- `apps/private-web/src/features/work-orders/work-orders-page.test.tsx`
- `apps/private-web/src/features/work-orders/work-orders-page.tsx`
- `apps/private-web/src/features/work-orders/work-orders-screen.stories.tsx`
- `apps/private-web/src/features/work-orders/work-orders-screen.test.tsx`
- `apps/private-web/src/features/work-orders/work-orders-screen.tsx`
- `apps/private-web/src/server/demo/work-orders.ts`
- `docs/backlog/phase-7-status.md`
- `docs/modules/maintenance.md`
- `docs/qa/phase-7/evidence/20261111-f7-gate-polish-baselines.json`
- `docs/qa/phase-7/evidence/20261111-f7-gate-polish-validation.json`
- `docs/qa/phase-7/traceability.md`
- `docs/qa/phase-7/ux-signoff.md`
- `docs/tasks/task-f7-gate-polish.md`
- `packages/ui/src/foundations/foundation-kit.tsx`
- `packages/ui/src/patterns/status/system-state.test.tsx`
- `packages/ui/src/patterns/status/system-state.tsx`
- `tests/e2e/maintenance-offline/lifecycle.spec.ts`
- `tests/e2e/maintenance/gate-polish.spec.ts`
- `tests/e2e/maintenance/machine-order-navigation.spec.ts`
- `tests/e2e/maintenance/ticket-photo-flow.ts`
- `tests/e2e/maintenance/tickets.spec.ts`
- `tests/visual/ux-review.routes.ts`

## Correcciones de la revisión externa — 11/11/2026

- Resumen: tareas, máquinas, sucursales, avisos y KPI se consultan en paralelo. Solo estados activos o pendientes de revisión, usando filtros existentes; órdenes y actividades también se consultan en paralelo. Límite explícito de tres páginas de 100 por estado: máximo 18 solicitudes de órdenes y 15 de actividades; técnico no carga actividades y filtra su usuario en servidor. El top cinco mantiene criticidad/estado, fecha e ID sobre lo cargado. `shortcut` documenta cuándo sustituirlo por un top cinco ordenado en API para cuentas mayores; no se afirma exactitud global fuera del límite.
- Fundamentos: aviso «Paleta de marca. La tipografía es provisional y está pendiente de revisión.»; DEC-020 continúa abierta.
- Listado con 403: Ir al resumen (`/summary`, icono de inicio); no vuelve a la misma denegación. Creación/detalle mantienen regreso al listado, con icono de lista. Historia ListaSinPermiso y regresiones.
- Nuevas pruebas: límite incluso con cursor interminable, orden por urgencia al truncar, fin temprano, ausencia de historial cerrado, concurrencia de estados y de todas las secciones, capacidad de lectura y fallo de servicio, salida útil del 403.
- Primer lanzador Linux falló por CRLF en un script temporal; corregido a LF antes de ejecutar pruebas. Comparación visual sin actualizar: 260/284 pasadas y 24 diferencias; todas inspeccionadas antes de aceptar (cuatro hojas en `tmp/f7-review-visual-results`). Se mantienen tolerancias y comprobaciones.
- Integración generó 22 capturas históricas F5/F6: archivadas con hashes en `tmp/f7-review-integration-historical`; originales restaurados. No forman parte del pulido.

Archivos adicionales de esta revisión: `features/summary/load-maintenance-tasks.ts`, `load-maintenance-tasks.test.ts` y `summary-page.test.tsx` dentro de `apps/private-web/src`.

## Validación del candidato corregido — 11/11/2026

- `pnpm check`: 1.076/1.076 pruebas, 141 archivos; formato, lint, tipos, límites, catálogo y 88 contrastes correctos.
- `pnpm build`: 14/14 tareas.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: 208/208, 21 archivos, 293,42 s.
- UI integral Linux, sin actualización de snapshots y sin reintentos: **2.537/2.537**, 22,4 min. Esta sí es una pasada integral verde posterior a las 24 actualizaciones inspeccionadas. Incluye mantenimiento y offline; cifras por proyecto en la evidencia JSON.
- Galería del candidato: 1.436 capturas, cero observaciones. Recorridos: 12/12, los doce videos referidos por el índice existen, no están vacíos y tienen hash. Artefactos en `tmp/f7-review-artifacts/gallery/index.html` y `tmp/f7-review-artifacts/videos/index.html`. Storybook compilado; conserva avisos heredados de directivas/chunks (O-02). La copia del contenedor no incluye `.git`; la evidencia vincula el código validado mediante hashes.

No aprueba UX, lector, campo físico, decisiones ni gate F7.

Publicación autorizada en PR a main, sin merge: 628 archivos (41 de código/pruebas/documentación y 587 baselines). `git diff --cached --check` correcto. El recolector inicial de videos contó también grabaciones auxiliares `page@` y falló su aserción; corregido para verificar las doce referencias de `index.html`. Se completó la evidencia en el commit local antes del push. P13/F6 siguen en el stash hasta crear su rama. UX pendiente – responsable: Usuario solicitante / Dirección.
