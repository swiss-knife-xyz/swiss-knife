/* Browser regression probe. Inject `(${require('./scripts/checkPhoneLayout.cjs')})()`
 * with CDP Runtime.evaluate (or page.evaluate) after the real page has settled.
 * Run at 320, 390, 430 and 1280 CSS pixels. Does not click wallet actions.
 * Document width alone misses overflow hidden inside the shared Layout wrapper.
 */
module.exports = function checkPhoneLayout() {
  const width = window.innerWidth;
  const failures = [];
  if (document.documentElement.scrollWidth > width + 1) {
    failures.push(`Document overflows ${width}px viewport`);
  }
  const controls = [
    ...document.querySelectorAll('input, textarea, button, [role="combobox"]'),
  ].filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return (
      (rect.width > 5 ||
        (element.getAttribute("role") === "combobox" && rect.width > 0)) &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      !element.closest('[hidden], [aria-hidden="true"]')
    );
  });
  if (!controls.length)
    failures.push("No visible controls: page did not render");
  for (const element of controls) {
    const rect = element.getBoundingClientRect();
    const label =
      element.getAttribute("aria-label") ||
      element.getAttribute("placeholder") ||
      element.textContent?.trim() ||
      element.tagName;
    if (rect.left < -1 || rect.right > width + 1) {
      failures.push(
        `${label}: horizontal bounds ${rect.left.toFixed(1)}..${rect.right.toFixed(1)}`
      );
    }
    for (
      let ancestor = element.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      if (
        !ancestor.clientWidth ||
        !["hidden", "clip", "auto", "scroll"].includes(
          getComputedStyle(ancestor).overflowX
        )
      )
        continue;
      const bounds = ancestor.getBoundingClientRect();
      if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) {
        failures.push(
          `${label}: clipped by ancestor ${bounds.left.toFixed(1)}..${bounds.right.toFixed(1)}`
        );
        break;
      }
    }
  }
  if (failures.length) throw new Error(failures.join("\n"));
  return {
    width,
    documentWidth: document.documentElement.scrollWidth,
    controls: controls.length,
  };
};
