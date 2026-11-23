import type { OnMount } from "@monaco-editor/react";

type Editor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];
type ZoneAccessor = Parameters<Parameters<Editor["changeViewZones"]>[0]>[0];
type ViewZone = Parameters<ZoneAccessor["addZone"]>[0];

/** Wrapped error annotations below source lines; uses the same stale-safe markers as squiggles. */
export function registerInlineErrors(editor: Editor, monaco: Monaco) {
  const zones: { id: string; zone: ViewZone; content: HTMLElement }[] = [];
  const glyphs = editor.createDecorationsCollection();
  let frame = 0;
  const clear = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    editor.changeViewZones(accessor => {
      for (const item of zones) accessor.removeZone(item.id);
    });
    zones.length = 0;
    glyphs.clear();
  };
  const measure = () => {
    frame = 0;
    const width = Math.max(0, editor.getLayoutInfo().contentWidth - 16);
    for (const item of zones) item.content.style.width = `${width}px`;
    const heights = zones.map(item => item.content.scrollHeight + 8);
    editor.changeViewZones(accessor => {
      zones.forEach((item, index) => {
        if (item.zone.heightInPx === heights[index]) return;
        item.zone.heightInPx = heights[index];
        accessor.layoutZone(item.id);
      });
    });
  };
  const scheduleMeasure = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  const refresh = () => {
    clear();
    const model = editor.getModel();
    if (!model || model.uri.scheme !== "ethsh-solidity") return;
    const markers = monaco.editor.getModelMarkers({ owner: "ethsh-solc", resource: model.uri })
      .filter(marker => marker.severity === monaco.MarkerSeverity.Error);
    glyphs.set([...new Map(markers.map(marker => [marker.startLineNumber, marker])).values()].map(marker => ({
      range: {startLineNumber: marker.startLineNumber, endLineNumber: marker.startLineNumber,
        startColumn: 1, endColumn: 1},
      options: {
        lineNumberClassName: "codicon codicon-error ethsh-compiler-error-line",
      },
    })));
    editor.changeViewZones(accessor => {
      for (const marker of markers) {
        const domNode = document.createElement("div");
        const content = document.createElement("div");
        content.setAttribute("role", "note");
        content.setAttribute("aria-label", `Compiler error on line ${marker.startLineNumber}`);
        content.textContent = marker.message;
        Object.assign(content.style, {
          boxSizing: "border-box", whiteSpace: "pre-wrap", overflowWrap: "anywhere",
          fontFamily: "var(--chakra-fonts-mono)", fontSize: "12px", lineHeight: "18px",
          color: "var(--chakra-colors-red-300)", background: "var(--chakra-colors-bg-muted)",
          borderLeft: "2px solid var(--chakra-colors-red-400)", padding: "6px 10px",
          marginTop: "4px", width: `${Math.max(0, editor.getLayoutInfo().contentWidth - 16)}px`,
        });
        domNode.appendChild(content);
        const zone = { afterLineNumber: marker.startLineNumber,
          heightInPx: 38, domNode, suppressMouseDown: false };
        zones.push({ id: accessor.addZone(zone), zone, content });
      }
    });
    scheduleMeasure();
  };
  const subscriptions = [
    monaco.editor.onDidChangeMarkers(uris => {
      const uri = editor.getModel()?.uri.toString();
      if (uris.some(item => item.toString() === uri)) refresh();
    }),
    editor.onDidChangeModel(refresh),
    // Never leave an old compiler message attached to edited source.
    editor.onDidChangeModelContent(clear),
    editor.onDidLayoutChange(scheduleMeasure),
  ];
  refresh();
  return { dispose() { subscriptions.forEach(item => item.dispose()); clear(); } };
}
