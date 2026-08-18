# Navegadores, dispositivos y conectividad objetivo

Estado: propuesta para MVP-1; se valida con inventario real del piloto.

## Soporte

| Superficie | Nivel A: probado en cada release | Nivel B: compatible por política | No soportado |
|---|---|---|---|
| Escritorio | Chrome y Edge actuales en Windows 11; Safari actual en macOS | últimas 2 versiones mayores de Chrome, Edge, Firefox y Safari | IE, navegadores embebidos desconocidos |
| Móvil campo | Chrome actual en Android 11+; Safari/PWA en las 2 versiones mayores actuales de iOS | navegadores evergreen equivalentes | Android <=10, dispositivos rooteados/jailbroken |
| Tableta | Chrome Android y Safari iPadOS actuales | últimas 2 versiones mayores | WebViews sin soporte PWA/IndexedDB confiable |
| Portal público | Chrome, Edge, Firefox, Safari últimas 2 mayores | lectores sin JS muestran estado seguro mínimo | bots no autorizados para contenido privado |

Accesibilidad objetivo: WCAG 2.2 AA para flujos MVP-1. Modo oscuro y densidad configurable se difieren; contraste y tamaño táctil no se difieren.

## Dispositivo de referencia de campo

- Android 11+, 4 GB RAM, cámara 8 MP, 2 GB libres, pantalla >= 360 px CSS.
- iPhone compatible con una de las dos versiones mayores actuales de iOS.
- No se exige hardware GPS externo; geolocalización denegada no bloquea mantenimiento.

## Condiciones de red y offline

| Escenario | Comportamiento requerido |
|---|---|
| 4G/Wi-Fi estable | operación completa |
| 3G/alta latencia (400 ms RTT) | lectura/escritura con feedback, cargas reanudables |
| pérdida intermitente | reintentos idempotentes, estado visible |
| sin red | sólo tareas previamente sincronizadas de mantenimiento |

Límite inicial por dispositivo: 7 días, 50 tareas, 200 fotografías o 1 GB, lo que ocurra primero. Al 80% se advierte y se impide descargar más; nunca se borra una operación pendiente. Cerrar sesión, revocar permiso o desactivar usuario elimina datos locales protegidos en cuanto la PWA pueda ejecutar la política. La implementación debe medir cuotas reales y degradar con seguridad.

## Matriz de prueba mínima

- Chrome/Edge Windows: flujo completo y administración.
- Chrome Android y Safari iOS: instalación PWA, cámara, offline, conflicto y reconexión.
- Safari macOS y Firefox: flujos críticos en línea.
- 320% zoom, teclado, lector de pantalla, contraste, reduced motion.
- red lenta, sin red, cuota llena, actualización de service worker y sesión revocada.

Fuentes: PRD 9.5–9.6 y preguntas 87–90; TRD 13 y 80; UI/UX 34; AppFlow 33.

