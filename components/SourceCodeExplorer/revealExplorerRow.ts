/** Reveal a row without allowing scrollIntoView to move the surrounding page. */
export function revealExplorerRow(row: HTMLElement): boolean {
  if (!row.getClientRects().length) return false;
  const panel = row.closest<HTMLElement>("[data-source-files-scroll]");
  if (!panel || !panel.clientHeight) return false;
  const bounds = panel.getBoundingClientRect();
  const target = row.getBoundingClientRect();
  const top = bounds.top + panel.clientTop;
  const bottom = top + panel.clientHeight;
  const delta =
    target.top < top
      ? target.top - top
      : target.bottom > bottom
        ? target.bottom - bottom
        : 0;
  if (delta)
    panel.scrollTop = Math.max(
      0,
      Math.min(panel.scrollHeight - panel.clientHeight, panel.scrollTop + delta)
    );
  return true;
}
