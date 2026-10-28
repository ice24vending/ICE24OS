# Componentes base del ICE24 Design System

Estado: implementados el 16/10/2026 ([TASK-F6-03](../../tasks/task-f6-03.md)). Código en `packages/ui/src/components/base`, estilos en `base.css` (solo tokens semánticos), historias en Storybook › **Base** y capturas `componentes-*` en la galería de `pnpm ux:snapshots`.

```tsx
import { Banner, Button, Dialog, Table, TextField } from "@ice24/ui";
import "@ice24/ui/styles.css"; // tokens + componentes, una vez por aplicación
```

## Decisiones

| Tema                     | Decisión                                                                                                                                                                              | Motivo                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitivas accesibles    | **Sin dependencia nueva** (no Radix ni React Aria). Controles nativos (`button`, `input`, `select`, `fieldset`) y patrones WAI-ARIA APG escritos en el paquete (Dialog, Tabs, Toast)  | Los nativos dan teclado, formularios y lectores de pantalla de serie; los tres patrones escritos aquí suman ~430 líneas, probadas con axe y teclado. Una librería añadiría una dependencia crítica (PROJECT_RULES §5.1) para resolver lo que ya resolvía `ConfirmDialog` de F4/F5. Si F6-04 necesita combobox con búsqueda, popover o menú, se reevalúa React Aria con ADR |
| Pruebas de accesibilidad | `axe-core` (ya fijado en el repositorio) mediante `expectNoAxeViolations()` de `axe.test-utils.tsx`, equivalente a `vitest-axe` sin otra dependencia                                  | El contraste se valida aparte con `pnpm check:contrast` porque jsdom no calcula colores                                                                                                                                                                                                                                                                                    |
| Iconos                   | Juego propio de iconos lineales (`Icon`, 24 × 24, trazo 2, extremos redondeados); F6-04 sumó los de dominio                                                                           | UI_UX §8.7; sin dependencia. Dominio: `tool`, `shield`, `drop`, `sync`, `clock`, `pin`, `conflict`, `inbox`…                                                                                                                                                                                                                                                               |
| Clases                   | Prefijo `ids-` (ICE24 Design System), BEM                                                                                                                                             | No choca con las clases de pantallas existentes                                                                                                                                                                                                                                                                                                                            |
| Móvil                    | `@media (width < 48rem)`, breakpoint `md` de los tokens                                                                                                                               | D5 del prototipo: no se usan 600/800/1100 px                                                                                                                                                                                                                                                                                                                               |
| Tamaños de texto         | Escala de UI_UX §7.1: campos 16 px, tablas y ayudas 15 px, chips, encabezados de tabla y navegación inferior 13 px como mínimo; iconos de navegación 24 px y de etiqueta 16 px        | Corrige D2 (el prototipo usa 9–11 px)                                                                                                                                                                                                                                                                                                                                      |
| Monoespaciada            | `font: var(--font-mono)` (pila de los tokens) en folios de tabla                                                                                                                      | Corrige D4                                                                                                                                                                                                                                                                                                                                                                 |
| Tokens nuevos            | `surface-brand-hover` (brand-800) y `border-brand-indicator` (brand-400) para la navegación sobre azul noche; 4 combinaciones nuevas en `check:contrast` (80 en total, todas cumplen) | UI_UX §10.1: destino activo con forma, no solo color                                                                                                                                                                                                                                                                                                                       |
| Modo lectura             | Banner `readonly` = advertencia + candado, igual en barra, banner e indicador                                                                                                         | D3 resuelto en F6-04 ([dominio](domain.md#modo-lectura))                                                                                                                                                                                                                                                                                                                   |

Reglas comunes: foco visible de 3 px (`focus-ring`, `focus-ring-inverse` dentro de `.ids-inverse`); área táctil ≥ 44 px en móvil; ningún estado se comunica solo con color; `prefers-reduced-motion` detiene spinner, skeleton y entrada de toasts.

## Acciones

### Button, IconButton y ButtonLink

| Prop                      | Tipo                                            | Uso                                                                                                   |
| ------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `variant`                 | `primary` · `secondary` · `tertiary` · `danger` | Una sola primaria por región visual                                                                   |
| `size`                    | `sm` · `md` · `lg`                              | `md`/`lg` ≥ 44 px; `sm` (36 px) crece a 44 px en móvil                                                |
| `icon`, `iconPosition`    | `IconName`, `start` · `end`                     | Icono decorativo junto al texto                                                                       |
| `loading`, `loadingLabel` | `boolean`, `string`                             | Bloquea clics y envío del formulario, muestra spinner, conserva el texto (o lo cambia a «Guardando…») |
| `disabledReason`          | `string`                                        | El botón **sigue enfocable**, se anuncia como no disponible y muestra el motivo debajo                |
| `disabled`                | `boolean`                                       | Deshabilitado nativo: sale del orden de tabulación. Úsese solo cuando no hay nada que explicar        |
| `type`                    | `button` (por defecto) · `submit` · `reset`     |                                                                                                       |

- `IconButton` exige `label` (nombre accesible); por defecto es terciario.
- `ButtonLink` es un enlace con aspecto de botón: navegación, no acción («Ver suscripción»).

```tsx
<Button type="submit" loading={saving} loadingLabel="Guardando…">Guardar borrador</Button>
<Button disabledReason="La cuenta está en modo lectura.">Publicar</Button>
<IconButton icon="close" label="Cerrar aviso" onClick={close} />
```

## Formularios

Todos comparten `label` (visible, en oración), `help`, `error`, `required` (asterisco decorativo + `required` nativo), `readOnly`, `disabled`, `hideLabel` e `id`. El error marca `aria-invalid` y se anuncia con el campo (`aria-describedby` = ayuda + error).

| Componente             | Notas                                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextField`            | `type` text/email/tel/url/search/password/number; `prefix` y `suffix` para unidades («ppm», «MXN»). Solo lectura: fondo tenue y borde punteado                                                        |
| `TextArea`             | `showCount` + `maxLength` muestran «n de max caracteres»                                                                                                                                              |
| `Select`               | Nativo (robusto en móvil). `options` con `disabled` para opciones fuera de ámbito; `placeholder` como primera opción. Solo lectura: muestra la etiqueta elegida y envía el valor en un `input hidden` |
| `DateField`            | `input type=date` (o `withTime` → `datetime-local`); valor ISO, el navegador lo muestra DD/MM/AAAA en es-MX; ayuda «Formato DD/MM/AAAA» por defecto; `min`/`max`                                      |
| `Checkbox`             | Fila completa de 44 px; `indeterminate`; solo lectura ignora clic y Espacio                                                                                                                           |
| `RadioGroup` / `Radio` | `fieldset role=radiogroup` con leyenda; flechas nativas; `orientation`; `description` por opción; solo lectura bloquea clic y flechas                                                                 |
| `Switch`               | `checkbox role=switch` para ajustes que se aplican al instante; texto «Activado/Desactivado» junto a la pista                                                                                         |
| `Field`                | Anatomía (etiqueta, control, ayuda, error) para controles a la medida, con `useFieldIds()`                                                                                                            |

```tsx
<TextField label="Correo electrónico" type="email" required error={errors.email} />
<Select label="Sucursal" options={branches} placeholder="Selecciona una sucursal" />
<DateField label="Fecha de servicio" min="2026-01-01" />
```

## Datos y estado

### Table

Columnas tipadas (`TableColumn<Row>`): `header`, `cell`, `sortValue` (activa el orden), `mono` (folios), `numeric`, `mobile` (`title` · `field` · `hidden`) y `priority: "low"` (se oculta por debajo de 1024 px).

| Prop                                                               | Uso                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `caption` (+ `captionHidden`)                                      | Nombre accesible obligatorio                                                                                                   |
| `sort` / `defaultSort` / `onSortChange` / `sortMode`               | Orden propio o controlado; `server` cuando la API ordena. `aria-sort` en la columna activa                                     |
| `selectable` / `selectedIds` / `onSelectionChange` / `getRowLabel` | Casillas por fila («Seleccionar ICE24-000145») y «Seleccionar todas»; contador anunciado                                       |
| `rowActions`                                                       | Acciones por fila, al final (escritorio) o al pie de la tarjeta (móvil)                                                        |
| `loading`, `error`, `empty`                                        | Esqueleto con `aria-busy`; banner de error; `EmptyState`                                                                       |
| `density`                                                          | `comfortable` · `compact` (no cambia el área táctil)                                                                           |
| `responsive`                                                       | Por debajo de 768 px cada fila es una tarjeta con «etiqueta: valor». Los roles ARIA explícitos conservan la semántica de tabla |
| `footer`                                                           | `Pagination` o totales                                                                                                         |

En móvil las columnas no se pueden ordenar (los encabezados se ocultan); los filtros y el orden móvil llegan con los layouts de lista (F6-09).

`EmptyState` (`title`, `description`, `action`): icono brand-600, explicación y una acción principal, que se oculta si el usuario no puede ejecutarla.

### Card

`title`, `titleAs`, `description`, `icon` + `tone` (recuadro tenue: `brand` o un tono de estado), `actions`, `footer`, `padding` (`md` · `lg` · `flush` para tablas) y `as` (`section` nombrada por su título, `article` o `div`).

### StatusTag y Badge

- `StatusTag`: `tone` (`success`, `warning`, `danger`, `info`, `nodata`, `audit`, `offline`), texto, `icon` (por defecto el del tono), `dimension` (se lee antes: «Técnico: Crítico») y `variant` `subtle` · `solid`. Para los tres estados de máquina se usa [`MachineTriad`](domain.md#machinetriad) (F6-04).
- `Badge`: contador (`neutral`, `brand`, `danger`) con `label` para lectores de pantalla («4 pendientes»).

## Mensajes

### Banner

`tone` (`info`, `success`, `warning`, `danger`, `readonly`, `offline`, `audit`), `title`, `titleAs` (`h2` · `h3` · `h4` · `p`), `children`, `actions`, `onDismiss` (solo avisos no persistentes) y `role`:

- `alert` para errores que bloquean; `status` para avisos que llegan después de cargar.
- Sin `role` para banners presentes al cargar la página. Para anunciar cambios posteriores, el contenedor con `aria-live` debe existir antes (como [`ReadOnlyBanner`](domain.md#modo-lectura)).

### Toast

`ToastProvider` (una vez, cerca de la raíz) y `useToast().show({ tone, title, description, action, duration })`. Tonos `info`, `success`, `warning`: no hay `danger` porque los errores que requieren acción y las alertas críticas no usan toast (UI_UX §13.4). Región `aria-live=polite` siempre montada; no mueve el foco; se pausa con el puntero o el foco; `duration: null` lo deja hasta que se cierre; máximo tres visibles. `Toast` también se exporta para composición estática.

### Dialog

`open`, `onClose`, `title`, `description`, `children`, `footer`, `role` (`alertdialog` para confirmaciones sensibles), `size`, `initialFocusRef` y `dismissible` (`false` mientras corre la acción).

Foco al primer control del contenido, Tab y Shift+Tab atrapados, Esc cierra, el resto de la página queda `inert` y sin desplazamiento, y el foco vuelve al botón que lo abrió. En móvil es una hoja inferior con los botones apilados. No se apilan modales (UI_UX §13.6).

```tsx
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  role="alertdialog"
  title="Retirar máquina ICE24-000145"
  description="El historial técnico y sanitario se conserva."
  dismissible={!saving}
  footer={
    <>
      <Button variant="secondary" onClick={close}>
        Cancelar
      </Button>
      <Button variant="danger" loading={saving}>
        Retirar máquina
      </Button>
    </>
  }
>
  <TextArea label="Motivo del retiro" required />
</Dialog>
```

## Navegación

| Componente    | Uso                                                                                                                                                                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tabs`        | Dominios dentro de una entidad, no navegación global. `items` (`id`, `label`, `content`, `disabled`, `badge`), controlado o no, `activation` `automatic` · `manual`. Una parada de tabulación; flechas, Inicio y Fin; salta las deshabilitadas                                                                                         |
| `NavItem`     | Destino con `aria-current="page"`. `variant` `sidebar` (azul noche, indicador brand-400, dentro de `.ids-inverse`), `bottom` (navegación inferior móvil, indicador brand-600) o `inline`; `collapsed` para la barra de 72 px; `badge` + `badgeLabel`. **Solo dibuja**: la lista de destinos sale de los permisos de la API (F6-07, D6) |
| `Breadcrumbs` | `items` (`label`, `href`); el último es la página actual. En móvil queda «‹ Padre» + página actual (UI_UX §10.4)                                                                                                                                                                                                                       |
| `Pagination`  | `page` (desde 1), `pageCount` o `hasNextPage` (listas por cursor), `onPageChange` o `getHref` (estado en la URL), `totalItems` + `pageSize` para «Mostrando 21–40 de 172». En móvil solo Anterior/Siguiente de 44 px                                                                                                                   |

## Cuándo usar cada uno

| Necesidad                                          | Componente                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Confirmar algo reversible y no crítico             | Toast                                                                         |
| Error que exige acción, modo lectura, sin conexión | Banner (persistente)                                                          |
| Decisión sensible antes de ejecutar                | Dialog `alertdialog`                                                          |
| Estado de una entidad en una dimensión             | StatusTag con `dimension`                                                     |
| Contador en menú o pestaña                         | Badge                                                                         |
| Lista de registros comparables                     | Table (tarjetas en móvil)                                                     |
| Bloque de contenido con título                     | Card                                                                          |
| Acción no disponible por permiso o modo lectura    | Button con `disabledReason`, u ocultarla si el usuario nunca podrá ejecutarla |

## Uso en la web privada (F5-15)

Sustituidos: chips de suscripción y de archivos (`StatusTag`), avisos de suscripción y banners globales de modo lectura, suspensión y sin conexión (`Banner`), botones de facturación y acciones de la alerta crítica («Ver detalle», «Marcar enterado», «Atender», «Marcar resuelta») (`Button`). Pendiente para tareas posteriores: `ServiceState` (estados globales, F6-10), tablas y paginación por cursor de auditoría y trabajos (layouts de lista, F6-09), y `ConfirmDialog`/`Tabs` de configuración de equipos (código de Fase 4, fuera de F5-15; se migran cuando se rehaga esa pantalla).
