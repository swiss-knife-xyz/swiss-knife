/** Keep a revealed function in view through asynchronous layout changes, until user input. */
export function maintainFunctionScrollAnchor(
  target: HTMLElement,
  container: HTMLElement,
  getTop: () => number,
  onUserInput?: () => void
): () => void {
  let stopped = false;
  let frame: number | undefined;
  const correct = () => {
    frame = undefined;
    if (stopped) return;
    if (!target.isConnected) { stop(); return; }
    const delta = target.getBoundingClientRect().top - getTop();
    if (Math.abs(delta) > 1)
      window.scrollTo({ top: window.scrollY + delta, behavior: "instant" });
  };
  const schedule = () => {
    if (!stopped && frame === undefined) frame = requestAnimationFrame(correct);
  };
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  // Both columns matter: browser scroll anchoring can move the viewport when a
  // read result changes, even if the target lives in the opposite column.
  for (const element of new Set<Element>([
    document.body, container, target,
    ...container.querySelectorAll("[data-function-selector]"),
  ])) observer?.observe(element);
  const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  function stop() {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
    for (const event of events) window.removeEventListener(event, releaseForUser, true);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("scroll", schedule);
  }
  function releaseForUser() { onUserInput?.(); stop(); }
  for (const event of events) window.addEventListener(event, releaseForUser, { capture: true, passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("scroll", schedule, { passive: true });
  schedule();
  return stop;
}
