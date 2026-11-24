/**
 * ERC-7730 path resolver.
 *
 * Path syntax supported:
 *   foo.bar           -> object navigation
 *   foo[0]            -> array index (negative allowed: [-1])
 *   foo.[0]           -> array index (negative allowed: [-1])
 *   foo[]             -> iterate every element; returns an array of values
 *   foo.[]            -> iterate every element; returns an array of values
 *   foo[0:20]         -> byte slice on a hex string (start..end, exclusive end)
 *   foo.[0:20]        -> byte slice on a hex string (start..end, exclusive end)
 *   foo.[-20:]        -> byte slice tail
 *   foo.[0:]          -> byte slice from start to end
 *   #.foo / foo       -> root reference (the leading # is optional)
 *
 * The resolver returns a single primitive value, an object, an array, or `undefined`
 * when the path doesn't resolve. Callers handle `undefined` by skipping the field.
 */

export type PathValue = unknown;

interface Segment {
  raw: string;
  kind: "key" | "index" | "iter" | "slice";
  key?: string;
  index?: number;
  sliceStart?: number;
  sliceEnd?: number | null; // null = until end
}

function parseSegments(path: string): Segment[] {
  // Strip leading `#.` or `#` (root marker).
  let p = path;
  if (p.startsWith("#.")) p = p.slice(2);
  else if (p.startsWith("#")) p = p.slice(1);
  if (p === "") return [];

  const segments: Segment[] = [];
  const parts = p.split(".");
  for (const part of parts) {
    if (part === "") continue;
    segments.push(...parsePart(part));
  }
  return segments;
}

function parsePart(part: string): Segment[] {
  const segments: Segment[] = [];
  const keyMatch = part.match(/^[^[]+/);
  if (keyMatch) {
    segments.push({ raw: keyMatch[0], kind: "key", key: keyMatch[0] });
  }

  let rest = part.slice(keyMatch?.[0].length ?? 0);
  while (rest.length > 0) {
    if (rest === "[]") {
      segments.push({ raw: "[]", kind: "iter" });
      rest = "";
      continue;
    }

    const indexMatch = rest.match(/^\[(-?\d+)\]/);
    if (indexMatch) {
      segments.push({
        raw: indexMatch[0],
        kind: "index",
        index: parseInt(indexMatch[1], 10),
      });
      rest = rest.slice(indexMatch[0].length);
      continue;
    }

    const sliceMatch = rest.match(/^\[(-?\d+)?:(-?\d+)?\]/);
    if (sliceMatch) {
      const start =
        sliceMatch[1] !== undefined ? parseInt(sliceMatch[1], 10) : 0;
      const end =
        sliceMatch[2] !== undefined ? parseInt(sliceMatch[2], 10) : null;
      segments.push({
        raw: sliceMatch[0],
        kind: "slice",
        sliceStart: start,
        sliceEnd: end,
      });
      rest = rest.slice(sliceMatch[0].length);
      continue;
    }

    // Malformed bracket syntax. Keep it as an impossible key so callers get
    // `undefined` instead of silently resolving a different path.
    segments.push({ raw: rest, kind: "key", key: rest });
    rest = "";
  }

  return segments;
}

function toSliceableHex(value: unknown): string | undefined {
  if (typeof value === "string") {
    if (value.startsWith("0x")) return value;
    if (/^\d+$/.test(value)) {
      const body = BigInt(value).toString(16).padStart(64, "0");
      return `0x${body}`;
    }
    return undefined;
  }
  if (typeof value === "bigint") {
    if (value < 0n) return undefined;
    return `0x${value.toString(16).padStart(64, "0")}`;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return undefined;
    return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
  }
  return undefined;
}

function applyByteSlice(
  value: unknown,
  start: number,
  end: number | null
): string | undefined {
  const hex = toSliceableHex(value);
  if (!hex) return undefined;
  const body = hex.slice(2);
  const totalBytes = body.length / 2;
  let s =
    start < 0 ? Math.max(0, totalBytes + start) : Math.min(start, totalBytes);
  let e =
    end === null
      ? totalBytes
      : end < 0
        ? Math.max(0, totalBytes + end)
        : Math.min(end, totalBytes);
  if (e < s) e = s;
  return "0x" + body.slice(s * 2, e * 2);
}

export function resolvePath(root: unknown, path: string): PathValue {
  const segments = parseSegments(path);
  if (segments.length === 0) return root;
  return walk(root, segments, 0);
}

function walk(node: unknown, segments: Segment[], i: number): PathValue {
  if (i >= segments.length) return node;
  const seg = segments[i];
  if (node === null || node === undefined) return undefined;

  switch (seg.kind) {
    case "key": {
      if (Array.isArray(node) && seg.key === "length") {
        return walk(node.length, segments, i + 1);
      }
      if (typeof node !== "object" || Array.isArray(node)) return undefined;
      const next = (node as Record<string, unknown>)[seg.key!];
      return walk(next, segments, i + 1);
    }
    case "index": {
      if (!Array.isArray(node)) return undefined;
      const idx = seg.index! < 0 ? node.length + seg.index! : seg.index!;
      return walk(node[idx], segments, i + 1);
    }
    case "iter": {
      if (!Array.isArray(node)) return undefined;
      // Returns an array of resolved tails.
      const tail = segments.slice(i + 1);
      if (tail.length === 0) return node;
      return node.map((item) => walk(item, tail, 0));
    }
    case "slice": {
      const sliced = applyByteSlice(
        node,
        seg.sliceStart!,
        seg.sliceEnd ?? null
      );
      return walk(sliced, segments, i + 1);
    }
    default:
      return undefined;
  }
}
