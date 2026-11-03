# ADR-026 — Demo en Preview protegido y prueba offline

Fecha: 02/11/2026. Estado: **Propuesto, desactivado**. Responsables: Dirección (Axel Quevedo Zamudio y Eduardo Ramos), Tech Lead y Seguridad. Relacionado con DEC-018 y F7-P0.

## Decisión propuesta

Mantener demo local en development/test. Permitir build de producción únicamente cuando `VERCEL_ENV=preview`, `ICE24_DEMO_MODE=1`, `ICE24_DEMO_PREVIEW_APPROVED=1` y `ICE24_DEMO_PROTECTION_VERIFIED=1`. Nunca permitirlo en `VERCEL_ENV=production`. Las dos últimas banderas son attestaciones operativas, no mecanismos que implementen Deployment Protection.

Usar un proyecto Vercel separado para revisión, sin credenciales ni URLs de API/base de datos reales. Deployment Protection obligatorio y probado sin sesión antes de activar las banderas. No confiar en cabeceras que mande el visitante. Datos exclusivamente ficticios, banner permanente «DEMO — datos ficticios», metadatos noindex. No configurar estas banderas en Production ni en este cambio.

## Activación después de firmas

1. Registrar firmas y fecha real abajo.
2. En el proyecto de revisión: Settings → Deployment Protection; activar protección para Preview y verificar que un navegador sin sesión no entra.
3. Settings → Environment Variables: quitar credenciales reales, apuntar PRIVATE_API_URL a un destino inaccesible y configurar las cuatro variables solo en Preview.
4. Redesplegar Preview; comprobar demo, banner y noindex; confirmar producción sin demo y `/api/demo` con 404.
5. Para revocar: retirar ambas attestaciones, redesplegar y revocar accesos al proyecto.

## Offline real

Un build Preview HTTPS permite service worker aun con NODE_ENV=production. Probar una descarga explícita (P7), luego context.setOffline(true) o modo avión, recargar y reconectar. P0 solo simula estados: el service worker existente no acredita el paquete offline de P6. No cachear rutas API privadas ni sesiones de identidad como atajo. Desarrollo local puede revisar estados sin demostrar persistencia offline.

## Alternativas y riesgos

Mantener revisión exclusivamente local (menor exposición, instalación necesaria); Preview sin protección rechazado. Una variable no demuestra que Vercel siga protegido: el administrador debe verificar protección en cada activación. La protección puede requerir sesión previa antes de quedar offline. El cifrado local y la revocación sin conexión se definen en P6/P11.

| Aprobador | Decisión | Fecha |
| --- | --- | --- |
| Axel Quevedo Zamudio | Pendiente | — |
| Eduardo Ramos | Pendiente | — |
| Tech Lead / Seguridad | Pendiente | — |
