"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Editor, type EditorProps, type OnMount } from "@monaco-editor/react";

/** Size Monaco to its rendered (including wrapped) lines, with a viewport cap. */
export function ContentSizedEditor(props: Omit<EditorProps, "height" | "onMount">) {
  const [contentHeight, setContentHeight] = useState<number>();
  const [limit, setLimit] = useState(420);
  const subscriptions = useRef<{ dispose(): void }[]>([]);
  useEffect(() => {
    const resize = () => setLimit(Math.max(104, Math.min(420, Math.floor(window.innerHeight * 0.5))));
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      subscriptions.current.forEach(subscription => subscription.dispose());
    };
  }, []);
  const onMount = useCallback<OnMount>(editor => {
    const measure = () => setContentHeight(Math.ceil(editor.getContentHeight()));
    subscriptions.current.forEach(subscription => subscription.dispose());
    subscriptions.current = [
      editor.onDidContentSizeChange(measure),
      editor.onDidLayoutChange(measure),
    ];
    measure();
  }, []);
  const estimatedHeight = (props.value?.split("\n").length ?? 1) * 21 + 20;
  return (
    <Editor
      {...props}
      height={Math.min(limit, Math.max(104, contentHeight ?? estimatedHeight))}
      onMount={onMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineHeight: 21,
        padding: { top: 10, bottom: 10 },
        wordWrap: "on",
        ...props.options,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}
