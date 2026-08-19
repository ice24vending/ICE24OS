# ADR-019 — Correo, mapas, antimalware y almacenamiento

- Estado: en revisión de costo y privacidad.
- Fecha: 18/08/2026.

## Proveedores seleccionados

| Capacidad | Proveedor | Decisión |
|---|---|---|
| Almacenamiento | Supabase Storage | Buckets privados separados para cuarentena, originales y derivados; políticas RLS, versionado lógico, ciclo de vida y URLs firmadas temporales |
| Antimalware | Pendiente de selección | El proveedor o servicio debe operar mediante adaptador, acceder sólo a cuarentena y mantener el archivo bloqueado ante fallo o timeout |
| Correo | Resend, iniciando en capa gratuita | Envío transaccional mediante adaptador, DKIM/SPF/DMARC, webhooks, rebotes y supresión; para archivos grandes se usa enlace temporal |
| Mapas | Mapbox, iniciando en capa gratuita | Mapas web y geocodificación detrás de un puerto sustituible; PostgreSQL/PostGIS conserva reglas y zonas |

## Presupuesto inicial

- El gasto fijo total de plataforma e integraciones no puede exceder **$2,000 MXN al mes** sin aprobación presupuestaria.
- Cada proveedor tendrá alertas y, cuando sea posible, cuotas duras; ninguna integración puede generar costo ilimitado.
- Resend, Mapbox, monitoreo y analítica comienzan en capas gratuitas compatibles.
- Supabase Storage y transferencia forman parte del tope de plataforma del ADR-015.
- La solución antimalware debe contar con estimación y aprobación antes de contratarse.

Las cifras son límites de control, no cotizaciones; se deben validar precios, impuestos, tipo de cambio y volumen real antes del alta.

## Alternativas descartadas

- Archivos dentro de PostgreSQL: contradice los invariantes de arquitectura.
- VirusTotal o una API que reutilice muestras: podría transferir archivos sensibles fuera del entorno controlado.
- Google Maps como primera opción: Mapbox conserva una entrada de costo más predecible y se mantiene reemplazable.
- SMTP genérico o servidor propio: pierde manejo consistente de reputación, rebotes y eventos.

## Riesgos

Supabase, Resend y Mapbox pueden procesar datos fuera de México; Legal debe aprobar DPA, destinatarios, contenido mínimo, consentimiento y transferencias. El mecanismo antimalware requiere probar archivos limpios, infectados, comprimidos y fallos. Si el escáner no está disponible, el archivo permanece en cuarentena y ningún flujo lo consume.

Fuentes: TRD 17–20 y 80; ADR-015; `context/SaaS_Budget_Limits_Architecture.md`.
