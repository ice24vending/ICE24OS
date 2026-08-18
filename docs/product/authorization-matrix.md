# Matriz base de autorización

Estado: propuesta versionada `AUTHZ-BASE-v0.1`. La API aplica denegación por defecto y combina rol base con cuenta, sucursal/máquina, relación, acción, clasificación, estado de asociación/suscripción y restricciones técnicas/sanitarias. Ocultar UI no sustituye la autorización de servidor.

## Roles base

| Código | Rol | Ámbito máximo |
|---|---|---|
| IA | ICE24 Admin | global, acción explícita |
| IO | ICE24 Operaciones | global operativo, sin secretos ni cobros |
| OW | Propietario de cuenta | su cuenta y recursos asociados |
| TC | Técnico | asignaciones y máquinas autorizadas |
| OP | Operador | sucursal/máquinas asignadas |
| SA | Responsable sanitario | ámbito sanitario asignado |
| DV | Repartidor | asociaciones, pedidos y evidencia propios |
| RA | Restaurante Admin | su negocio y pedidos |
| AU | Consulta/Auditor | lectura/exportación expresamente concedida |

## Acciones por dominio

Leyenda: `A` administrar, `E` ejecutar/capturar, `R` leer, `P` publicar/aprobar, `—` denegado por base. Toda celda queda limitada por ABAC.

| Dominio | IA | IO | OW | TC | OP | SA | DV | RA | AU |
|---|---|---|---|---|---|---|---|---|---|
| Cuentas/sucursales | A | A | A | R | R | R | — | R propio | R |
| Usuarios/asociaciones | A | A | A | R propio | R propio | R propio | R propio | A negocio | R |
| Máquinas/transferencias | A | A | A/solicitar | R | R | R | R asociadas | R asociadas | R |
| Mantenimiento/tickets | A | A | A | E | E limitado | R | — | — | R |
| Sanidad/bitácoras | A | A | R/E limitada | E asignada | E | A/E/P | — | — | R autorizado |
| Laboratorio/restricciones | A/P | A | R | R | R | A/E/P | — | — | R autorizado |
| Inventario/costos | A | A | A | R/consumo | R limitado | — | — | — | R autorizado |
| Documentos privados | A | A | A | E/R propios | E/R propios | A/E | E/R propios | R propios | R autorizado |
| Publicación/portal | A/P | P | solicitar/P no sanitario | — | — | P sanitario | — | — | R |
| Ventas/tarjetas | A | A | A | — | E autorizado | R | R propio | — | R autorizado |
| Pedidos/reparto | A | A | A | — | — | R estado | E propios | A/E propios | R autorizado |
| Suscripción/facturación | A | R soporte | A | — | — | — | — | — | R si explícito |
| Auditoría | A/R | R operativo | R cuenta | R propia | R propia | R sanitaria | R propia | R propia | R ámbito |
| Configuración/feature flags | A | E operativa | E delegable | — | — | — | — | — | R |

## Datos sensibles

| Clase | Ejemplos | Regla base |
|---|---|---|
| Pública | proyección publicada, folio público | sólo versión deliberadamente publicada |
| Interna | estado operativo general, catálogos | usuarios autenticados con módulo/ámbito |
| Confidencial | contacto, ubicación precisa, costos, ventas | mínimo privilegio; descarga auditada |
| Restringida | credenciales, recuperación, datos fiscales, originales sanitarios, auditoría sensible | acción nominativa, reautenticación cuando aplique, nunca en logs |

## Acciones reservadas

- Sólo ICE24 Admin: alta global de cuenta, revocación global, override documentado, feature flags globales.
- Propietario no reduce obligaciones sanitarias ni borra historial.
- Publicación sanitaria requiere SA y, cuando la plantilla lo indique, segunda aprobación ICE24.
- Costos/proveedores/ajustes de inventario: OW o ICE24 autorizado.
- Recuperación manual: dos operadores distintos; ningún solicitante se autoaprueba.
- Cuenta en modo lectura conserva lectura/descarga autorizada y bloquea comandos.

Pruebas obligatorias: positiva, negativa por acción, negativa por cuenta, negativa por ámbito, negativa por sensibilidad, asociación revocada, sesión de contexto revocada y modo lectura.

Fuentes: PRD 5–8 y 15.2; TRD 11, 31–37; AppFlow 32.

