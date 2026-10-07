"use client";
import { usePathname } from "next/navigation";
import { NotificationBell } from "../notifications/bell";

export interface AccountLink {
  readonly href: string;
  readonly label: string;
}

/** Services navigation: only links the viewer may open are listed (UI/UX 23.1). */
export function AccountNav({ links, contextId }: { links: AccountLink[]; contextId: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Servicios de cuenta" className="account-nav">
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
              {link.label}
            </a>
          </li>
        ))}
        <li>
          <NotificationBell contextId={contextId} />
        </li>
      </ul>
    </nav>
  );
}
