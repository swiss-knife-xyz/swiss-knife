import { ImageResponse } from "next/og";
import { loadToolOgAssets, StackedToolOgBrand } from "@/lib/toolOg";

export const runtime = "edge";

const x = (value: number) => (value / 2144) * 1200;
const y = (value: number) => (value / 1122) * 630;

export async function GET() {
  const [{ logo, fonts }, artwork, lightItalic, boldItalic] = await Promise.all(
    [
      loadToolOgAssets(),
      fetch(
        new URL("../../../../assets/og-usdc-pay.png", import.meta.url)
      ).then((response) => response.arrayBuffer()),
      fetch(
        new URL("../../../../assets/Poppins-LightItalic.ttf", import.meta.url)
      ).then((response) => response.arrayBuffer()),
      fetch(
        new URL("../../../../assets/Poppins-BoldItalic.ttf", import.meta.url)
      ).then((response) => response.arrayBuffer()),
    ]
  );

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
        <img
          alt="USDC payment preview"
          src={artwork as unknown as string}
          width={x(866)}
          height={630}
          style={{ position: "absolute", left: 0, top: 0 }}
        />
        <div
          style={{
            position: "absolute",
            left: x(866),
            top: y(142),
            width: x(1278),
            display: "flex",
            justifyContent: "center",
            fontSize: x(168),
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          USDC Pay
        </div>
        <div
          style={{
            position: "absolute",
            left: x(866),
            top: y(405),
            width: x(1278),
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            fontStyle: "italic",
            color: "#dedede",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: x(18),
              fontSize: x(60),
              lineHeight: 1.5,
            }}
          >
            <span>Transfer USDC on</span>
            <span style={{ color: "#00b5d8", fontWeight: 700 }}>Base</span>
          </div>
          <div
            style={{
              fontSize: x(64),
              fontWeight: 700,
              color: "#22da00",
              lineHeight: 1.5,
            }}
          >
            without any gas fees!
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: x(1007),
            top: y(735),
            fontSize: x(60),
            fontStyle: "italic",
            color: "#dedede",
          }}
        >
          Powered by x402
        </div>
        <StackedToolOgBrand logo={logo} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        ...fonts,
        { name: "Poppins", data: lightItalic, weight: 300, style: "italic" },
        { name: "Poppins", data: boldItalic, weight: 700, style: "italic" },
      ],
    }
  );
}
