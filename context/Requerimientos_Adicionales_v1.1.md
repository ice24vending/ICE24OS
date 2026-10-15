# ICE24 OS — Requerimientos adicionales v1.1

| Campo | Valor |
|---|---|
| Origen | Reunión de trabajo con dirección ICE24 (octubre 2026) |
| Estado | RA-01 (con decisiones D1–D12) y RA-03 aprobados para implementación; RA-02 como posibilidad; RA-04 pendiente de insumo |
| Documentos afectados | `ICE24_OS_PRD_v1.0.md` (§8.5, §10.1), `TASKS.md` (F4, F7, F8, F9), `Implementation_Plan.md` (F4) |

---

## RA-01 — Componentes y frecuencias configurables por cliente (IMPLEMENTACIÓN DIRECTA)

### Texto original
> Las máquinas deben poder tener sus propias características (componentes); está pensado tanto para máquinas expendedoras de hielo y agua de la empresa (ICE24) como de externos. Tanto características como alertas de sanitización: si bien se define un tiempo de alertas por default, cada cliente decide cada cuánto realizarle el mantenimiento a sus máquinas, así como qué componentes tiene.

### Explicación
1. **Componentes por máquina.** Cada máquina tiene su propia lista de componentes y características. No todas las máquinas de un mismo modelo son iguales (p. ej. una tiene filtro UV y otra no; una externa tiene un compresor distinto).
2. **Aplica a cualquier máquina.** Hielo, agua, ICE24, ICE24 con marca del cliente y equipos externos validados.
3. **Catálogo oficial + catálogo propio.** ICE24 mantiene el catálogo oficial. El cliente puede agregar componentes propios que solo él ve.
4. **Valores por defecto ICE24.** La plantilla del modelo trae componentes sugeridos y frecuencias/alertas por defecto (mantenimiento y sanitización).
5. **El cliente decide.** El cliente puede cambiar cada cuánto se hace el mantenimiento y la sanitización, a nivel cuenta (todas sus máquinas) o por máquina/componente. Si no cambia nada, se usa el default.
6. **Orden de prioridad:** valor de la máquina → valor de la cuenta → default de la plantilla ICE24.

### Reglas
- Cambiar componentes o frecuencias **solo recalcula actividades futuras**; el historial no se toca.
- Todo cambio queda auditado (quién, cuándo, valor anterior y nuevo).
- Se conservan ambos valores (default ICE24 y del cliente) para reportes y trazabilidad sanitaria.
- Al modificar un valor de fábrica se advierte posible pérdida de garantía; existe "Restablecer valores de fábrica".
- Propietario: toda la cuenta. Operador (administrador de sucursal): solo máquinas de sus sucursales.

### Impacto en lo ya documentado
Contradice `RF-TPL-011` y la restricción §10.1-3 del PRD ("el propietario no puede modificar frecuencias"). Ambos fueron ajustados y se agregaron `RF-TPL-013` a `RF-TPL-016`.

### Tareas
| Tarea | Fase | Tipo |
|---|---|---|
| TASK-F4-18 a TASK-F4-22 | 4 (complemento) | Nuevas |
| TASK-F7-01 | 7 | Criterio agregado |
| TASK-F8-01, F8-02, F8-14 | 8 | Criterio agregado |

### Decisiones de dirección (9 de octubre de 2026)
| ID | Pregunta | Decisión |
|---|---|---|
| RA-01-D1 | ¿Frecuencia mínima obligatoria o solo advertencia? | **Solo advertencia.** ICE24 define el tiempo de fábrica de cada componente, pero es editable. Al cambiarlo se muestra un mensaje de que puede perderse la garantía; el cliente decide. Hay un botón para restablecer los valores de fábrica. |
| RA-01-D2 | ¿Qué rol puede cambiar componentes y frecuencias? | **Propietario (OW) y administrador de sucursal.** El administrador de sucursal es el rol existente **Operador (OP)**. El propietario edita toda la cuenta (catálogo propio y frecuencias de cuenta) y cualquier máquina; el Operador solo edita componentes y frecuencias de las máquinas de sus sucursales. Los demás roles solo consultan. (Ampliado el 9 de octubre de 2026.) |
| RA-01-D3 | ¿Un componente propio puede tener sus propios pasos de mantenimiento? | **Sí.** El cliente elige del catálogo de componentes de mantenimiento los que le aplican y les asigna frecuencia; si un componente no existe en el catálogo, puede crearlo con su frecuencia y su actividad. |
| RA-01-D4 | ¿Una frecuencia más relajada afecta el indicador sanitario o el portal público? | **No.** La frecuencia adecuada depende de la zona y de la capacidad del sistema de filtrado de cada máquina. |

