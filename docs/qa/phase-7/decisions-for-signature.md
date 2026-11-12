# Decisiones F7 listas para aprobación por mensaje

Preparadas el 11/11/2026. **Aprobaciones de negocio pendientes; aceptación técnica delimitada en la clasificación vigente.** Preparar un texto o ejecutar pruebas no aprueba la política. El mensaje debe indicar versión/commit, opción elegida, fecha y evidencia; cambios posteriores de alcance requieren revisión. No se habilitan banderas, se alteran permisos ni se aplican migraciones con este documento.

## F7-D03 / DEC-018 — descarga, reserva y cuotas

**Decisión propuesta:** descarga explícita de órdenes autorizadas; reserva exclusiva por usuario/dispositivo; vigencia máxima de 72 h, sin prórroga por editar, y máximo 50 MB por orden / 250 MB por dispositivo. Al vencer se bloquea ejecución y se pide reconexión; liberación administrativa requiere motivo y conserva auditoría. Una reserva vencida no impide una descarga nueva aunque aún no se haya limpiado. Borrado local al siguiente acceso cuando corresponde; no prometer borrado remoto instantáneo de un dispositivo sin red. Captura pendiente que ya no puede aplicarse se revisa sin sobrescribir servidor.

**Alternativas:** vigencia 24 h (menos exposición, más reconexiones); 7 días (más autonomía, mayor exposición); otras cuotas (depende de dispositivos/evidencia). **Impacto:** técnicos deben preparar ruta y vigilar tamaño/vigencia; servidor controla reservas y versión; almacenamiento local puede ser desalojado por el navegador. No determina la compra o compatibilidad definitiva de dispositivos de DEC-018, fuera del gate.

**Responsable:** Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador), con Axel Quevedo Zamudio y Eduardo Ramos. Evidencia: [F7-18](../../tasks/task-f7-18.md), [protección local](../../decisions/adr-027-offline-local-protection.md), [protocolo físico](field-test-protocol.md).

| Aprobador                                                      | Decisión elegida / condición | Fecha | Mensaje / captura |
| -------------------------------------------------------------- | ---------------------------- | ----- | ----------------- |
| Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) | Pendiente                    | ___   | ___               |
| Axel Quevedo Zamudio                                           | Pendiente                    | ___   | ___               |
| Eduardo Ramos                                                  | Pendiente                    | ___   | ___               |

## ADR-027 — protección local

**Decisión propuesta para esta rama:** conservar cifrado AES-256-GCM con clave no exportable, aislamiento cuenta/usuario y datos mínimos; shell público genérico, sin HTML autenticado, API ni tokens en caché. El alcance verificado vive en sessionStorage: al cerrar navegador se exige reconexión. Sin red solo se abre/captura lo descargado con alcance y vigencia válidos. Al reconectar se revalidan permisos/reservas y se ejecuta el borrado de P11 si hubo revocación; se conserva únicamente el recibo mínimo permitido para auditoría. Cerrar sesión elimina datos y llaves del ámbito.

**Alternativas:** solo en línea; app nativa con almacén de claves del OS; permiso local persistente con WebAuthn. Esta última está autorizada para desarrollo en **otra rama**, no se incorpora ni se aprueba aquí: verificación de usuario de dispositivo, máximo cinco intentos, plazo menor de 72 h/reserva, ajuste por cuenta, revocación/revalidación, auditoría y aprobación expresa antes de merge. No confundir esa propuesta con el alcance actual de sessionStorage.

**Riesgos residuales:** XSS/mismo origen, navegador/OS comprometido, dispositivo desbloqueado o extracción de datos; clave no exportable no impide uso por código del origen. Sin red no se conoce revocación; el OS puede desalojar datos. Huella/PIN no sustituye bloqueo de pantalla corporativo, que la app no puede imponer. No prometer recuperar datos desalojados ni borrado remoto inmediato. **Impacto:** aviso visible de reconexión al cerrar, pérdida de autonomía frente a un permiso persistente, menor exposición en equipos compartidos.

**Responsable:** Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) y Axel Quevedo Zamudio y Eduardo Ramos. Texto técnico: [ADR-027](../../decisions/adr-027-offline-local-protection.md). Confirmar qué revisión se aprueba; este paquete no incorpora el prototipo WebAuthn.

| Aprobador                                                      | Aceptación de alcance y riesgos | Fecha | Mensaje / captura |
| -------------------------------------------------------------- | ------------------------------- | ----- | ----------------- |
| Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) | Pendiente                       | ___   | ___               |
| Axel Quevedo Zamudio                                           | Pendiente                       | ___   | ___               |
| Eduardo Ramos                                                  | Pendiente                       | ___   | ___               |

## F7-D07 / DEC-009 — procedimiento y piezas en plantillas

**Decisión propuesta:** campos opcionales de procedimiento y piezas previstas por actividad en nuevas versiones de plantilla. Las versiones anteriores explicitan ausencia; no inferir piezas de componentes oficiales. La actividad programada y la orden conservan su definición histórica, aunque cambie la plantilla. **Alternativa:** impedir asignación hasta completar una migración revisada de cada plantilla; aumenta esfuerzo y bloquea operación heredada. **Impacto:** puede haber órdenes históricas sin procedimiento/piezas previstas; no inventar obligatoriedad ni borrar evidencia. La decisión no autoriza migraciones remotas.

**Responsable:** Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) y Axel Quevedo Zamudio y Eduardo Ramos. Evidencia: [F7-03](../../tasks/task-f7-03.md), [decisiones abiertas](../../backlog/open-decisions.md).

