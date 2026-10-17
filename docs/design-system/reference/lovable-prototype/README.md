# ICE24 OS · Prototipo visual

Prototipo de la aplicación privada de operación de máquinas expendedoras de hielo en México.
Solo frontend: los datos son ficticios y viven en memoria, sin backend, sin base de datos y sin autenticación real.

Idioma: español de México · Fechas DD/MM/AAAA · Moneda MXN.

## Cómo abrirlo

```sh
npm install
npm run dev
```

Luego abre la dirección local que aparece en la terminal (por ejemplo http://localhost:8080).

## Qué incluye

- **Resumen** (`/`) — indicadores, alerta prioritaria, tareas y actividad reciente.
- **Sucursales** (`/sucursales`) y detalle de cada sucursal.
- **Máquinas** (`/maquinas`) con filtros por sucursal, operación, técnico y sanidad; detalle en `/maquinas/ICE24-000145`.
- **Mantenimiento** (`/mantenimiento`), **Mis tareas** (`/tareas`), **Control sanitario** (`/sanidad`).
- **Documentos** (`/documentos`), **Centro de alertas** (`/alertas`), **Auditoría** (`/auditoria`), **Suscripción** (`/suscripcion`).
- **Sistema de diseño** (`/design-system`) — paleta, tipografía, botones, campos, estados, banners, tablas y estados vacíos.
- **Inicio de sesión** (`/login`) — simulado, no envía correos.

## Panel Demo

El botón **Demo** (abajo a la derecha) cambia en vivo:

- Rol: Propietario, Administrador de sucursal, Técnico, Solo lectura, Operador ICE24.
- Estado de pantalla: Normal, Cargando, Vacío, Error de servicio, Sin conexión, Sin permiso.
- Estado de sincronización y densidad compacta.

## Estructura

- `src/data/ice24.ts` — datos ficticios y reglas de color por estado.
- `src/components/ice24/` — shell, proveedor de contexto, primitivas, pantallas, sistema de diseño.
- `src/routes/` — una ruta por pantalla.
- `src/styles.css` — tokens de marca y utilidades visuales.

## Hecho con

TanStack Start · TypeScript · React · Tailwind CSS · lucide-react · sonner
