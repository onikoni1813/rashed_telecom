"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname changes, complete navigation
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, isNavigating]);

  // Intercept click on links to start instant progress bar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external, hash, or current page links
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

      // Check if navigating to a different pathname
      const currentUrl = window.location.pathname;
      const targetPath = href.split("?")[0];

      if (targetPath !== currentUrl) {
        setIsNavigating(true);
        setProgress(25);

        const t1 = setTimeout(() => setProgress(65), 150);
        const t2 = setTimeout(() => setProgress(85), 450);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div
        className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-sm shadow-blue-500/50 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
}
