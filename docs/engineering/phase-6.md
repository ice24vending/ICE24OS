# Fase 6 — Sistema de diseño, shell privado y navegación

> **Confidencial.** Información propiedad intelectual de ICE24 MX.

| Campo                         | Valor                                                            |
| ----------------------------- | ---------------------------------------------------------------- |
| Documento                     | Guía consolidada de alcance, arquitectura, revisión y validación |
| Fecha de elaboración          | 02/11/2026, America/Mexico_City                                  |
| Alcance                       | F6-00 a F6-12 y gate P10                                         |
| Evidencia de cierre utilizada | Gate del 30/10/2026 sobre `main`, revisión `fa28b83` (#58)       |
| Dictamen registrado           | Aprobado con excepción EXC-F6-01                                 |

La fase está cerrada con excepción aprobada. Entrega la base visual y de navegación para construir los módulos funcionales. Los 12 recorridos con lector de pantalla siguen pendientes: deben acreditarse antes de la primera UI productiva y, como máximo, en el gate de salida de la Fase 7. Esta guía consolida evidencia histórica; no constituye una nueva ejecución de pruebas ni acredita un despliegue productivo.

## 1. Objetivo y fuentes

La fase establece tokens, componentes accesibles, plantillas de pantalla y estados compartidos; integra un shell responsive con navegación autorizada, selección segura de contexto y protección de cambios sin guardar. También proporciona herramientas de revisión visual y un gate automático de interfaz.

El alcance normativo está en el [plan de implementación](../../context/Implementation_Plan.md), las [tareas](../../context/TASKS.md), [UI_UX](../../context/UI_UX.md), [AppFlow](../../context/AppFlow.md) y las [reglas del proyecto](../../context/PROJECT_RULES.md). El [estado consolidado](../backlog/phase-6-status.md) registra la ejecución P0–P10.

La fuente del dictamen vigente es la [declaración del 30/10/2026](../qa/phase-6/evidence/20261030-declaracion-cierre.md), que reemplaza el rechazo del 24/10. La [matriz de trazabilidad](../qa/phase-6/traceability.md) conserva tablas de la auditoría inicial y una actualización de cierre; sus pendientes históricos deben leerse junto con esa actualización y el [formulario de aprobación UX](../qa/phase-6/ux-signoff.md).

## 2. Entregables

| Tarea                           | Entrega                                                                         | Documentación                                                                |
| ------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [F6-00](../tasks/task-f6-00.md) | Storybook, modo demo y galería para revisión con datos ficticios                | [Guía de revisión](../qa/phase-6/README.md)                                  |
| [F6-01](../tasks/task-f6-01.md) | Paleta y dirección visual aprobadas el 15/10/2026                               | [ADR-025](../decisions/adr-025-brand-palette.md)                             |
| [F6-02](../tasks/task-f6-02.md) | Tokens semánticos de color, tipografía, espaciado y comportamiento responsive   | [Tokens](../design-system/tokens.md)                                         |
| [F6-03](../tasks/task-f6-03.md) | Componentes base: botones, formularios, diálogos, tablas y navegación           | [Componentes base](../design-system/components/base.md)                      |
| [F6-04](../tasks/task-f6-04.md) | Tríada de máquina, alertas, comparación, sincronización, lectura y trabajos     | [Componentes de dominio](../design-system/components/domain.md)              |
| [F6-05](../tasks/task-f6-05.md) | Catálogo, matrices de estados, patrones y maquetas                              | [Catálogo](../design-system/catalog.md)                                      |
| [F6-06](../tasks/task-f6-06.md) | Shell para móvil, tableta y escritorio                                          | [Shell](../design-system/shell.md)                                           |
| [F6-07](../tasks/task-f6-07.md) | Menú por permisos, MFA y módulos habilitados por cuenta; denegaciones auditadas | [Shell y autorización](../design-system/shell.md)                            |
| [F6-08](../tasks/task-f6-08.md) | Selector de cuenta, rol, sucursal y máquina con persistencia segura             | [Selector de contexto](../design-system/shell.md#selector-de-contexto-f6-08) |
| [F6-09](../tasks/task-f6-09.md) | Layouts de lista, detalle, pasos, dashboard y operación móvil                   | [Layouts](../design-system/layouts.md)                                       |
| [F6-10](../tasks/task-f6-10.md) | Estados globales, reintentos y aviso de operaciones locales pendientes          | [Estados](../design-system/states.md)                                        |
| [F6-11](../tasks/task-f6-11.md) | Deep links, retorno con filtros y confirmación de abandono                      | [Navegación](../design-system/navigation.md)                                 |
| [F6-12](../tasks/task-f6-12.md) | Accesibilidad, teclado y regresión visual automatizados                         | [Quality gate](../qa/phase-6/ui-quality.md)                                  |

## 3. Arquitectura y comportamiento

`packages/ui` concentra tokens, componentes y patrones reutilizables. Los layouts reciben datos, estados y acciones mediante su API; no consultan servicios ni deciden permisos. El shell y la integración con el router pertenecen a `apps/private-web`. La API conserva la autoridad sobre identidad, cuenta, ámbito y autorización.

### Navegación autorizada

El registro de destinos define rutas, etiquetas, secciones y permisos. El servidor obtiene las capacidades del contexto y filtra el menú antes de enviarlo al navegador. Cada página protege también el acceso por URL; ocultar un enlace no sustituye la autorización del servicio. Los intentos denegados se registran en auditoría con correlación.

La corrección D-01 (#51) incorporó módulos deshabilitados por cuenta mediante `identity.accounts.disabled_modules`: la API retira sus permisos al resolver el sujeto. El gate registra pruebas negativas de este comportamiento.

El shell usa barra lateral en escritorio, cajón en tableta y hasta cuatro destinos prioritarios más «Más» en móvil. Incluye enlace «Ir al contenido», foco visible y navegación con teclado. Los breakpoints compartidos son `48rem` y `64rem`; las pruebas visuales usan 375, 768 y 1280 px.

### Contexto y sesión

El encabezado muestra cuenta, rol, sucursal y máquina. El selector ofrece únicamente opciones autorizadas. Cambiar de cuenta activa un nuevo contexto y descarta el foco anterior; cambiar de sucursal o máquina valida el ámbito en servidor y audita la selección antes de persistirla en la cookie cifrada de sesión.

El foco guardado nunca concede permisos y se vuelve a validar al cargar. El cambio de contexto fuerza una nueva carga del documento y descarta los datos del contexto anterior. Cuando hay cambios sin guardar, solicita confirmación antes de continuar.

### Enlaces y cambios sin guardar

Los deep links conservan el destino al autenticar y permiten cambiar a otra cuenta autorizada para abrirlo. Un enlace sin acceso no revela la existencia de una cuenta ajena. «Regresar» conserva el origen y los filtros de la lista. `useUnsavedChanges` integra la confirmación de abandono con enlaces, historial, cambio de contexto y cierre o recarga de pestaña.

### Estados y límites funcionales

`SystemState` unifica carga, vacío, error, ausencia de permisos, desconexión y otros resultados. El estado sustituye el contenido del layout sin eliminar su estructura; los banners conviven con los datos. Los errores ofrecen mensajes operativos y, cuando está disponible, folio de soporte. Las escrituras reintentadas conservan su clave de idempotencia; un conflicto requiere actualizar y decidir de nuevo.

La fase aporta componentes de sincronización y avisos de pendientes locales. La plantilla de campo utiliza la cola local; la sincronización funcional corresponde a F7-15. Las maquetas y los indicadores «Sin datos» no acreditan la implementación de mantenimiento, control sanitario ni otros módulos futuros.

## 4. Diseño aprobado y correcciones de cierre

La paleta y dirección visual se aprobaron el 15/10/2026 mediante [ADR-025](../decisions/adr-025-brand-palette.md). La [referencia visual](../design-system/reference/README.md) orienta las pantallas; los tokens y UI_UX conservan la autoridad sobre los valores.

D-03 se cerró con los PR #52–#58: tipografía, barra lateral, encabezado, Resumen de la cuenta, separación de equipos en Máquinas, Sucursales, Configuración de cuenta y Administración ICE24, además de ajustes a auditoría, suscripción, archivos y panel demo. Dirección aprobó el diseño el 30/10/2026; las aprobaciones internas están registradas en el formulario UX y la declaración de cierre.

Montserrat y el wordmark de texto siguen siendo provisionales. La búsqueda global necesita un endpoint autorizado y una decisión de alcance por rol. El indicador de sincronización funcional depende del trabajo offline de la Fase 7.

## 5. Revisión y operación local

| Comando                | Uso                                               |
| ---------------------- | ------------------------------------------------- |
| `pnpm storybook`       | Catálogo interactivo en `http://localhost:6006`   |
| `pnpm storybook:build` | Catálogo estático en `storybook-static`           |
| `pnpm ux:snapshots`    | Galería en `docs/qa/phase-6/ux-review/index.html` |
| `pnpm test:ui`         | Gate de accesibilidad, teclado y regresión visual |

Para abrir la aplicación demo desde PowerShell:

```powershell
$env:ICE24_DEMO_MODE = "1"
pnpm dev:private
```

Abrir `http://localhost:3000/?demo=1`. El panel permite cambiar personas ficticias, cuenta y escenarios de conectividad o acceso. El modo demo está bloqueado en compilaciones de producción; su habilitación segura en Preview sigue pendiente. La [guía QA](../qa/phase-6/README.md) explica cómo revisar las pantallas y los artefactos sin conocimientos técnicos.

## 6. Evidencia histórica de validación

Resultados de la batería del **30/10/2026**, sobre `fa28b83`, con datos locales ficticios. La [declaración de cierre](../qa/phase-6/evidence/20261030-declaracion-cierre.md#batería-ejecutada) enlaza entorno, logs y códigos de salida.

| Validación                                    | Resultado registrado                                      |
| --------------------------------------------- | --------------------------------------------------------- |
| `pnpm check`                                  | Salida 0; 790/790 pruebas en 106 archivos                 |
| `pnpm build`                                  | Salida 0; 14/14 tareas                                    |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Salida 0; 153/153 pruebas en 19 archivos                  |
| `pnpm test:ui`                                | Salida 0; 838/838 comprobaciones                          |
| `pnpm ux:snapshots`                           | Salida 0; 486 capturas, sin observaciones                 |
| `pnpm storybook:build`                        | Salida 0; aviso no bloqueante de chunks mayores de 500 kB |

El PR #58 registró `quality`, `integration` y `ui-quality` en verde antes de fusionarse. No se actualizaron baselines durante la batería. Axe y teclado no sustituyen un lector de pantalla ni demuestran conformidad WCAG completa. No se ejecutaron lector, zoom al 200 %, luz exterior ni guantes; los viewports de Chromium tampoco sustituyen dispositivos reales.

## 7. Pendientes y traspaso a Fase 7

| Pendiente                                                                             | Responsable                                   | Condición o referencia                                                      |
| ------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| Ejecutar y registrar 12 recorridos con lector; corregir hallazgos y retirar EXC-F6-01 | Tech Lead / QA: Calixto Isaac Galeana Medrano | Antes de la primera UI productiva y como máximo al gate de salida de Fase 7 |
| Tipografía y logotipo oficiales                                                       | Dirección / Marketing                         | DEC-020 / ADR-025                                                           |
| Matriz definitiva de navegadores y dispositivos                                       | UX / Tech Lead                                | DEC-018                                                                     |
| Configurar `ui-quality` como check requerido en `main`                                | Administrador del repositorio                 | Configuración remota no acreditada por el gate                              |
| Habilitación segura del demo en Preview                                               | Tech Lead / Seguridad                         | F6-00                                                                       |
| Evaluar división del bundle de Storybook                                              | Tech Lead                                     | O-02, observación no bloqueante                                             |

La [excepción EXC-F6-01](../qa/phase-6/evidence/20261030-excepcion-d02.md) exige registrar lector y versión, navegador, dispositivo, resultado y evidencia en [ux-signoff](../qa/phase-6/ux-signoff.md). Ninguna fase puede declarar UI productiva con esa excepción vigente. El cierre habilita continuar la construcción de los módulos funcionales conservando este compromiso.
