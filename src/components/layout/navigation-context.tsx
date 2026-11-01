"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

interface NavigationContextType {
  isNavigating: boolean;
  navigatingTarget: string | null;
  startNavigation: (targetHref: string) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  navigatingTarget: null,
  startNavigation: () => {},
});

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTarget, setNavigatingTarget] = useState<string | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear navigation state when route updates
  useEffect(() => {
    setIsNavigating(false);
    setNavigatingTarget(null);
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
  }, [pathname]);

  const startNavigation = (targetHref: string) => {
    const cleanTarget = targetHref.split("?")[0];
    const currentPath = window.location.pathname;

    if (cleanTarget && cleanTarget !== currentPath) {
      setIsNavigating(true);
      setNavigatingTarget(cleanTarget);

      // Safety timeout: if page takes longer than 8 seconds, reset
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setIsNavigating(false);
        setNavigatingTarget(null);
      }, 8000);
    }
  };

  // Global click interception on internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external or non-page links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }

      const cleanTarget = href.split("?")[0];
      const currentPath = window.location.pathname;

      if (cleanTarget && cleanTarget !== currentPath && cleanTarget.startsWith("/")) {
        startNavigation(cleanTarget);
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  // Background intelligent route prefetching during browser idle time
  useEffect(() => {
    const coreRoutes = [
      "/app",
      "/app/pos",
      "/app/service",
      "/app/products",
      "/app/inventory",
      "/app/expenses",
      "/app/dues",
      "/app/customers",
      "/app/suppliers",
      "/app/accounts",
      "/app/reports",
      "/app/settings",
    ];

    const prefetchRoutes = () => {
      coreRoutes.forEach((route, idx) => {
        setTimeout(() => {
          try {
            router.prefetch(route);
          } catch {
            // ignore prefetch errors
          }
        }, idx * 120);
      });
    };

    if ("requestIdleCallback" in window) {
      const handle = (window as any).requestIdleCallback(prefetchRoutes, { timeout: 2000 });
      return () => {
        if ("cancelIdleCallback" in window) {
          (window as any).cancelIdleCallback(handle);
        }
      };
    } else {
      const timer = setTimeout(prefetchRoutes, 300);
      return () => clearTimeout(timer);
    }
  }, [router]);

  return (
    <NavigationContext.Provider
      value={{
        isNavigating,
        navigatingTarget,
        startNavigation,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}

