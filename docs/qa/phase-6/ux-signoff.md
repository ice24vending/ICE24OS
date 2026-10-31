# Formulario de aprobación UX — Fase 6

Fecha de preparación: 24/10/2026. Revisión: `baababe`.

**Aprobación visual (30/10/2026).** Dirección (Axel Quevedo Zamudio y Eduardo Ramos) dio el visto bueno al diseño de pantallas y componentes sobre `main` en `fa28b83` (#58), incluidas las correcciones D-03 (#52–#58). La aprobación fue verbal y la registra el Tech Lead por confirmación del responsable el 30/10/2026, igual que las firmas internas de la Fase 5. La tipografía y el logotipo se aprueban **como provisionales**: DEC-020 sigue abierta. Los recorridos con lector de pantalla quedan cubiertos por la [excepción EXC-F6-01](evidence/20261030-excepcion-d02.md), no por esta aprobación.

Abrir la galería generada en `docs/qa/phase-6/ux-review/index.html` y Storybook (`pnpm storybook`). Consultar [catálogo](../../design-system/catalog.md), [quality gate](ui-quality.md) y [dictamen](evidence/20261024-declaracion-cierre.md). Para cada fila revisar los estados aplicables (normal, carga, vacío, error, sin permiso, lectura, offline y foco) a 375/768/1280 px. Marcar una opción y anotar estados, dispositivo y evidencia en Comentario; duplicar la fila si cambia el resultado por tamaño o estado.

La aprobación visual no certifica accesibilidad funcional. Para cerrar D-02 registrar también lector y versión, navegador, dispositivo, recorrido de autenticación/contexto/dashboard vacío/navegación por rol, uso de teclado, resultado y evidencia. No aprobar una fila con defecto sin resolver.

| Pantalla / componente                         | Aprobado | Cambios solicitados | Comentario                   | Revisor                             | Fecha      |
| --------------------------------------------- | -------- | ------------------- | ---------------------------- | ----------------------------------- | ---------- |
| Paleta y foco (ADR-025)                       | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Tipografía y logotipo provisionales           | [x]      | [ ]                 | Provisional; DEC-020 abierta | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Acceso y autenticación                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Selección inicial de contexto                 | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Shell y menú por cada rol                     | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Selector de cuenta / rol / sucursal / máquina | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Cuentas y máquinas                            | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Configuración de equipo                       | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Auditoría                                     | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Suscripción y modo lectura                    | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Archivos privados                             | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Avisos y notificaciones                       | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Centro de trabajos                            | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Perfil                                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Dashboard vacío                               | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Plantilla de lista                            | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Plantilla de detalle                          | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Flujo por pasos y validaciones                | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Pantalla de campo móvil                       | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Estados globales                              | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Deep link a otra cuenta                       | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Deep link sin permiso                         | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Regresar y cambios no guardados               | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: ALERT                             | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Badge                             | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Banner                            | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Breadcrumbs                       | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Button                            | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: ButtonLink                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Card                              | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Checkbox                          | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Comparator                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: CriticalAlert                     | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: DashboardLayout                   | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: DateField                         | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: DetailLayout                      | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Dialog                            | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: EmptyState                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: FEEDBACK                          | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Field                             | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: FieldError                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: FieldHelp                         | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: ICON                              | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: IconButton                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: JOB                               | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: JobStatus                         | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: KpiCard                           | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: ListLayout                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: MACHINE                           | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: MachineTriad                      | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: MobileOperationalLayout           | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: NavItem                           | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: OPERATIONAL                       | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: PageHeader                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Pagination                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Radio                             | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: RadioGroup                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: READ                              | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: ReadOnlyBanner                    | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: ReadOnlyIndicator                 | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: RequiredMark                      | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: RETRYABLE                         | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: SANITARY                          | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Select                            | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Skeleton                          | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Spinner                           | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: StatusPanel                       | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: StatusTag                         | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Switch                            | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: SYNC                              | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: SyncStatus                        | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: SYSTEM                            | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: SystemState                       | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Table                             | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Tabs                              | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: TECHNICAL                         | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: TextArea                          | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: TextField                         | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: Toast                             | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: ToastProvider                     | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: TONE                              | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: TransitionFeedbackBanner          | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |
| Componente: WizardLayout                      | [x]      | [ ]                 | Aprobación visual global     | Axel Quevedo Zamudio, Eduardo Ramos | 30/10/2026 |

## Recorridos de accesibilidad para cierre

Completar por cada dispositivo; adjuntar evidencia y fallos al comentario. Un espacio vacío significa pendiente.

| Recorrido / dispositivo                            | Aprobado | Cambios solicitados | Comentario                     | Revisor | Fecha |
| -------------------------------------------------- | -------- | ------------------- | ------------------------------ | ------- | ----- |
| Autenticación + teclado + lector / móvil           | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Autenticación + teclado + lector / tableta         | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Autenticación + teclado + lector / escritorio      | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Cambio de contexto + teclado + lector / móvil      | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Cambio de contexto + teclado + lector / tableta    | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Cambio de contexto + teclado + lector / escritorio | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Dashboard vacío + teclado + lector / móvil         | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Dashboard vacío + teclado + lector / tableta       | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Dashboard vacío + teclado + lector / escritorio    | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Navegación por rol + teclado + lector / móvil      | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Navegación por rol + teclado + lector / tableta    | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |
| Navegación por rol + teclado + lector / escritorio | [ ]      | [ ]                 | Pendiente: excepción EXC-F6-01 |         |       |

Firma de Dirección / Producto: Axel Quevedo Zamudio y Eduardo Ramos (aprobación interna, registrada por el Tech Lead) Fecha: 30/10/2026

Firma de UX / QA: Calixto Isaac Galeana Medrano (Tech Lead / QA), aprobación visual; recorridos con lector pendientes por EXC-F6-01 Fecha: 30/10/2026
