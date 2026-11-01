"use client";

import React, { useEffect, useState, useRef } from "react";
import { useNavigation } from "./navigation-context";

export function NavigationProgress() {
  const { isNavigating } = useNavigation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    clearAllTimers();

    if (isNavigating) {
      setVisible(true);
      setProgress(25);

      timersRef.current.push(setTimeout(() => setProgress(60), 120));
      timersRef.current.push(setTimeout(() => setProgress(82), 280));
      timersRef.current.push(setTimeout(() => setProgress(94), 700));
    } else if (visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isNavigating, visible]);

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div
        className="h-1 sm:h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-md shadow-primary/40 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
}
