"use client";
import type { RefObject } from "react";
import { PaneResizeHandle } from "./PaneResizeHandle";
export function OutputResizeHandle({
  container,
  editor,
  output,
}: {
  container: RefObject<HTMLDivElement | null>;
  editor: RefObject<HTMLDivElement | null>;
  output: RefObject<HTMLDivElement | null>;
}) {
  return (
    <PaneResizeHandle
      container={container}
      editor={editor}
      pane={output}
      property="--solidity-output-width"
      label="Resize output panel"
      controls="solidity-output-panel"
    />
  );
}