| Aprobador                                                      | Opción y condiciones | Fecha | Mensaje / captura |
| -------------------------------------------------------------- | -------------------- | ----- | ----------------- |
| Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) | Pendiente            | ___   | ___               |
| Axel Quevedo Zamudio                                           | Pendiente            | ___   | ___               |
| Eduardo Ramos                                                  | Pendiente            | ___   | ___               |

## ADR-026 — demo en Preview protegido

**Decisión propuesta:** revisión local por defecto. Activar Preview solo en proyecto separado sin credenciales/URLs reales, con Deployment Protection verificada sin sesión, datos ficticios, banner y noindex; jamás en Production. Las banderas de aprobación/verificación son attestaciones, no protección. **Alternativas:** mantener revisión local (menor exposición, instalación necesaria); Preview público rechazado. **Impacto:** requiere dueño del proyecto para protección y comprobación en cada activación; una sesión de protección puede ser necesaria antes del trabajo offline.

**Responsable:** Axel Quevedo Zamudio y Eduardo Ramos, Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador); administrador de Vercel ejecuta después de aprobación por mensaje. Procedimiento exacto, rollback y variables: [ADR-026](../../decisions/adr-026-protected-preview-demo.md). Estado: **pendiente; no activar por esta preparación**.

| Aprobador                                                      | Decisión / condiciones | Fecha | Mensaje / captura |
| -------------------------------------------------------------- | ---------------------- | ----- | ----------------- |
| Axel Quevedo Zamudio                                           | Pendiente              | ___   | ___               |
| Eduardo Ramos                                                  | Pendiente              | ___   | ___               |
| Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) | Pendiente              | ___   | ___               |

Las propuestas F7-D01/D02/D04/D05 conservan aprobación de negocio pendiente; F7-D06 tiene aceptación técnica explícita, delimitada abajo. Ninguna política se aprueba por omisión.

> Organización vigente, 11/11/2026: Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) reúne desarrollo, verificación técnica y QA; no hay áreas separadas de Producto o Seguridad. Las decisiones de negocio corresponden a Axel Quevedo Zamudio y Eduardo Ramos. No se exige firma impresa: aprobación por mensaje, con captura guardada en docs/qa/phase-7/evidence/. Las menciones históricas de responsabilidades se interpretan con esta asignación; no acreditan aprobaciones nuevas.

## Clasificación y estado vigente — 11/11/2026

Por instrucción expresa del usuario, los aspectos **puramente técnicos** indicados aquí quedan **Aceptados por Tech Lead (Calixto Isaac Galeana Medrano), 11/11/2026**. Se conserva la propuesta ya escrita; no se inventan alternativas ni se aprueban sus consecuencias de negocio por asociación. Las demás aprobaciones son por mensaje, con captura guardada en docs/qa/phase-7/evidence/.

| Decisión | Dictamen técnico                                                                                                                                            | Decisión de negocio (resumen para Axel y Eduardo)                                                                                           | Estado de negocio                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| F7-D01   | Aceptado por Tech Lead, 11/11/2026: evidencia versionada, compresión verificable sin eliminar original, respaldo accesible                                  | Qué evidencia exigir en cada trabajo, límites de fotos y aceptación de firma por nombre                                                     | Pendiente – Axel y Eduardo                 |
| F7-D02   | Conservación inmutable de fuentes y nueva versión ya implementada; no cambia permisos                                                                       | Dueño o administrador de la sucursal resuelve diferencias, con motivo; puede conservar una versión o combinar campos                        | Pendiente – Axel y Eduardo                 |
| F7-D03   | Implementación de cuota y caducidad probada; esto no aprueba valores                                                                                        | Descargas por 72 horas; 50 MB por orden y 250 MB por dispositivo; reserva exclusiva y liberación administrativa con motivo                  | Pendiente – Axel y Eduardo                 |
| F7-D04   | Controles existentes preservados; no se otorgan permisos nuevos                                                                                             | Quién revisa, corrige, reabre y anula; la aprobación parcial previa de reapertura no sustituye la política completa                         | Pendiente – Axel y Eduardo                 |
| F7-D05   | Cálculo y pruebas preservados                                                                                                                               | Aviso próximo desde la fecha configurada o siete días; crítica solo si vencida y marcada crítica en plantilla                               | Pendiente – Axel y Eduardo                 |
| F7-D06   | **Aceptada por Tech Lead (Calixto), 11/11/2026**: calendario local de sucursal, ancla y resolución de horas ambiguas/inexistentes según propuesta existente | Sin nueva decisión de negocio en este ajuste técnico                                                                                        | No aplica aprobación adicional; no es gate |
| F7-D07   | Versiones históricas preservadas                                                                                                                            | Permitir procedimiento/piezas opcionales en plantillas anteriores, sin bloquear asignación hasta completar una migración                    | Pendiente – Axel y Eduardo                 |
| ADR-026  | **Aceptada por Tech Lead (Calixto), 11/11/2026**, arquitectura de Preview aislado/protegido, sin credenciales reales                                        | Autorizar una activación concreta de demo externa solo con protección verificada; no se activa ahora                                        | Pendiente – Axel y Eduardo                 |
| ADR-027  | **Aceptada por Tech Lead (Calixto), 11/11/2026**, implementación actual: cifrado, aislamiento, shell genérico y alcance de pestaña                          | Aceptar riesgos de dispositivo compartido/perdido, revocación desconocida sin red y reconexión al cerrar navegador; WebAuthn sigue separado | Pendiente – Axel y Eduardo                 |

No se considera aprobada una decisión mixta completa por aceptar su mecanismo técnico. Adjuntar el mensaje real de negocio y su fecha antes de cambiar «Pendiente». La aprobación UX de WhatsApp del 15/10/2026 no aprueba estas decisiones.
