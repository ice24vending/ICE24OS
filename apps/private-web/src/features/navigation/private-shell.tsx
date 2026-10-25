"use client";
import { Breadcrumbs, Icon, NavItem } from "@ice24/ui";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ContextSelector, FocusLostBanner } from "../context/context-selector";
import type { ContextSelectorData } from "../context/model";
import { NotificationBell } from "../notifications/bell";
import {
  breadcrumbsFor,
  bottomDestinations,
  destinationOf,
  groupsOf,
  type NavDestination,
} from "./destinations";

export interface PrivateShellProps {
  /** Authorized destinations, already filtered by the server (F6-07). */
  readonly destinations: readonly NavDestination[];
  /** False when the API could not say what the context may open: the menu explains it. */
  readonly menuAvailable: boolean;
  readonly userName: string | null;
  readonly contextId: string;
  /** Account, role, branch and machine of the topbar selector (F6-08). */
  readonly selector: ContextSelectorData;
  readonly csrfToken: string;
  readonly children: ReactNode;
}

/** Up to two initials for the avatar; null falls back to the user icon. */
const initialsOf = (name: string | null) =>
  name
    ?.split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || null;

function Avatar({ name }: { readonly name: string | null }) {
  const initials = initialsOf(name);
  return (
    <span className="shell-avatar" aria-hidden="true">
      {initials ?? <Icon name="user" />}
    </span>
  );
}

function Wordmark({ href, className }: { readonly href?: string; readonly className: string }) {
  // One inline box: a flex parent (sidebar brand) would drop the space before «OS».
  const content = (
    <span>
      ICE24 <span className="shell-wordmark__suffix">OS</span>
    </span>
  );
  return href ? (
    <a className={className} href={href}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
}

/**
 * Private shell (F6-06, UI_UX §10–11): full-height desktop sidebar with the wordmark, sections and
 * the user (approved reference, ADR-025), collapsible to 72 px, beside the topbar; tablet
 * and mobile open the same menu as a modal drawer (native <dialog>: focus trap, Escape, focus
 * returns to the trigger); mobile adds the bottom bar with at most five items.
 */
export function PrivateShell({
  destinations,
  menuAvailable,
  userName,
  contextId,
  selector,
  csrfToken,
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

  const home = destinations[0]?.href ?? "/access/context";
  const menu = (variant: "sidebar" | "drawer") =>
    menuAvailable ? (
      <div className="shell-menu">
        {groupsOf(destinations).map(([group, items], index) => {
          const id = `shell-${variant}-group-${index}`;
          return (
            <div key={group} className="shell-menu__section">
              <p
                id={id}
                className={
                  variant === "sidebar" && collapsed ? "ids-visually-hidden" : "shell-menu__group"
                }
              >
                {group}
              </p>
              <ul aria-labelledby={id}>
                {items.map((destination) => (
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
            </div>
          );
        })}
      </div>
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
        <Wordmark className="shell-wordmark shell-topbar__wordmark" href={home} />
        <ContextSelector data={selector} csrfToken={csrfToken} />
        <div className="shell-topbar__actions">
          <NotificationBell contextId={contextId} />
          <a className="shell-user" href="/profile">
            <Avatar name={userName} />
            <span className="ids-visually-hidden">{userName ?? "Mi perfil"}</span>
          </a>
        </div>
      </header>

      <aside className="shell-sidebar ids-inverse">
        <div className="shell-sidebar__inner">
          <Wordmark className="shell-wordmark shell-sidebar__brand" href={home} />
          <nav aria-label="Navegación principal" className="shell-sidebar__nav">
            {menu("sidebar")}
          </nav>
          <a
            className="shell-sidebar__user"
            href="/profile"
            title={collapsed ? (userName ?? "Mi perfil") : undefined}
          >
            <Avatar name={userName} />
            <span className={collapsed ? "ids-visually-hidden" : "shell-sidebar__user-name"}>
              {userName ?? "Mi perfil"}
            </span>
          </a>
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
          <Wordmark className="shell-wordmark shell-wordmark--inverse" />
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
        {selector.focusLost && <FocusLostBanner csrfToken={csrfToken} />}
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
