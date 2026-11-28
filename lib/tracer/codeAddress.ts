import type { TraceCall } from "./model";

/** Follow the actual forwarding path instead of looking up today's proxy implementation. */
export function traceCodeAddress(call: TraceCall): string | undefined {
  let frame = call;
  while (true) {
    const forwarded = frame.calls.filter(
      (child) =>
        child.type === "DELEGATECALL" &&
        child.input.toLowerCase() === frame.input.toLowerCase()
    );
    if (forwarded.length !== 1) return frame.to;
    frame = forwarded[0];
  }
}
