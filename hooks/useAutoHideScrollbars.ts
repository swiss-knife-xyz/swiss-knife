"use client";

import { useCallback, useEffect, useRef, type UIEvent } from "react";
import styles from "./useAutoHideScrollbars.module.css";

export function useAutoHideScrollbars() {
  const timers = useRef(new Map<HTMLElement, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer, element) => {
        clearTimeout(timer);
        element.removeAttribute("data-scrolling");
      });
      activeTimers.clear();
    };
  }, []);

  const onScrollCapture = useCallback((event: UIEvent<HTMLElement>) => {
    const element = event.target;
    if (!(element instanceof HTMLElement)) return;

    clearTimeout(timers.current.get(element));
    element.setAttribute("data-scrolling", "true");
    timers.current.set(
      element,
      setTimeout(() => {
        element.removeAttribute("data-scrolling");
        timers.current.delete(element);
      }, 700)
    );
  }, []);

  return { className: styles.scrollbars, onScrollCapture };
}
