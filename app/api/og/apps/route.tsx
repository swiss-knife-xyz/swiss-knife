import { ImageResponse } from "next/og";
import { loadToolOgAssets, StackedToolOgBrand } from "@/lib/toolOg";

export const runtime = "edge";

// Preserve the original App Store card's large grid and stacked brand column.
const x = (value: number) => (value / 2144) * 1200;
const y = (value: number) => (value / 1122) * 630;

export async function GET() {
  const [{ logo, fonts }, artwork, italic] = await Promise.all([
    loadToolOgAssets(),
    fetch(new URL("../../../../assets/og-apps.png", import.meta.url)).then(
      (response) => response.arrayBuffer()
    ),
    fetch(
      new URL("../../../../assets/Poppins-LightItalic.ttf", import.meta.url)
    ).then((response) => response.arrayBuffer()),
  ]);

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
        <div
          style={{
            position: "absolute",
            left: x(140),
            top: y(80),
            fontSize: x(144),
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          Web3 App Store
        </div>
        <div
          style={{
            position: "absolute",
            left: x(65),
            top: y(282),
            width: x(1515),
            display: "flex",
            justifyContent: "center",
            fontSize: x(50),
            fontStyle: "italic",
            color: "#dedede",
          }}
        >
          Your Web3 Operating System
        </div>
        <img
          alt="App directory preview"
          src={artwork as unknown as string}
          width={x(1515)}
          height={y(742)}
          style={{ position: "absolute", left: x(65), top: y(380) }}
        />
        <StackedToolOgBrand logo={logo} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        ...fonts,
        { name: "Poppins", data: italic, weight: 300, style: "italic" },
      ],
    }
  );
}
