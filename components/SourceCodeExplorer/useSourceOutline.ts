"use client";
import { useEffect, useRef, useState } from "react";
import type { OutlineResult } from "@/lib/solidity/outline";
export function useSourceOutline(
  path: string,
  content: string,
  enabled: boolean
) {
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const [state, setState] = useState<
    OutlineResult & { path: string; content: string }
  >({ symbols: [], path: "", content: "" });
  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    []
  );
  useEffect(() => {
    const id = ++sequence.current;
    if (!enabled) return;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (sequence.current !== id) return;
      if (watchdog) clearTimeout(watchdog);
      worker.current?.terminate();
      worker.current = null;
      setState({ path, content, symbols: [], unavailable: true });
    };
    const timer = setTimeout(() => {
      try {
        const current =
          worker.current ??
          new Worker(new URL("./outline.worker.ts", import.meta.url));
        worker.current = current;
        current.onmessage = ({
          data,
        }: MessageEvent<{ id: number; result: OutlineResult }>) => {
          if (data.id !== sequence.current || data.id !== id) return;
          if (watchdog) clearTimeout(watchdog);
          setState({ ...data.result, path, content });
        };
        current.onerror = fail;
        watchdog = setTimeout(fail, 10000);
        current.postMessage({ id, content });
      } catch {
        fail();
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      if (watchdog) clearTimeout(watchdog);
    };
  }, [path, content, enabled]);
  return {
    symbols: state.path === path ? state.symbols : [],
    unavailable:
      state.path === path && state.content === content && state.unavailable,
    loading: enabled && (state.path !== path || state.content !== content),
  };
}
