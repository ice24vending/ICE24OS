# ADR-027 — Protección local y shell offline

Fecha original: 04/11/2026. Revisión para aprobación por mensaje: 11/11/2026. Estado: **Implementación técnica aceptada por Tech Lead (Calixto), 11/11/2026; aceptación de riesgos de negocio pendiente, activación productiva no autorizada**. Relacionado con DEC-018, F7-D03 y ADR-026. Requiere revisión de Calixto (técnica) y Axel/Eduardo (negocio) antes de activación productiva.

## Implementación

IndexedDB v2 conserva intacta la cola v1. Sus filas sin usuario quedan en cuarentena lógica: no se atribuyen al usuario que abra el navegador ni se muestran en otra sesión. La reconciliación de esos pendientes requiere verificar su autor/origen; no se migran por inferencia. Los almacenes nuevos son orders, drafts, evidence, operations, metadata y keys. Todos los registros nuevos contienen usuario y cuenta; las claves incluyen ambos. La API del paquete exige propietario explícito y nunca ofrece lectura global de contenido.

El contenido se cifra con AES-256-GCM, IV aleatorio por escritura y datos adicionales autenticados que vinculan almacén, identidad, orden, versión y fechas. La llave CryptoKey no exportable vive en IndexedDB, separada por cuenta/usuario, con generación para detectar un borrado/reemplazo concurrente. Se elimina con los registros al cerrar sesión. No se guardan tokens de acceso, renovación, cookies ni CSRF. Los consumidores solo deben guardar paquetes mínimos autorizados, nunca objetos de sesión.

La escritura de contenido y metadatos es una transacción; las cuotas se verifican dentro de ella, incluyendo escrituras concurrentes. Propuesta vigente: máximo 50 MB por orden y 250 MB por dispositivo, 72 horas desde descarga. No se amplía la vigencia al guardar borradores. Cuota o bloqueo del navegador producen errores explícitos; no se informa éxito ni se borra el borrador previo. Lecturas corruptas o vencidas se rechazan sin sobrescribir la evidencia. `requestPersistentStorage` solicita persistencia al navegador sin asumir que será concedida.

## Recarga sin conexión

`NEXT_PUBLIC_ICE24_OFFLINE_SHELL=1` habilita el shell mínimo; la aprobación de Preview sigue separada. El worker precarga únicamente recursos públicos genéricos: `/offline-shell.html`, `/offline-shell.js`, `/offline-work.html` y el JS/CSS compilado del editor. El build calcula la versión de caché por contenido; actualizar los assets no borra IndexedDB. Nunca guarda HTML autenticado, RSC, API ni sesiones.

Si falla por red una navegación de mantenimiento, abre la página genérica con lista local, editor o centro de sincronización según ruta. Verifica el alcance local de la pestaña y la vigencia antes de descifrar datos del usuario/cuenta; solo trabaja sobre órdenes ya descargadas. Ese alcance no contiene tokens y vive en sessionStorage, con vigencia limitada. Sin alcance, o después de cerrar navegador, exige reconexión: no elige un usuario de IndexedDB ni restaura permisos por inferencia. F7-18 muestra este límite en Preparar mi ruta y la página sin conexión.

Para revertir, retirar la bandera y desplegar: el registro instala el worker sin caché y elimina las cachés ICE24 anteriores. Deshabilitar la interfaz no elimina los pendientes; su borrado es explícito al terminar sesión. La migración v2 no se revierte destruyendo almacenes.

## Límites y riesgo residual

No protege frente a XSS ejecutado en el mismo origen, un navegador/OS comprometido, acceso físico a una sesión desbloqueada ni modificación de reloj o del código local. Una llave no exportable aún puede utilizarse para descifrar desde ese origen. Los metadatos de identidad y vencimiento no están cifrados. No se puede verificar revocación remota sin red; al reconectar el servidor vuelve a autorizar cada comando, estado, versión y contexto. El navegador puede desalojar datos incluso con persistencia solicitada. No se promete recuperación de evidencia desalojada. P11 implementa revocación verificada y borrado al reconectar, con recibo mínimo de pérdida; su aceptación física y de seguridad sigue pendiente. Una caída temporal no equivale a revocación.

## Evidencia

Pruebas fake-indexeddb: migración con pendientes v1, aislamiento, reapertura de base, blobs cifrados, llave no exportable, caducidad, corrupción, rollback por cuota, almacenamiento bloqueado y borrado transaccional. Ver [F7-09](../tasks/task-f7-09.md). La habilitación de Preview conserva los requisitos de ADR-026; esta bandera no los sustituye.

## Alternativas, impacto y aprobación por mensaje pendiente

Alternativas: operación solo en línea; app nativa con almacén de claves del sistema; permiso persistente con WebAuthn. La última alternativa se desarrolla en `codex/offline-device-unlock-proposal`, separada de F7-18 y de este pulido. Autorización de desarrollo no significa aprobación del ADR ni de merge: verificación de usuario, plazo menor entre 72 h y reserva, cinco intentos, ajuste por cuenta, revalidación/purga y auditoría requieren su revisión propia. No se incorpora implementación WebAuthn aquí.

Impacto actual: el técnico debe preparar descargas y conservar la pestaña; cerrar navegador requiere red. Un dispositivo compartido/desbloqueado y XSS conservan riesgo residual. La política corporativa de bloqueo de pantalla es necesaria; la app no puede forzarla ni garantizar protección ante extracción del dispositivo. Ni cifrado local ni una futura huella/PIN eliminan estos riesgos.

Responsables: Calixto (Tech Lead/QA) y Axel Quevedo Zamudio y Eduardo Ramos. [Paquete completo de decisión y alternativas](../qa/phase-7/decisions-for-signature.md#adr-027--protección-local).

| Firmante | Decisión y revisión/commit | Fecha | Firma / evidencia |
| --- | --- | --- | --- |
| Calixto (Tech Lead/QA) | Pendiente | ___ | ___ |
| Axel Quevedo Zamudio | Pendiente | ___ | ___ |
| Eduardo Ramos | Pendiente | ___ | ___ |


## Dictamen técnico y aprobación de negocio — 11/11/2026

**Aceptada por Tech Lead (Calixto Isaac Galeana Medrano), 11/11/2026**, exclusivamente la propuesta técnica existente de ADR-027. No habilita producción, no acepta por inferencia riesgos de negocio ni incorpora WebAuthn de otra rama. Aprobación de negocio/activación: **pendiente – Axel Quevedo Zamudio y Eduardo Ramos**, por mensaje con captura en docs/qa/phase-7/evidence/. [Alcance exacto y resumen no técnico](../qa/phase-7/decisions-for-signature.md#clasificación-y-estado-vigente--11112026).
