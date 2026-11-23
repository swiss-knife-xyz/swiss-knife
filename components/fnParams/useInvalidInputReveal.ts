"use client";

import { useEffect, useRef, type RefObject } from "react";

const invalidInputSelector = [
  'input[aria-invalid="true"]:not([disabled]):not([readonly])',
  'textarea[aria-invalid="true"]:not([disabled]):not([readonly])',
  'select[aria-invalid="true"]:not([disabled])',
  '[role="combobox"][aria-invalid="true"]:not([aria-disabled="true"])',
].join(",");

/** Reveal actual field validation errors, including those in mounted hidden branches. */
export function useInvalidInputReveal(
  rootRef: RefObject<HTMLElement | null>,
  attempt = 0
) {
  const previousInvalid = useRef(new Set<Element>());
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let scanFrame = 0;
    let settleFrame = 0;
    let scrollFrame = 0;
    let forceReveal = false;
    const scan = () => {
      scanFrame = 0;
      const invalid = Array.from(
        root.querySelectorAll<HTMLElement>(invalidInputSelector)
      );
      const shouldReveal =
        forceReveal ||
        invalid.some((field) => !previousInvalid.current.has(field));
      forceReveal = false;
      previousInvalid.current = new Set(invalid);
      if (!invalid.length || !shouldReveal) return;
      // Collect before clicking: several errors can share the same disclosure.
      const toggles = new Set<HTMLButtonElement>();
      for (const field of invalid) {
        const ancestors: HTMLElement[] = [];
        let branch = field.closest<HTMLElement>("[data-parameter-branch]");
        while (branch && root.contains(branch)) {
          ancestors.unshift(branch);
          branch =
            branch.parentElement?.closest<HTMLElement>(
              "[data-parameter-branch]"
            ) ?? null;
        }
        for (const ancestor of ancestors) {
          const toggle = ancestor.querySelector<HTMLButtonElement>(
            "[data-parameter-toggle]"
          );
          if (toggle?.getAttribute("aria-expanded") === "false")
            toggles.add(toggle);
        }
      }
      for (const toggle of toggles) toggle.click();
      cancelAnimationFrame(settleFrame);
      cancelAnimationFrame(scrollFrame);
      // Let React commit every expanded ancestor before measuring/scrolling.
      settleFrame = requestAnimationFrame(() => {
        scrollFrame = requestAnimationFrame(() => {
          const first = root.querySelector<HTMLElement>(invalidInputSelector);
          if (!first || !root.isConnected) return;
          first.style.scrollMarginBlock = "24px";
          first.scrollIntoView?.({
            block: "center",
            behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
          });
        });
      });
    };
    const schedule = (force = false) => {
      forceReveal ||= force;
      if (!scanFrame) scanFrame = requestAnimationFrame(scan);
    };
    const observer = new MutationObserver(() => schedule());
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-invalid"],
    });
    schedule(attempt > 0);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(scanFrame);
      cancelAnimationFrame(settleFrame);
      cancelAnimationFrame(scrollFrame);
    };
  }, [rootRef, attempt]);
}
