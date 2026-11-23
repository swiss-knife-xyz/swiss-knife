"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box } from "@chakra-ui/react";

/** Desktop-only scrolling; the heading lives outside this viewport. */
export function ClearSigningScrollArea({ children, desktopBreakpoint = 1200,
  maxHeight = "calc(100dvh - 92px)",
}: { children: ReactNode; desktopBreakpoint?: number; maxHeight?: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const update = () => {
    const element = viewport.current;
    if (!element) return;
    const top = element.scrollTop > 1;
    const bottom =
      element.scrollTop + element.clientHeight < element.scrollHeight - 1;
    setEdges((previous) =>
      previous.top === top && previous.bottom === bottom
        ? previous
        : { top, bottom }
    );
  };

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      update();
      return;
    }
    const observer = new ResizeObserver(update);
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <Box position="relative" minW={0}>
      <Box
        ref={viewport}
        onScroll={update}
        data-clear-signing-scroll
        sx={{
          [`@media (min-width: ${desktopBreakpoint}px)`]: {
            maxHeight,
            overflowY: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          },
        }}
      >
        <Box ref={content} data-clear-signing-content>
          {children}
        </Box>
      </Box>
      {(["top", "bottom"] as const).map((edge) => (
        <Box
          key={edge}
          aria-hidden="true"
          data-scroll-shadow={edge}
          position="absolute"
          top={edge === "top" ? 0 : undefined}
          bottom={edge === "bottom" ? 0 : undefined}
          left={0}
          right={0}
          h={6}
          pointerEvents="none"
          zIndex={1}
          opacity={edges[edge] ? 1 : 0}
          bg={`linear-gradient(to ${edge === "top" ? "bottom" : "top"}, var(--chakra-colors-bg-base), transparent)`}
          sx={{
            display: "none",
            [`@media (min-width: ${desktopBreakpoint}px)`]: { display: "block" },
          }}
        />
      ))}
    </Box>
  );
}
