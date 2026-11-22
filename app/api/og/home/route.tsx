import { ImageResponse } from "next/og";
import { loadToolOgAssets } from "@/lib/toolOg";

export const runtime = "edge";

const x = (value: number) => (value / 2144) * 1200;
const y = (value: number) => (value / 1122) * 630;

const backgroundTools = [
  { label: "Explorer", left: -40, top: 190, size: 100, angle: -23 },
  { label: "Calldata Decoder", left: 1130, top: 80, size: 110, angle: 17 },
  { label: "Storage Slots", left: 716, top: 240, size: 48, angle: -4 },
  { label: "Epoch Converter", left: 50, top: 944, size: 48, angle: 17 },
  { label: "Transact", left: 720, top: 950, size: 48, angle: -14 },
  { label: "Unit Converter", left: 1190, top: 945, size: 66, angle: 18 },
  { label: "Constants", left: 1780, top: 890, size: 48, angle: -15 },
];

export async function GET() {
  const { logo, fonts } = await loadToolOgAssets();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#111111",
          color: "white",
          fontFamily: "Poppins",
          fontWeight: 300,
        }}
      >
        {backgroundTools.map((tool) => (
          <div
            key={tool.label}
            style={{
              position: "absolute",
              left: x(tool.left),
              top: y(tool.top),
              fontSize: x(tool.size),
              fontWeight: 700,
              color: "#343434",
              transform: `rotate(${tool.angle}deg)`,
              whiteSpace: "nowrap",
              lineHeight: 1.25,
            }}
          >
            {tool.label}
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: y(446),
            width: "100%",
            height: y(299),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: x(86),
          }}
        >
          <img
            alt="ETH.sh logo"
            src={logo as unknown as string}
            width={x(299)}
            height={y(299)}
            style={{ borderRadius: x(64) }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: y(48),
            }}
          >
            <div
              style={{ fontSize: x(144), fontWeight: 700, lineHeight: 1.25 }}
            >
              ETH.sh
            </div>
            <div style={{ fontSize: x(40), whiteSpace: "nowrap" }}>
              All your EVM dev tools in one place!
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
