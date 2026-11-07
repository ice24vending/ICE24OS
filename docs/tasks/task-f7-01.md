# F7-01 — Programación de mantenimiento y KPI

02/11/2026. Implementado localmente después de P0, sin commit ni push y conservando los cambios anteriores. Validación automatizada aprobada; sigue pendiente la aprobación humana de Dirección.

## Comportamiento y requisitos

El calendario existente ahora se consulta por API y por UI-MNT-01/02. El Resumen vuelve a mostrar «Mantenimientos próximos», periodo «Próximos 7 días», icono tool y tono info; enlaza al listado filtrado y respeta contexto, permisos y módulo. Los atrasos siguen disponibles al retirar el periodo, incluso tras recálculos.

Se reutiliza el worker F4 y la frecuencia efectiva máquina → cuenta → plantilla. Se consideran componentes propios activos, fecha de instalación opcional, nueva versión de plantilla y zona horaria de sucursal con reglas DST. Se conservan jobs idempotentes, historial y atrasos; los cambios efectivos se auditan. F7-D05/D06 están visibles como provisionales. No existe relación de actividades con componentes oficiales en F4; no se inventa (RA-01-D3).

API y BFF aplican `authorize()`, aislamiento de cuenta y ámbito por sucursal/máquina. Contratos incluyen paginación, filtros, ventana de aviso y versión de fila; un trigger incrementa versión en actualizaciones. P1 es lectura: la asignación y ejecución real corresponden a P3–P5.

## Archivos

- `packages/contracts/src/private/maintenance`, contratos de identidad/equipo y exportaciones; `packages/database/src/maintenance.ts`; migración `20261102000100_phase7_scheduling.sql`.
- `apps/api/src/modules/maintenance`, registro de módulo y captura opcional de instalación en aprobación de equipo.
- `packages/domain/src/maintenance-calendar*`; `apps/worker/src/processors/scheduling*` y `maintenance-scheduling/`; entrada del worker.
- `apps/private-web/src/app/(account)/maintenance`, `features/maintenance`, integración Resumen/navegación y `server/demo/scheduled-maintenance*`/personas/API.
- `packages/ui/src/components/base/table*` y CSS: región de desplazamiento accesible por teclado, detectada por axe a 768 px. `patterns/layouts/list-layout.tsx` habilita Filtros al hidratar para evitar clics ignorados en móvil.
- Pruebas unitarias, `tests/integration/schedule-recalc.test.ts`, `tests/e2e/maintenance`, `playwright.config.ts`, catálogo y recorridos de revisión.
- Estado, trazabilidad, módulo y [runbook](../runbooks/maintenance.md). [Inventario exacto conjunto](../qa/phase-7/changed-files.txt).

## Validaciones ejecutadas

| Comando                                                       | Resultado real                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                  | Aprobado: 810 pruebas, 110 archivos; lint, tipos, límites, contrastes y catálogo aprobados                                                   |
| `pnpm typecheck:review`                                       | Aprobado                                                                                                                                     |
| `pnpm build`                                                  | 14 tareas aprobadas; repetición sin servidor demo y sin advertencia de caché                                                                 |
| `pnpm exec playwright test --project=maintenance --retries=0` | 12 aprobadas, 0 reintentos; 375/768/1280/1440 px, axe sin infracciones graves/críticas en lista, calendario y siete maquetas P0              |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration`                 | Aprobado tras iniciar Docker: 154 pruebas en 19 suites; evidencia 20261102-integration-docker-verified.txt                                   |
| `pnpm test:ui:update` / `pnpm test:ui`                        | Aprobados en Linux con --workers=8: 1687 pruebas en generación y 1687 en comparación, sin reintentos; 976 baselines, requieren aprobación UX |
| `pnpm ux:snapshots`                                           | Aprobado: 976 capturas sin observaciones; 68 capturas actuales de calendario/lista adicionales en calendar-review                            |
| `pnpm ux:walkthroughs`                                        | 3 recorridos verificados: Resumen/vencidos, ticket/orden/cierre y offline simulado                                                           |

Logs y capturas en `docs/qa/phase-7/evidence/`. La revisión final de filtros está en `docs/qa/phase-7/calendar-review/index.html`; se conservó la galería compartida y se generó evidencia adicional en F7. El error Docker y la recuperación se documentan en el runbook; no se borraron datos. La integración contra PostgreSQL ya acredita consulta/KPI, aislamiento, permisos y auditoría. Se corrigió la expectativa heredada de módulos en ui-services para incluir mantenimiento.

## Checklist de revisión UX

1. `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`; abrir http://localhost:3000/?demo=1 como Dueño. En Resumen abrir el KPI y comprobar `period=next7days`.
2. En móvil abrir Filtros; quitar periodo, elegir Vencida, Aplicar filtros y recargar. Comprobar persistencia y que el atraso permanezca al cambiar a Calendario.
3. Filtrar por máquina/sucursal/responsable. Dueño ve todo su ámbito; Técnico solo sus máquinas autorizadas; Solo lectura consulta sin acciones de modificación. Probar módulo deshabilitado: KPI oculto y acceso directo denegado.
4. Repetir vacío, error, carga, modo lectura y sin conexión con el panel Demo; recorrer con Tab, incluido desplazamiento de tabla. Revisar 375, 768, 1280 y 1440 px.
5. Revisar Storybook y la galería según [guía](../qa/phase-7/README.md). Ver video «Ver mantenimientos vencidos desde el Resumen». Registrar resultado en ux-signoff.

Preguntas sí/no para Dirección:

- ¿El KPI comunica claramente su periodo y abre el listado esperado?
- ¿Se entienden próximo, vencido y crítico por sus etiquetas y colores sin explicación?
- ¿Los filtros y la consulta de atrasos resultan claros en celular?
- ¿El alcance de Dueño, Técnico y Solo lectura coincide con lo esperado?
- ¿Aprueban la ventana provisional de siete días y criticidad por plantilla (F7-D05)?
- ¿Aprueban calendario local, ancla de instalación y tratamiento DST (F7-D06)?

Pendientes: firma UX, 12 recorridos humanos EXC-F6-01, aprobación de decisiones y configuración de ui-quality requerido. Preview sigue desactivado. Migración no aplicada a entornos remotos. No habilitar operación productiva basándose solo en la demo.

Revalidación con Docker: [resultado y conservación de baselines](../qa/phase-7/linux-validation.md). Los cambios adicionales fueron la expectativa de módulos en ui-services y la espera explícita de hidratación antes de axe en el recorrido móvil. No se cambiaron reglas ni umbrales.

## Mejora de navegación — 06/11/2026

Calendario y lista enlazan al expediente existente de Máquinas cuando la sesión tiene capacidad de lectura. El servidor valida UUID y pertenencia al contexto autorizado; un parámetro inválido, repetido o ajeno no selecciona una máquina ni revela su existencia. Se reutilizan foco y desplazamiento, sin drawer ni modal. Inventario de archivos, resultados actuales, riesgos y checklist de cinco preguntas: [dictamen y evidencia](../qa/phase-7/machine-order-navigation.md#enlace-directo-desde-mantenimiento--06112026). UI-MNT-01/02 y este nuevo enlace recibieron aprobación UX explícita el 06/11/2026, registrada en ux-signoff. Las decisiones de negocio y los recorridos humanos con lector conservan sus pendientes independientes.
