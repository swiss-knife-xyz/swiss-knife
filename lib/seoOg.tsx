import { ImageResponse } from "next/og";

/** Deterministic tool-specific cards; no third-party fetches or user input. */
export function toolOgImage(title: string, description: string) {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: "72px", background: "#0A0A0B", color: "#FAFAFA" }}>
      <div style={{ display: "flex", color: "#60A5FA", fontSize: 30, marginBottom: 40 }}>ETH.sh · Ethereum developer tools</div>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 700, marginBottom: 28 }}>{title}</div>
      <div style={{ display: "flex", fontSize: 28, color: "#A1A1AA" }}>{description}</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
