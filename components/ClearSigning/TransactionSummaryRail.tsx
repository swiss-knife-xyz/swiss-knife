"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { ClearSigningScrollArea } from "./ClearSigningScrollArea";

/** Start short reviews at viewport center, then let them scroll up to a sticky edge. */
export function TransactionSummaryRail({ children }: { children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (!rail.current || !panel.current) return;
      const origin = rail.current.getBoundingClientRect().top + window.scrollY;
      const availableHeight = window.visualViewport?.height ?? window.innerHeight;
      // Use the current viewport position: as the sticky panel moves upward,
      // its body can grow into the space freed beneath it.
      const panelTop = panel.current.getBoundingClientRect().top;
      rail.current.style.setProperty("--review-body-max", `${Math.max(0, availableHeight - Math.max(24, panelTop) - 72)}px`);
      const height = panel.current.getBoundingClientRect().height;
      const centeredOffset = (availableHeight - height) / 2 - origin;
      const offset = Math.max(0, Math.min(centeredOffset, rail.current.clientHeight - height));
      rail.current.style.setProperty("--review-offset", `${offset}px`);
    };
    let frame: number | undefined;
    const scheduleUpdate = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        update();
      });
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (rail.current) observer?.observe(rail.current);
    if (panel.current) observer?.observe(panel.current);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    update();
    return () => {
      observer?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return (
    <Box ref={rail} data-tx-clear-signing gridArea="summary" minW={0} alignSelf="stretch"
      sx={{ "&:not(:has(section))": { display: "none" } }}>
      <Box ref={panel} data-tx-review-panel minW={0} sx={{
        "@media (min-width: 1100px)": {
          position: "sticky",
          top: "24px",
          marginTop: "var(--review-offset, 0px)",
        },
      }}>
        <HStack h={8} mb={4}>
          <Text fontSize="sm" fontWeight="semibold" color="text.secondary">Clear Signing</Text>
        </HStack>
        <ClearSigningScrollArea desktopBreakpoint={1100} maxHeight="var(--review-body-max, calc(100dvh - 96px))">
          {children}
        </ClearSigningScrollArea>
      </Box>
    </Box>
  );
}