### Resoluciones de dirección (14 de octubre de 2026) — consultas de Fase 0, impacto en Fase 8
| ID | Tema | Decisión / regla de negocio |
|---|---|---|
| RA-01-D5 | Transferencia de máquina: historial | **Aceptado.** El nuevo propietario **ve todo el historial anterior** de la máquina (trazabilidad completa). Al tomar la propiedad ajusta los parámetros de mantenimiento como si fuera una máquina nueva en su flota. |
| RA-01-D6 | Transferencia de máquina: frecuencias | **Aceptado.** Al completarse la transferencia, la máquina **restablece las frecuencias a los valores de fábrica**. No hereda las frecuencias personalizadas del propietario anterior (quedan solo en el historial/auditoría). |
| RA-01-D7 | Advertencia de garantía | **Aceptado.** La advertencia de pérdida de garantía (D1) aplica **solo a componentes y valores de fábrica ICE24**. Si el cliente modifica la frecuencia de un componente **propio**, no se muestra advertencia. |
| RA-01-D8 | Frecuencias nivel modelo vs. máquina | **Requerido (ajuste de arquitectura).** (a) Al dar de alta una máquina adopta las frecuencias de su **modelo**. (b) Un cambio dentro de una máquina afecta **solo esa unidad**, y "Restablecer" opera localmente en esa unidad. (c) Se permite configurar la frecuencia **a nivel modelo**. (d) UX opcional: "Aplicar a todas las máquinas existentes de este modelo", siempre con confirmación/aviso explícito previo. |
| RA-01-D9 | Anticipación de alertas de fábrica | **10 días** de anticipación por defecto en las plantillas/actividades de fábrica, para dar margen a pedidos de refacciones e insumos (p. ej. filtros, que se cambian cada 1–1.5 meses). |
| RA-01-D10 | Actividad ↔ componente | Toda actividad de mantenimiento **se liga formalmente a un componente**. El personal de mantenimiento ve **solo los componentes que requieren atención** en la fecha. Si un componente está desactivado o no aplica, sus actividades **no generan órdenes ni pendientes**. |
| RA-01-D11 | Componentes opcionales por modelo/máquina | La plantilla base carga los componentes estándar automáticamente; el cliente puede **agregar cualquier componente del catálogo general** a su modelo/máquina o **deshabilitar** los que no correspondan a su configuración. |
| RA-01-D12 | Catálogo de mediciones sanitarias (F8-01) | **Catálogo unificado.** Mediciones y frecuencias sanitarias son **universales** para todos los equipos; no hay catálogos separados por equipo, se usa un estándar sanitario general. |

**Ajuste al orden de prioridad (punto 6 de la explicación), derivado de D8:** valor de la máquina → valor del modelo (configurado por el cliente) → valor de la cuenta → default de fábrica ICE24.

**Aclaraciones confirmadas por dirección (14 de octubre de 2026):**
- **D6 prevalece sobre D8 en transferencias:** al completarse la transferencia, la máquina vuelve a los valores de **fábrica ICE24**; no adopta las frecuencias del modelo configuradas por el nuevo propietario ni las del anterior.
- **D12 y frecuencia sanitaria:** el catálogo de mediciones sanitarias es universal, pero el cliente **sí puede cambiar la frecuencia sanitaria** (mismo orden de prioridad y reglas de auditoría y garantía de RA-01).
- **D8(d) "Aplicar a todas las máquinas del modelo":** solo afecta a las máquinas que **heredan el valor del modelo**; las que tienen un valor personalizado a nivel máquina no se modifican. El diálogo de confirmación **debe indicarlo explícitamente** al usuario (p. ej. "Se actualizarán N máquinas; M máquinas con frecuencia personalizada no cambiarán").

---

## RA-02 — Experiencia de usuario para nuevos usuarios (POSIBILIDAD)

> Solo se implementará si dirección lo considera realmente necesario. Se evaluará a futuro; **no tiene tareas asignadas**.

1. **Mini tutorial guiado:** recorrido paso a paso en la interfaz que señala qué hace cada sección y botón, con la opción de probarlos. Se podría omitir y repetir desde el perfil.
2. **Cuenta DEMO:** cuenta con datos ficticios (máquinas, sucursales, mantenimientos, ventas) para que el usuario no vea una pantalla vacía y pueda configurar y explorar sin afectar datos reales. Debe estar aislada y reiniciarse periódicamente.

Si se aprueba, encajaría después de la Fase 6 (sistema de diseño) y antes del piloto (Fase 15).

---

## RA-03 — Inventario por máquina

> Inventario de las máquinas: refacciones, tapas y bolsas, y que puedan agregar sus propios inventarios de cada máquina.

Cada máquina tiene su inventario con tres categorías base (refacciones, tapas, bolsas) y el cliente puede agregar conceptos propios. Se integra a la Fase 9 como `TASK-F9-13`.

---

## RA-04 — Expedientes sanitarios

> Expedientes sanitarios: son todos los que se muestran en la imagen.

**Pendiente:** se requiere la imagen de referencia para listar los expedientes y mapearlos contra la Fase 8 (bitácoras/análisis) y la Fase 10 (documentos).
