# ADR-026 — Demo en Preview protegido y prueba offline

Fecha: 02/11/2026. Estado: **Aceptada técnicamente por Tech Lead (Calixto), 11/11/2026; activación de negocio pendiente, desactivado**. Responsables: Calixto Isaac Galeana Medrano (Tech Lead/QA/desarrollador), Axel Quevedo Zamudio y Eduardo Ramos (negocio). Relacionado con DEC-018 y F7-P0.

## Decisión propuesta

Mantener demo local en development/test. Permitir build de producción únicamente cuando `VERCEL_ENV=preview`, `ICE24_DEMO_MODE=1`, `ICE24_DEMO_PREVIEW_APPROVED=1` y `ICE24_DEMO_PROTECTION_VERIFIED=1`. Nunca permitirlo en `VERCEL_ENV=production`. Las dos últimas banderas son attestaciones operativas, no mecanismos que implementen Deployment Protection.

Usar un proyecto Vercel separado para revisión, sin credenciales ni URLs de API/base de datos reales. Deployment Protection obligatorio y probado sin sesión antes de activar las banderas. No confiar en cabeceras que mande el visitante. Datos exclusivamente ficticios, banner permanente «DEMO — datos ficticios», metadatos noindex. No configurar estas banderas en Production ni en este cambio.

## Activación después de aprobaciones por mensaje

1. Registrar aprobaciones por mensaje y fecha real abajo.
2. En el proyecto de revisión: Settings → Deployment Protection; activar protección para Preview y verificar que un navegador sin sesión no entra.
3. Settings → Environment Variables: quitar credenciales reales, apuntar PRIVATE_API_URL a un destino inaccesible y configurar las cuatro variables solo en Preview.
4. Redesplegar Preview; comprobar demo, banner y noindex; confirmar producción sin demo y `/api/demo` con 404.
5. Para revocar: retirar ambas attestaciones, redesplegar y revocar accesos al proyecto.

## Offline real

Un build Preview HTTPS permite service worker aun con NODE_ENV=production. Probar una descarga explícita (P7), luego context.setOffline(true) o modo avión, recargar y reconectar. La descarga y edición offline ya están implementadas; su disponibilidad en desarrollo y los E2E locales no acreditan protección de un despliegue Preview. Registrar evidencia del proyecto/revisión concreto después de las aprobaciones por mensaje. No cachear rutas API privadas ni sesiones de identidad como atajo. Desarrollo local puede revisar estados sin demostrar persistencia offline.

## Alternativas y riesgos

Mantener revisión exclusivamente local (menor exposición, instalación necesaria); Preview sin protección rechazado. Una variable no demuestra que Vercel siga protegido: el administrador debe verificar protección en cada activación. La protección puede requerir sesión previa antes de quedar offline. El cifrado local y la revocación sin conexión se definen en P6/P11.

| Aprobador | Decisión | Fecha | Mensaje / captura |
| --- | --- | --- | --- |
| Axel Quevedo Zamudio | Pendiente | — | Pendiente |
| Eduardo Ramos | Pendiente | — | Pendiente |
| Calixto (Tech Lead/QA) | Aceptación técnica delimitada abajo; instrucción del usuario en chat | 11/11/2026 | Captura pendiente |

## Versión para aprobación por mensaje — 11/11/2026

La activación y aceptación de negocio conservan su estado pendiente; la aceptación técnica está delimitada abajo; no se activaron banderas ni se modificó Vercel. [Resumen de decisión, alternativas, impacto y aprobaciones por mensaje](../qa/phase-7/decisions-for-signature.md#adr-026--demo-en-preview-protegido). La aprobación por mensaje debe identificar revisión/commit y evidencia de Deployment Protection; el administrador ejecuta la activación únicamente después de aprobación de Axel Quevedo Zamudio y Eduardo Ramos, con verificación técnica de Calixto. El gate F7 no se aprueba con esta preparación.


## Dictamen técnico y aprobación de negocio — 11/11/2026

**Aceptada por Tech Lead (Calixto Isaac Galeana Medrano), 11/11/2026**, exclusivamente la propuesta técnica existente de ADR-026. No habilita producción, no acepta por inferencia riesgos de negocio ni incorpora WebAuthn de otra rama. Aprobación de negocio/activación: **pendiente – Axel Quevedo Zamudio y Eduardo Ramos**, por mensaje con captura en docs/qa/phase-7/evidence/. [Alcance exacto y resumen no técnico](../qa/phase-7/decisions-for-signature.md#clasificación-y-estado-vigente--11112026).
