# Auditoría UI/UX — Mantenimiento y patrones compartidos

Fecha: 2026-11-03. Implementación local sobre el trabajo existente de P3; sin publicación.

## Hallazgos y correcciones

| Problema                                                          | Componentes corregidos                                                                          | Resultado                                                                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| El texto del enlace primario desaparecía al hacer hover           | `packages/ui/src/styles.css`, `components/base/base.css`, `apps/private-web/src/app/styles.css` | `:where(a:hover)` evita que la regla global gane por especificidad; variantes declaran colores de interacción explícitos. |
| Demasiadas acciones sólidas y navegación con aspecto de operación | `ButtonLink`, `NavigationTabs`, pantallas de mantenimiento                                      | Enlaces secundarios por defecto, navegación neutral con indicador activo, creación principal explícita.                   |
| Filtros y acciones de fila competían visualmente                  | `scheduled-screen`, `work-orders-screen`, `equipment/workspace`, `audit/viewer`, trabajos       | Aplicar filtros y asignar son secundarios; limpiar y cancelar son terciarios.                                             |
| Botones deshabilitados demasiado tenues                           | Tokens semánticos y CSS de equipos, auditoría, avisos y trabajos                                | Colores explícitos, sin opacidad que diluya el texto.                                                                     |
| Iconos ausentes o ambiguos                                        | `Icon`, destinos, acciones de archivos, plantillas, suscripción, contexto y mantenimiento       | SVG contextuales; llave inglesa para mantenimiento y deslizadores para configuración.                                     |
| Agrupaciones por fecha presentadas como calendario                | `maintenance-calendar.tsx`, `calendar-dates.ts`, `maintenance.css`                              | Cuadrícula mensual, semana y agenda diaria con navegación y selección.                                                    |
| Asignación ofrecida en actividades terminadas                     | `maintenance-status.ts`, lista y agenda                                                         | Se ofrece únicamente para actividades asignables sin responsable y con permiso.                                           |

Los archivos de componentes compartidos están bajo `packages/ui/src`; los módulos privados, bajo `apps/private-web/src/features`. Se conservaron las restricciones de permisos y los estados de solo lectura.

CSS de módulos revisado: `equipment/equipment.css`, `audit/audit.css`, `jobs/jobs.css`, `notifications/notifications.css` y `maintenance/maintenance.css`. Sus reglas de botones heredados se ajustan a la jerarquía y los estados del sistema compartido.

## Pestañas y filtros implementados

`maintenance-navigation.tsx` utiliza `NavigationTabs` para Calendario, Lista, Tickets y Órdenes. Son enlaces entre rutas, con `aria-current="page"`, nombre accesible e icono; no se simula un tabpanel inexistente. Calendario y Lista conservan los filtros. Mes, Semana y Día son controles locales con `aria-pressed`.

`scheduled-screen.tsx` agrupa los filtros en una superficie delimitada, separa sus acciones y mantiene el modo al limpiar. Elimina la explicación de implementación F7-D05 del producto. El texto de periodo se acorta para evitar truncamiento innecesario.

## Calendario implementado

- Mes: 42 celdas, lunes a domingo; semana: siete días; día: agenda detallada.
- Periodo anterior/siguiente, Hoy, selección de fecha y teclado con flechas, Inicio/Fin y PageUp/PageDown.
- Fechas de actividad calculadas según la zona horaria de su sucursal; pruebas de cambio de mes, año y año bisiesto.
- Rojo: crítica. Ámbar: vencida o próxima. Azul: programada/en atención. Verde: completada. Texto, iconos y leyenda complementan el color.
- Agenda ordenada por urgencia. En móvil se muestran cantidades y criticidad; los detalles permanecen en la agenda del día seleccionado.
- Actividades sin fecha en una sección independiente por uso o condición.

Límite explícito: se conserva la paginación del contrato actual. Si existe otra página, se advierte que los resultados y cantidades son parciales; no se presentan como totales del periodo. Una consulta completa por intervalo requiere extender la carga de datos, fuera de esta corrección visual. No se han inventado nombres de responsables cuando el contrato solo aporta un identificador.

## Convenciones de refactorización

1. Mantener como máximo una acción sólida principal por formulario o contexto; navegación secundaria y acciones repetidas de tabla outline.
2. Usar los componentes compartidos antes de añadir reglas genéricas para `button` o `a`. Las reglas heredadas de módulos excluyen `.ids-button`.
3. Iconos explícitos según intención: crear `plus`, asignar `user-plus`, guardar `save`, editar `edit`, filtrar `filter`, copiar `copy`, subir `upload`, descargar `download`, calendario `calendar`, lista `list`.
4. Repetir un icono para la misma acción es consistente; distinguir destinos con funciones diferentes. Mantenimiento y configuración ya no comparten herramienta.
5. Mantener texto visible para acciones, nombre accesible para controles de solo icono y señales de estado adicionales al color.

## Validación

- `pnpm check`: 943 pruebas en 120 archivos; tipos, lint, formato, 88 pares de contraste y catálogo de 49 componentes correctos.
- `pnpm build`: 14 tareas correctas. Integración con navegador: 181 pruebas en 21 archivos correctas.
- Galería Linux: 1.168 capturas, cero problemas y cero errores HTTP; cinco recorridos visuales verificados. El contenedor aislado no incorpora `.git`, por lo que el manifiesto identifica la revisión como «sin git».
- Pruebas de navegador específicas: cambio de vista y periodo, selección por teclado, jerarquía de tabla, axe y reflow a 375, 768, 1280 y 1440 px; contraste calculado de botones y enlaces en default, hover, focus, active y disabled.
- Matriz Linux: 844 pruebas de accesibilidad correctas y 1.168 capturas generadas. Se corrigió el desbordamiento de la etiqueta de una maqueta y se adaptó el selector del recorrido de ticket a la nueva navegación. La prueba específica del calendario vuelve al inicio antes de medir targets, evitando medir un enlace parcialmente recortado por el encabezado fijo; no se desactivaron reglas de axe. Sus cinco pruebas pasaron después del ajuste.
- Comparación Linux final sin actualizar imágenes: `pnpm test:ui -- --project=visual --project=maintenance --workers=8`, **1.202 pruebas correctas (8,5 min)**: 1.168 comparaciones visuales y 34 casos de mantenimiento. Sumadas a las 844 comprobaciones de accesibilidad anteriores, cubren los 2.046 casos de la matriz. Cero fallos en esta ejecución final. Una baseline regenerada no equivale por sí sola a aprobación humana del diseño.

Capturas inspeccionadas: [escritorio](evidence/20261103-ui-ux-calendar-desktop.png) y [móvil](evidence/20261103-ui-ux-calendar-mobile.png). Son datos demo con reloj de pruebas fijo. Las barras fijas aparecen en su posición de viewport dentro de la captura de página completa.
