"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box, VStack } from "@chakra-ui/react";

export function DeploymentScrollArea({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const measure = useCallback(() => {
    const element = viewport.current;
    if (!element) return;
    const top = element.scrollTop > 1;
    const bottom =
      element.scrollHeight - element.clientHeight - element.scrollTop > 1;
    setEdges((current) =>
      current.top === top && current.bottom === bottom
        ? current
        : { top, bottom }
    );
  }, []);
  useEffect(() => {
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, [measure]);
  return (
    <Box position="relative" minW={0}>
      <Box
        ref={viewport}
        role="region"
        aria-label="Deployment history"
        tabIndex={0}
        maxH="440px"
        overflowY="auto"
        minW={0}
        onScroll={measure}
        sx={{
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "primary.400",
          outlineOffset: "2px",
          borderRadius: "lg",
        }}
      >
        <VStack ref={content} align="stretch" spacing={2} minW={0}>
          {children}
        </VStack>
      </Box>
      <Box
        aria-hidden="true"
        data-testid="deployment-top-shadow"
        pointerEvents="none"
        position="absolute"
        insetInline={0}
        top={0}
        h={7}
        zIndex={1}
        opacity={edges.top ? 1 : 0}
        bgGradient="linear(to-b, blackAlpha.900, blackAlpha.500 40%, transparent)"
      />
      <Box
        aria-hidden="true"
        data-testid="deployment-bottom-shadow"
        pointerEvents="none"
        position="absolute"
        insetInline={0}
        bottom={0}
        h={7}
        zIndex={1}
        opacity={edges.bottom ? 1 : 0}
        bgGradient="linear(to-t, blackAlpha.900, blackAlpha.500 40%, transparent)"
      />
    </Box>
  );
}
