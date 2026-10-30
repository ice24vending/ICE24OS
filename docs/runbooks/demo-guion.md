# Guion de presentación con el modo demo

Recorrido de 15 a 20 minutos para enseñar el avance de ICE24 OS en una llamada. Todos los datos son ficticios (`apps/private-web/src/server/demo/fixtures.ts`); si cambian, actualizar este guion.

## Antes de la llamada (5 min)

1. Arrancar: `ICE24_DEMO_MODE=1 pnpm dev:private`.
2. Abrir `http://localhost:3000/?demo=1` y entrar como **Laura Méndez (Dueña)** en **Hielo Polar del Norte**.
3. Comprobar que el panel **Demo** abre y que la conexión está en «Normal».
4. Compartir solo la ventana del navegador, con el zoom al 100 %.

El modo demo solo funciona en local (`pnpm dev`); un build de producción lo ignora siempre.

El demo **no guarda cambios**. Las acciones permitidas responden «servicio no disponible», y las no permitidas, «sin permiso». Si preguntan, explicar que guardar ya funciona contra la API real y que el demo sirve para enseñar pantallas y permisos.

## Datos de la demo

| Cuenta                 | Tipo                      | Sucursales                  | Máquinas                                                                         |
| ---------------------- | ------------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| Hielo Polar del Norte  | De pago                   | Centro Monterrey, Cumbres   | 8: 5 disponibles, 2 en mantenimiento, 1 fuera de servicio (Purificadora Cumbres) |
| Agua y Hielo del Bajío | Demo (vence en unos días) | Planta León, Punto Irapuato | 4: 2 disponibles, 1 en mantenimiento, 1 apagada                                  |

| Persona              | Rol                       | Qué alcanza                           |
| -------------------- | ------------------------- | ------------------------------------- |
| Laura Méndez         | Dueña                     | Toda la cuenta                        |
| Jorge Salinas        | Administrador de sucursal | Solo su sucursal                      |
| Ana Torres           | Técnica                   | Las máquinas de su sucursal           |
| Carlos Ibarra        | Auditor                   | Ve todo, no puede cambiar nada        |
| Operaciones ICE24    | Operador ICE24            | Administración ICE24                  |
| Administración ICE24 | Administrador ICE24       | Centro de trabajos y auditoría global |

## Recorrido

### 1. La vista de la dueña (4 min)

- **Resumen**: indicadores de la cuenta y vista rápida de máquinas. Señalar que la Purificadora Cumbres aparece fuera de servicio.
- **Avisos**: el aviso de la máquina fuera de servicio y su acción «Ver máquina».
- **Sucursales** y **Máquinas**: las 8 máquinas con su estado; probar el filtro por código (`MTY-0005`) o por nombre.

> Mensaje clave: la dueña ve toda su operación en una pantalla y sabe qué necesita atención.

### 2. Barra superior y selector de contexto (2 min)

- Abrir el selector: elegir **Cumbres** y luego una máquina. Las pantallas se limitan a esa sucursal y máquina.
- Volver a «Todas las sucursales».

### 3. Cada rol ve solo lo suyo (4 min)

Desde el panel **Demo**, cambiar de persona:

- **Jorge Salinas (Administrador de sucursal)**: solo su sucursal; «Configuración de cuenta» no aparece en el menú.
- **Ana Torres (Técnica)**: solo las máquinas de su sucursal; si abre **Auditoría** ve «Sin permiso».
- **Carlos Ibarra (Auditor)**: ve todo, pero los botones de cambio no están disponibles.

> Mensaje clave: los permisos los aplica el servidor, no solo el menú.

### 4. Trazabilidad (3 min)

Volver a **Laura Méndez** y abrir **Auditoría**:

- Unas semanas de historial con quién hizo cada cosa (nombre de la persona, «Sistema» o «Stripe»): cambios de estado, mantenimientos completados, archivos, invitaciones y renovaciones.
- Abrir un evento con valores anteriores y nuevos (cambio de frecuencia) para mostrar el antes y el después.
- Filtrar por resultado: el intento **denegado** del auditor y el archivo **rechazado** por el análisis.

### 5. Archivos privados y suscripción (2 min)

- **Archivos privados**: enseñar el panel de subida y la tabla. Como el demo no guarda, al subir aparece el aviso de servicio no disponible con su folio.
- **Suscripción**: estado del pago y qué acciones hay.
- En el panel **Demo → Cuenta**, cambiar a **Agua y Hielo del Bajío** para enseñar una cuenta demo y su fecha de vencimiento.

### 6. Qué pasa cuando algo falla (3 min)

En el panel **Demo**:

- **Estado de la cuenta → «Solo lectura (pago rechazado)»**: alerta crítica fijada; se puede consultar pero no cambiar.
- **Conexión → «Carga lenta»**: cada pantalla muestra su carga.
- **Conexión → «Error del servicio»**: mensaje claro con folio para soporte y botón de reintento.
- **Conexión → «Sin conexión»**: aviso de que no hay red.

Regresar todo a «Normal» al terminar.

### 7. Personal ICE24 (opcional, 2 min)

- **Administración ICE24 → Centro de trabajos**: un envío de correo fallido después de 5 intentos y cómo se diagnostica.

## Durante la llamada: notas de retroalimentación

Copiar esta tabla en las notas de cada llamada y apuntar sin discutir; priorizar después.

| #   | Pantalla | Quién | Comentario | Tipo (error / cambio / idea) | Prioridad |
| --- | -------- | ----- | ---------- | ---------------------------- | --------- |
| 1   |          |       |            |                              |           |

## Después de la llamada

1. Pasar los comentarios a `docs/backlog/` con la pantalla y la fecha de la llamada.
2. Marcar lo que ya quedó resuelto en la siguiente demo, para abrir la llamada con «esto cambió desde la última vez».
