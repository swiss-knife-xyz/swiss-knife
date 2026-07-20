"use client";

import { type CSSProperties, useEffect, useRef } from "react";

export type DitherColor = readonly [red: number, green: number, blue: number];
export type DitherDirection = "up" | "down" | "left" | "right";
export type DitherBloom = "off" | "low" | "aura";

type DitherGradientProps = {
  from: DitherColor;
  to?: DitherColor | "transparent";
  direction?: DitherDirection;
  cell?: number;
  opacity?: number;
  bloom?: DitherBloom;
  className?: string;
  style?: CSSProperties;
};

const MAX_COLS = 320;
const MAX_ROWS = 600;

// Normalized 4×4 Bayer matrix. The ordered thresholds create the intentional
// dot pattern without adding an image or runtime dependency. Adapted from the
// MIT-licensed Dither Kit gradient technique: tripwire.sh/dither-kit.
const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / 16));

const BLOOM_STYLES: Record<Exclude<DitherBloom, "off">, CSSProperties> = {
  low: {
    filter: "blur(3px) brightness(1.35) saturate(1.4)",
    opacity: 0.65,
    mixBlendMode: "plus-lighter",
  },
  aura: {
    filter: "blur(14px) brightness(2.6) saturate(2.4)",
    opacity: 0.12,
    mixBlendMode: "plus-lighter",
  },
};

const canvasStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
  imageRendering: "pixelated",
};

function rgba(color: DitherColor, opacity: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
}

function paintGradient(
  canvas: HTMLCanvasElement,
  bloomCanvas: HTMLCanvasElement | null,
  width: number,
  height: number,
  from: DitherColor,
  to: DitherColor | "transparent",
  direction: DitherDirection,
  cell: number,
  opacity: number
) {
  const context = canvas.getContext("2d");
  if (!context || width <= 0 || height <= 0) return;

  const columns = Math.min(
    MAX_COLS,
    Math.max(4, Math.round(width / Math.max(1, cell)))
  );
  const rows = Math.min(
    MAX_ROWS,
    Math.max(4, Math.round(height / Math.max(1, cell)))
  );

  canvas.width = columns;
  canvas.height = rows;
  context.clearRect(0, 0, columns, rows);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const progress =
        direction === "up"
          ? 1 - (y + 0.5) / rows
          : direction === "down"
            ? (y + 0.5) / rows
            : direction === "left"
              ? 1 - (x + 0.5) / columns
              : (x + 0.5) / columns;
      const density = 1 - progress;
      const isLit = density > BAYER_4[y & 3][x & 3];

      if (to !== "transparent") {
        context.fillStyle = rgba(isLit ? from : to, opacity);
      } else {
        const alpha =
          (isLit ? 0.35 + 0.65 * density : 0.12 * density) * opacity;
        if (alpha <= 0.004) continue;
        context.fillStyle = rgba(from, alpha);
      }

      context.fillRect(x, y, 1, 1);
    }
  }

  const bloomContext = bloomCanvas?.getContext("2d");
  if (bloomCanvas && bloomContext) {
    bloomCanvas.width = columns;
    bloomCanvas.height = rows;
    bloomContext.clearRect(0, 0, columns, rows);
    bloomContext.drawImage(canvas, 0, 0);
  }
}

export function DitherGradient({
  from,
  to = "transparent",
  direction = "right",
  cell = 4,
  opacity = 1,
  bloom = "off",
  className,
  style,
}: DitherGradientProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bloomRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const paint = () => {
      const bounds = wrapper.getBoundingClientRect();
      paintGradient(
        canvas,
        bloomRef.current,
        bounds.width,
        bounds.height,
        from,
        to,
        direction,
        cell,
        opacity
      );
    };

    paint();
    if (typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    });
    observer.observe(wrapper);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [bloom, cell, direction, from, opacity, to]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={canvasStyle} />
      {bloom !== "off" ? (
        <canvas
          ref={bloomRef}
          style={{
            ...canvasStyle,
            ...BLOOM_STYLES[bloom],
            imageRendering: "auto",
          }}
        />
      ) : null}
    </div>
  );
}
