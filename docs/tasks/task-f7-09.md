# TASK-F7-09 — Base IndexedDB y protección local

Implementación local P6, 04/11/2026. IndexedDB v2 preserva pendientes v1 y añade órdenes, borradores, evidencia binaria, operaciones cifradas, metadatos y llaves. Cada registro nuevo contiene cuenta/usuario; lecturas por clave compuesta, vencimiento y autenticación AES-GCM. Pendientes v1 sin autor permanecen retenidos y no se muestran a un usuario inferido.

Contenido y metadatos se guardan en una transacción; cuota llena o almacenamiento bloqueado conservan la versión anterior y devuelven estados distinguibles. SyncStatus incluye historias y galería de almacenamiento lleno/no disponible. El shell privado obtiene el usuario desde `/me`; la cola existente filtra por cuenta y usuario. Logout borra todos los almacenes y llaves; `Clear-Site-Data` sigue siendo respaldo del BFF.

Política provisional, riesgos y reversión: [ADR-027](../decisions/adr-027-offline-local-protection.md). Shell mínimo de consulta detrás de `NEXT_PUBLIC_ICE24_OFFLINE_SHELL=1`, desactivado por defecto. No cachea respuestas privadas. P7 suministra paquetes autorizados y P9 habilita edición offline; no se presentan como implementados por esta base.

Pruebas fake-indexeddb: migración, cifrado y blobs, aislamiento, reapertura, corrupción, caducidad, cuota con rollback, navegador bloqueado y borrado completo. Resultados completos: [registro conjunto](../qa/phase-7/execution-offline-validation.md).
