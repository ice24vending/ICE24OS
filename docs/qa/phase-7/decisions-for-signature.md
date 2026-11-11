# Decisiones F7 listas para firma

Preparadas el 11/11/2026. **Todas las firmas de esta hoja están pendientes.** Preparar un texto o ejecutar pruebas no aprueba la política. La firma debe indicar versión/commit, opción elegida, fecha y evidencia; cambios posteriores de alcance requieren revisión. No se habilitan banderas, se alteran permisos ni se aplican migraciones con este documento.

## F7-D03 / DEC-018 — descarga, reserva y cuotas

**Decisión propuesta:** descarga explícita de órdenes autorizadas; reserva exclusiva por usuario/dispositivo; vigencia máxima de 72 h, sin prórroga por editar, y máximo 50 MB por orden / 250 MB por dispositivo. Al vencer se bloquea ejecución y se pide reconexión; liberación administrativa requiere motivo y conserva auditoría. Una reserva vencida no impide una descarga nueva aunque aún no se haya limpiado. Borrado local al siguiente acceso cuando corresponde; no prometer borrado remoto instantáneo de un dispositivo sin red. Captura pendiente que ya no puede aplicarse se revisa sin sobrescribir servidor.

**Alternativas:** vigencia 24 h (menos exposición, más reconexiones); 7 días (más autonomía, mayor exposición); otras cuotas (depende de dispositivos/evidencia). **Impacto:** técnicos deben preparar ruta y vigilar tamaño/vigencia; servidor controla reservas y versión; almacenamiento local puede ser desalojado por el navegador. No determina la compra o compatibilidad definitiva de dispositivos de DEC-018, fuera del gate.

**Responsable:** Tech Lead / Seguridad, con Dirección. Evidencia: [F7-18](../../tasks/task-f7-18.md), [protección local](../../decisions/adr-027-offline-local-protection.md), [protocolo físico](field-test-protocol.md).

| Firmante              | Decisión elegida / condición | Fecha | Firma / evidencia |
| --------------------- | ---------------------------- | ----- | ----------------- |
| Tech Lead / Seguridad | Pendiente                    | ___   | ___               |
| Axel Quevedo Zamudio  | Pendiente                    | ___   | ___               |
| Eduardo Ramos         | Pendiente                    | ___   | ___               |

## ADR-027 — protección local

**Decisión propuesta para esta rama:** conservar cifrado AES-256-GCM con clave no exportable, aislamiento cuenta/usuario y datos mínimos; shell público genérico, sin HTML autenticado, API ni tokens en caché. El alcance verificado vive en sessionStorage: al cerrar navegador se exige reconexión. Sin red solo se abre/captura lo descargado con alcance y vigencia válidos. Al reconectar se revalidan permisos/reservas y se ejecuta el borrado de P11 si hubo revocación; se conserva únicamente el recibo mínimo permitido para auditoría. Cerrar sesión elimina datos y llaves del ámbito.

**Alternativas:** solo en línea; app nativa con almacén de claves del OS; permiso local persistente con WebAuthn. Esta última está autorizada para desarrollo en **otra rama**, no se incorpora ni se aprueba aquí: verificación de usuario de dispositivo, máximo cinco intentos, plazo menor de 72 h/reserva, ajuste por cuenta, revocación/revalidación, auditoría y aprobación expresa antes de merge. No confundir esa propuesta con el alcance actual de sessionStorage.

**Riesgos residuales:** XSS/mismo origen, navegador/OS comprometido, dispositivo desbloqueado o extracción de datos; clave no exportable no impide uso por código del origen. Sin red no se conoce revocación; el OS puede desalojar datos. Huella/PIN no sustituye bloqueo de pantalla corporativo, que la app no puede imponer. No prometer recuperar datos desalojados ni borrado remoto inmediato. **Impacto:** aviso visible de reconexión al cerrar, pérdida de autonomía frente a un permiso persistente, menor exposición en equipos compartidos.

**Responsable:** Tech Lead / Seguridad y Dirección. Texto técnico: [ADR-027](../../decisions/adr-027-offline-local-protection.md). Confirmar qué revisión se firma; este paquete no incorpora el prototipo WebAuthn.

| Firmante              | Aceptación de alcance y riesgos | Fecha | Firma / evidencia |
| --------------------- | ------------------------------- | ----- | ----------------- |
| Tech Lead / Seguridad | Pendiente                       | ___   | ___               |
| Axel Quevedo Zamudio  | Pendiente                       | ___   | ___               |
| Eduardo Ramos         | Pendiente                       | ___   | ___               |

## F7-D07 / DEC-009 — procedimiento y piezas en plantillas

**Decisión propuesta:** campos opcionales de procedimiento y piezas previstas por actividad en nuevas versiones de plantilla. Las versiones anteriores explicitan ausencia; no inferir piezas de componentes oficiales. La actividad programada y la orden conservan su definición histórica, aunque cambie la plantilla. **Alternativa:** impedir asignación hasta completar una migración revisada de cada plantilla; aumenta esfuerzo y bloquea operación heredada. **Impacto:** puede haber órdenes históricas sin procedimiento/piezas previstas; no inventar obligatoriedad ni borrar evidencia. La decisión no autoriza migraciones remotas.

**Responsable:** Responsable Técnico y Dirección. Evidencia: [F7-03](../../tasks/task-f7-03.md), [decisiones abiertas](../../backlog/open-decisions.md).

| Firmante             | Opción y condiciones | Fecha | Firma / evidencia |
| -------------------- | -------------------- | ----- | ----------------- |
| Responsable Técnico  | Pendiente            | ___   | ___               |
| Axel Quevedo Zamudio | Pendiente            | ___   | ___               |
| Eduardo Ramos        | Pendiente            | ___   | ___               |

## ADR-026 — demo en Preview protegido

**Decisión propuesta:** revisión local por defecto. Activar Preview solo en proyecto separado sin credenciales/URLs reales, con Deployment Protection verificada sin sesión, datos ficticios, banner y noindex; jamás en Production. Las banderas de aprobación/verificación son attestaciones, no protección. **Alternativas:** mantener revisión local (menor exposición, instalación necesaria); Preview público rechazado. **Impacto:** requiere dueño del proyecto para protección y comprobación en cada activación; una sesión de protección puede ser necesaria antes del trabajo offline.

**Responsable:** Dirección, Tech Lead / Seguridad; administrador de Vercel ejecuta después de firmas. Procedimiento exacto, rollback y variables: [ADR-026](../../decisions/adr-026-protected-preview-demo.md). Estado: **pendiente; no activar por esta preparación**.

| Firmante              | Decisión / condiciones | Fecha | Firma / evidencia |
| --------------------- | ---------------------- | ----- | ----------------- |
| Axel Quevedo Zamudio  | Pendiente              | ___   | ___               |
| Eduardo Ramos         | Pendiente              | ___   | ___               |
| Tech Lead / Seguridad | Pendiente              | ___   | ___               |

Las otras propuestas F7-D01/D02/D04/D05/D06 siguen pendientes con sus responsables en [estado F7](../../backlog/phase-7-status.md); ninguna se aprueba por omisión en esta hoja.
