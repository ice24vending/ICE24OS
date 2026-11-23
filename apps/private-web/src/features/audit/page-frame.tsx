"use client";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { PageWidth } from "@ice24/ui";

type PageState = { id: string; title: string; ready: boolean; breadcrumbs: boolean };
const PageContext = createContext<Dispatch<SetStateAction<PageState | null>> | null>(null);

/** Outside Next's loading boundaries: streamed fallbacks and pages share one landmark. */
export function AuditPageFrame({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageState | null>(null);
  return (
    <PageContext.Provider value={setPage}>
      <PageWidth
        as="main"
        id="main-content"
        className="audit-layout"
        aria-label={page?.title ?? "Auditoría"}
        data-page-ready={String(page?.ready ?? false)}
        // Reserve breadcrumb ownership while server content streams. Detail supplies its
        // own crumbs before hydration; the mounted list releases ownership explicitly.
        data-page-breadcrumbs={(page?.breadcrumbs ?? true) ? "true" : undefined}
      >
        {children}
      </PageWidth>
    </PageContext.Provider>
  );
}

/** Publish the mounted content's contract after hydration, without inspecting the route. */
export function AuditPageContent({
  title,
  ready = true,
  breadcrumbs = false,
  className,
  children,
}: {
  title: string;
  ready?: boolean;
  breadcrumbs?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const setPage = useContext(PageContext);
  const id = useId();
  useLayoutEffect(() => {
    setPage?.({ id, title, ready, breadcrumbs });
    return () => setPage?.((current) => (current?.id === id ? null : current));
  }, [setPage, id, title, ready, breadcrumbs]);
  return <div className={className}>{children}</div>;
}
