# ADR-019 — Correo, mapas, antimalware y almacenamiento

- Estado: en revisión de costo y privacidad.
- Fecha: 17/08/2026.

## Proveedores seleccionados

| Capacidad | Proveedor | Decisión |
|---|---|---|
| Almacenamiento | Google Cloud Storage en `northamerica-south1` | buckets privados separados para cuarentena, originales y derivados; Cloud KMS, versionado, lifecycle y URLs firmadas temporales |
| Antimalware | ClamAV en Cloud Run activado por Eventarc | arquitectura de referencia de Google; sólo un resultado limpio habilita promoción; fallo/timeout conserva cuarentena |
| Correo | Resend Pro | envío transaccional mediante adaptador, DKIM/SPF/DMARC, webhooks, rebotes y supresión; nunca adjuntar si supera límite, usar enlace temporal |
| Mapas | Mapbox | mapas web, geocodificación permanente donde corresponda, rutas/matrices detrás de puerto; PostGIS es fuente de reglas y zonas |

## Presupuesto inicial

- Alarmas y cuotas duras por proveedor; ninguna integración puede generar costo ilimitado.
- Mapbox: presupuesto de piloto USD 100/mes, con medición separada de mapas, geocoding permanente, directions y matrix.
- Resend: plan Pro de referencia de USD 20/mes para hasta 50,000 correos; presupuesto máximo inicial USD 50/mes.
- ClamAV: presupuesto de cómputo USD 50/mes, límite de concurrencia y tamaño; definiciones actualizadas mediante Cloud Scheduler.
- Cloud Storage y transferencia forman parte del tope de plataforma del ADR-015.

Las cifras son límites de control, no cotizaciones; validar con calculadoras y volumen real antes de alta.

## Alternativas descartadas

- GuardDuty Malware Protection: administrado, pero específico de AWS e incompatible con la plataforma seleccionada.
- VirusTotal/API externa: implicaría transferir archivos potencialmente sensibles fuera del entorno controlado.
- Archivos dentro de PostgreSQL: contradice los invariantes.
- Google Maps como primera opción: buena cobertura, pero Mapbox ofrece un inicio de costo más predecible y se mantiene reemplazable.
- SMTP genérico o servidor propio: pierde manejo consistente de reputación, rebotes y eventos.

## Riesgos

Resend y Mapbox pueden procesar datos fuera de México; Legal debe aprobar DPA, destinatarios, contenido mínimo, consentimiento y transferencias. ClamAV requiere mantener firmas y probar archivos limpios, infectados, comprimidos y fallos; su servicio no puede acceder al bucket de originales publicados. Si el escáner no está disponible, el archivo permanece en cuarentena y ningún flujo lo consume.

Fuentes: TRD 17–20 y 80; [Mapbox pricing](https://www.mapbox.com/pricing); [arquitectura oficial de escaneo ClamAV en Cloud Storage](https://docs.cloud.google.com/architecture/automate-malware-scanning-for-documents-uploaded-to-cloud-storage/deployment); [Resend pricing](https://resend.com/pricing).
