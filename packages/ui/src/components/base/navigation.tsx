import type { ComponentPropsWithRef, ReactNode } from "react";

import { Badge } from "./badge.js";
import { Icon, type IconName } from "./icon.js";
import { cx } from "./shared.js";

export interface NavItemProps extends Omit<ComponentPropsWithRef<"a">, "children"> {
  readonly href: string;
  readonly label: string;
  readonly icon?: IconName | undefined;
  /** Current destination: `aria-current="page"` plus shape, not only color (UI_UX §10.1). */
  readonly current?: boolean;
  /** Pending count; `badgeLabel` says what it counts ("4 órdenes pendientes"). */
  readonly badge?: number | undefined;
  readonly badgeLabel?: string | undefined;
  /**
   * `sidebar`: on brand-900 with a brand-400 indicator. `bottom`: mobile bottom bar with a
   * brand-600 top indicator. `inline`: horizontal list on a light surface.
   */
  readonly variant?: "sidebar" | "bottom" | "inline";
  /** Collapsed sidebar (72 px): only the icon is visible; the label stays as the name. */
  readonly collapsed?: boolean;
}

/**
 * One destination of the navigation. The list of destinations comes from the permissions the API
 * returns (`authorize()`); this component only draws what it receives (F6-07).
 */
export function NavItem({
  label,
  icon,
  current = false,
  badge,
  badgeLabel,
  variant = "sidebar",
  collapsed = false,
  className,
  ...rest
}: NavItemProps) {
  return (
    <a
      className={cx(
        "ids-nav-item",
        `ids-nav-item--${variant}`,
        collapsed && "ids-nav-item--collapsed",
        className,
      )}
      aria-current={current ? "page" : undefined}
      {...rest}
    >
      {icon && <Icon name={icon} className="ids-nav-item__icon" />}
      <span className={cx("ids-nav-item__label", collapsed && "ids-visually-hidden")}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge
          tone={variant === "sidebar" ? "neutral" : "danger"}
          label={badgeLabel ?? `${badge} pendientes`}
          className="ids-nav-item__badge"
        >
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
    </a>
  );
}

export interface BreadcrumbItem {
  readonly label: string;
  /** Omit on the last item (current page). */
  readonly href?: string;
}

export interface BreadcrumbsProps {
  readonly items: readonly BreadcrumbItem[];
  readonly label?: string;
  readonly className?: string;
}

/**
 * Path of deep pages (UI_UX §10.4). On mobile it collapses to a back link to the parent and the
 * current title; the full path stays in the markup for screen readers on wider screens.
 */
export function Breadcrumbs({ items, label = "Ruta de navegación", className }: BreadcrumbsProps) {
  const parentIndex = items.length - 2;
  return (
    <nav aria-label={label} className={cx("ids-breadcrumbs", className)}>
      <ol className="ids-breadcrumbs__list">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className={cx(
                "ids-breadcrumbs__item",
                index === parentIndex && "ids-breadcrumbs__item--parent",
                last && "ids-breadcrumbs__item--current",
              )}
            >
              {item.href && !last ? (
                <a href={item.href} className="ids-breadcrumbs__link">
                  {index === parentIndex && (
                    <Icon name="chevron-left" size={16} className="ids-breadcrumbs__back" />
                  )}
                  {item.label}
                </a>
              ) : (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
              {!last && (
                <Icon name="chevron-right" size={16} className="ids-breadcrumbs__separator" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface PaginationProps {
  /** Current page, starting at 1. */
  readonly page: number;
  /** Total pages. Omit it for cursor lists, where only previous and next exist. */
  readonly pageCount?: number | undefined;
  /** For cursor lists: whether there is a next page. */
  readonly hasNextPage?: boolean;
  /** Button pagination (client state). */
  readonly onPageChange?: (page: number) => void;
  /** Link pagination (URL state); takes precedence over `onPageChange`. */
  readonly getHref?: (page: number) => string;
  readonly totalItems?: number | undefined;
  readonly pageSize?: number | undefined;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly className?: string;
}

/** Pages to show: first, last, current ± 1 and `null` for each gap. */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  return sorted.flatMap((n, index) => {
    const previous = sorted[index - 1];
    return previous !== undefined && n - previous > 1 ? [null, n] : [n];
  });
}

/** Table footer pagination: summary, previous/next and numbered pages (numbers hide on mobile). */
export function Pagination({
  page,
  pageCount,
  hasNextPage,
  onPageChange,
  getHref,
  totalItems,
  pageSize,
  disabled = false,
  label = "Paginación",
  className,
}: PaginationProps) {
  const hasNext = pageCount !== undefined ? page < pageCount : Boolean(hasNextPage);
  const control = (
    target: number,
    content: ReactNode,
    options: { readonly current?: boolean; readonly enabled: boolean; readonly edge?: boolean },
  ) => {
    const classes = cx(
      "ids-pagination__control",
      options.edge && "ids-pagination__control--edge",
      options.current && "ids-pagination__control--current",
    );
    if (options.current)
      return (
        <span className={classes} aria-current="page">
          {content}
        </span>
      );
    if (!options.enabled)
      return (
        <button type="button" className={classes} disabled>
          {content}
        </button>
      );
    if (getHref)
      return (
        <a className={classes} href={getHref(target)}>
          {content}
        </a>
      );
    return (
      <button type="button" className={classes} onClick={() => onPageChange?.(target)}>
        {content}
      </button>
    );
  };
  const from = totalItems && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const to = from && pageSize && totalItems ? Math.min(page * pageSize, totalItems) : undefined;
  return (
    <nav aria-label={label} className={cx("ids-pagination", className)}>
      <p className="ids-pagination__summary">
        {from && to && totalItems
          ? `Mostrando ${from}–${to} de ${totalItems}`
          : pageCount
            ? `Página ${page} de ${pageCount}`
            : `Página ${page}`}
      </p>
      <ul className="ids-pagination__list">
        <li>
          {control(
            page - 1,
            <>
              <Icon name="chevron-left" size={16} />
              <span className="ids-pagination__edge-text">
                Anterior<span className="ids-visually-hidden"> página</span>
              </span>
            </>,
            { enabled: !disabled && page > 1, edge: true },
          )}
        </li>
        {pageCount !== undefined &&
          pageWindow(page, pageCount).map((n, index) => (
            <li key={n ?? `gap-${index}`} className="ids-pagination__number">
              {n === null ? (
                <span className="ids-pagination__gap" aria-hidden>
                  …
                </span>
              ) : (
                control(
                  n,
                  <>
                    <span className="ids-visually-hidden">Página </span>
                    {n}
                  </>,
                  { current: n === page, enabled: !disabled },
                )
              )}
            </li>
          ))}
        <li>
          {control(
            page + 1,
            <>
              <span className="ids-pagination__edge-text">
                Siguiente<span className="ids-visually-hidden"> página</span>
              </span>
              <Icon name="chevron-right" size={16} />
            </>,
            { enabled: !disabled && hasNext, edge: true },
          )}
        </li>
      </ul>
    </nav>
  );
}
