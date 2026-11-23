"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Box } from "@chakra-ui/react";

type PaneRef = RefObject<HTMLDivElement | null>;
export function PaneResizeHandle({
  container,
  editor,
  pane: output,
  property: WIDTH_PROPERTY,
  label,
  controls,
  edge = "left",
  minimum = 260,
  maximum = 640,
  initial = 300,
  breakpoint = "lg",
}: {
  container: PaneRef;
  editor: PaneRef;
  pane: PaneRef;
  property: string;
  label: string;
  controls: string;
  edge?: "left" | "right";
  minimum?: number;
  maximum?: number;
  initial?: number;
  breakpoint?: "lg" | "xl";
}) {
  const [range, setRange] = useState({
    width: initial,
    min: minimum,
    max: maximum,
  });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    pointerId: number;
    x: number;
    width: number;
    userSelect: string;
    cursor: string;
  } | null>(null);
  const preferred = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  const measure = () => {
    if (
      !container.current ||
      !editor.current ||
      !output.current ||
      getComputedStyle(container.current).flexDirection !== "row"
    )
      return null;
    const width = output.current.getBoundingClientRect().width;
    if (width === 0) return null;
    const available = width + editor.current.getBoundingClientRect().width;
    const max = Math.max(minimum, Math.min(maximum, available - 320));
    return { width, min: minimum, max };
  };
  const apply = (value: number, remember = true) => {
    const bounds = measure();
    if (!bounds || !container.current) return;
    const width = Math.round(Math.max(bounds.min, Math.min(bounds.max, value)));
    if (remember) preferred.current = width;
    container.current.style.setProperty(WIDTH_PROPERTY, `${width}px`);
    setRange((current) =>
      current.width === width && current.max === bounds.max
        ? current
        : { ...bounds, width }
    );
  };
  const flush = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (pending.current !== null) {
      apply(pending.current);
      pending.current = null;
    }
  };
  const finish = () => {
    flush();
    if (drag.current && container.current) {
      container.current.style.userSelect = drag.current.userSelect;
      container.current.style.cursor = drag.current.cursor;
    }
    drag.current = null;
    setDragging(false);
  };
  const reset = () => {
    finish();
    preferred.current = null;
    container.current?.style.removeProperty(WIDTH_PROPERTY);
    const bounds = measure();
    if (bounds) setRange(bounds);
  };
  // Recalculate limits when either neighboring pane or the viewport changes.
  useEffect(() => {
    const row = container.current;
    if (!row) return;
    const observer = new ResizeObserver(() => {
      const bounds = measure();
      if (!bounds) return;
      if (preferred.current !== null) apply(preferred.current, false);
      else
        setRange((current) =>
          current.width === bounds.width && current.max === bounds.max
            ? current
            : bounds
        );
    });
    observer.observe(row);
    if (editor.current) observer.observe(editor.current);
    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (drag.current) {
        row.style.userSelect = drag.current.userSelect;
        row.style.cursor = drag.current.cursor;
      }
      row.style.removeProperty(WIDTH_PROPERTY);
    };
  }, [container, editor, output, WIDTH_PROPERTY, minimum, maximum]);
  return (
    <Box
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={range.min}
      aria-valuemax={Math.round(range.max)}
      aria-valuenow={Math.round(range.width)}
      aria-valuetext={`${Math.round(range.width)} pixels`}
      aria-controls={controls}
      tabIndex={0}
      title="Drag to resize. Arrow keys resize; double-click resets."
      display={{ base: "none", [breakpoint]: "block" }}
      alignSelf="stretch"
      position="relative"
      flex="0 0 8px"
      w="8px"
      cursor="col-resize"
      sx={{ touchAction: "none" }}
      userSelect="none"
      zIndex={1}
      bg={dragging ? "whiteAlpha.100" : "transparent"}
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "3px",
        width: "1px",
        bg: dragging ? "primary.400" : "border.default",
      }}
      _hover={{ bg: "whiteAlpha.100" }}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "primary.400",
        outlineOffset: "-2px",
        bg: "whiteAlpha.100",
      }}
      onDoubleClick={reset}
      onKeyDown={(event) => {
        const bounds = measure();
        if (!bounds) return;
        const step = event.shiftKey ? 48 : 16;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          apply(bounds.width + (edge === "left" ? step : -step));
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          apply(bounds.width + (edge === "left" ? -step : step));
        } else if (event.key === "Home") {
          event.preventDefault();
          apply(bounds.min);
        } else if (event.key === "End") {
          event.preventDefault();
          apply(bounds.max);
        }
      }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || !container.current)
          return;
        const bounds = measure();
        if (!bounds) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          width: bounds.width,
          userSelect: container.current.style.userSelect,
          cursor: container.current.style.cursor,
        };
        container.current.style.userSelect = "none";
        container.current.style.cursor = "col-resize";
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        pending.current =
          current.width +
          (edge === "left"
            ? current.x - event.clientX
            : event.clientX - current.x);
        if (frame.current === null)
          frame.current = requestAnimationFrame(() => {
            frame.current = null;
            if (pending.current !== null) {
              apply(pending.current);
              pending.current = null;
            }
          });
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        finish();
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
    />
  );
}
