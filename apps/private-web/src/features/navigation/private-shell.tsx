"use client";
import { Breadcrumbs, Icon, NavItem } from "@ice24/ui";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { NotificationBell } from "../notifications/bell";
import {
  breadcrumbsFor,
  bottomDestinations,
  destinationOf,
  type NavDestination,
} from "./destinations";

export interface PrivateShellProps {
  /** Authorized destinations, already filtered by the server (F6-07). */
  readonly destinations: readonly NavDestination[];
  /** False when the API could not say what the context may open: the menu explains it. */
  readonly menuAvailable: boolean;
  readonly accountName: string | null;
  readonly userName: string | null;
  readonly contextId: string;
  readonly children: ReactNode;
}

/**
 * Private shell (F6-06, UI_UX §10–11): desktop sidebar collapsible to 72 px plus topbar; tablet
 * and mobile open the same menu as a modal drawer (native <dialog>: focus trap, Escape, focus
 * returns to the trigger); mobile adds the bottom bar with at most five items.
 */
export function PrivateShell({
  destinations,
  menuAvailable,
  accountName,
  userName,
  contextId,
  children,
}: PrivateShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const shownPath = useRef(pathname);
  const current = destinationOf(pathname, destinations);
  const crumbs = breadcrumbsFor(pathname, destinations);

  // Client-side route change: close the drawer and move focus to the new page content.
  // Compared with the last path, not a first-render flag: Strict Mode runs effects twice.
  useEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    drawer.current?.close();
    const main = document.getElementById("main-content");
    if (!main) return;
    main.tabIndex = -1;
    main.focus();
  }, [pathname]);

  const menu = (variant: "sidebar" | "drawer") =>
    menuAvailable ? (
      <ul className="shell-menu">
        {destinations.map((destination) => (
          <li key={destination.key}>
            <NavItem
              href={destination.href}
              label={destination.label}
              icon={destination.icon}
              current={destination === current}
              collapsed={variant === "sidebar" && collapsed}
              title={variant === "sidebar" && collapsed ? destination.label : undefined}
            />
          </li>
        ))}
      </ul>
    ) : (
      <p className="shell-menu__unavailable" role="status">
        No fue posible cargar tu menú. Recarga la página; cada pantalla sigue validando tu permiso.
      </p>
    );

  return (
    <div className="shell" data-collapsed={collapsed || undefined}>
      <header className="shell-topbar">
        <button
          type="button"
          className="shell-icon-button shell-topbar__menu"
          aria-label="Abrir menú"
          aria-haspopup="dialog"
          onClick={() => drawer.current?.showModal()}
        >
          <Icon name="menu" />
        </button>
        <a className="shell-wordmark" href={destinations[0]?.href ?? "/access/context"}>
          ICE24 OS
        </a>
        <p className="shell-context">
          <span className="shell-context__label">Cuenta</span>
          <strong>{accountName ?? "Cuenta activa"}</strong>
          <a href="/access/context">Cambiar</a>
        </p>
        <div className="shell-topbar__actions">
          <NotificationBell contextId={contextId} />
          <a className="shell-user" href="/profile">
            <Icon name="user" />
            <span className="shell-user__name">{userName ?? "Mi perfil"}</span>
          </a>
        </div>
      </header>

      <aside className="shell-sidebar ids-inverse">
        <div className="shell-sidebar__inner">
          <nav aria-label="Navegación principal">{menu("sidebar")}</nav>
          <button
            type="button"
            className="shell-collapse"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            <Icon name={collapsed ? "chevron-right" : "chevron-left"} />
            <span className={collapsed ? "ids-visually-hidden" : undefined}>
              {collapsed ? "Expandir menú" : "Contraer menú"}
            </span>
          </button>
        </div>
      </aside>

      <dialog
        ref={drawer}
        className="shell-drawer ids-inverse"
        aria-label="Menú"
        // A click on the backdrop lands on the <dialog> itself.
        onClick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
      >
        <div className="shell-drawer__header">
          <span className="shell-wordmark shell-wordmark--inverse">ICE24 OS</span>
          <button
            type="button"
            className="shell-icon-button"
            aria-label="Cerrar menú"
            onClick={() => drawer.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Navegación principal">{menu("drawer")}</nav>
      </dialog>

      <div className="shell-content">
        {crumbs.length > 1 && <Breadcrumbs items={crumbs} className="shell-breadcrumbs" />}
        {children}
      </div>

      <nav aria-label="Navegación inferior" className="shell-bottom">
        <ul>
          {bottomDestinations(destinations).map((destination) => (
            <li key={destination.key}>
              <NavItem
                variant="bottom"
                href={destination.href}
                label={destination.label}
                icon={destination.icon}
                current={destination === current}
              />
            </li>
          ))}
          <li>
            <button
              type="button"
              className="ids-nav-item ids-nav-item--bottom shell-bottom__more"
              aria-haspopup="dialog"
              onClick={() => drawer.current?.showModal()}
            >
              <Icon name="menu" className="ids-nav-item__icon" />
              <span className="ids-nav-item__label">Más</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
