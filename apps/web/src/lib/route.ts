import { useEffect, useState } from "react";

export type Route = "landing" | "app";

const NAV_EVENT = "breeze:navigate";

/**
 * Tiny path router (no dependency).
 *   /app            → main app
 *   /?lat=..&lon=.. → main app (canonical share links, FR-16, stay valid)
 *   anything else   → landing page
 */
export function resolveRoute(loc: Pick<Location, "pathname" | "search"> = window.location): Route {
  const path = loc.pathname.replace(/\/+$/, "") || "/";
  if (path === "/app") return "app";
  const params = new URLSearchParams(loc.search);
  if (params.has("lat") && params.has("lon")) return "app";
  return "landing";
}

export function navigate(to: string): void {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(NAV_EVENT));
  window.scrollTo({ top: 0 });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => resolveRoute());
  useEffect(() => {
    const sync = () => setRoute(resolveRoute());
    window.addEventListener("popstate", sync);
    window.addEventListener(NAV_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(NAV_EVENT, sync);
    };
  }, []);
  return route;
}

/** Click handler for same-origin <a href> that keeps native new-tab / modifier behaviour. */
export function handleNavClick(to: string) {
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
}
