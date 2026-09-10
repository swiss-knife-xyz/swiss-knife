import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Bridge Base tokens to Robinhood Chain and add ETH liquidity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / 16));

const DITHER_STEP = 10;
const DITHER_DOT = 6;
const DITHER_COLUMNS = 28;
const DITHER_ROWS = Math.ceil(size.height / DITHER_STEP);

function DitheredEdge({
  side,
  color,
}: {
  side: "left" | "right";
  color: string;
}) {
  const dots: React.ReactNode[] = [];

  for (let row = 0; row < DITHER_ROWS; row += 1) {
    for (let column = 0; column < DITHER_COLUMNS; column += 1) {
      const distanceFromEdge =
        side === "left" ? column : DITHER_COLUMNS - column - 1;
      const density = 1 - (distanceFromEdge + 0.5) / DITHER_COLUMNS;

      if (density <= BAYER_4[row & 3][distanceFromEdge & 3]) continue;

      dots.push(
        <div
          key={`${row}-${column}`}
          style={{
            position: "absolute",
            left: column * DITHER_STEP,
            top: row * DITHER_STEP,
            width: DITHER_DOT,
            height: DITHER_DOT,
            display: "flex",
            background: color,
          }}
        />
      );
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        ...(side === "left" ? { left: 0 } : { right: 0 }),
        width: DITHER_COLUMNS * DITHER_STEP,
        display: "flex",
        opacity: 0.52,
      }}
    >
      {dots}
    </div>
  );
}

export async function GET(request: Request) {
  const font = await fetch(
    new URL("../../../../assets/Poppins-Bold.ttf", import.meta.url)
  ).then((response) => response.arrayBuffer());
  const logo = new URL("/logo.png", request.url).toString();
  const tokens = [
    {
      symbol: "BNKR",
      logo: new URL("/tokenIcons/bnkr.png", request.url).toString(),
    },
    {
      symbol: "GITLAWB",
      logo: new URL("/tokenIcons/gitlawb.png", request.url).toString(),
    },
    {
      symbol: "WCHAN",
      logo: new URL("/external/walletchan-icon.png", request.url).toString(),
    },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "54px 62px",
          color: "#FAFAFA",
          background: "#0A0A0B",
          fontFamily: "Poppins",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DitheredEdge side="left" color="#2D5BFF" />
        <DitheredEdge side="right" color="#C9FF2F" />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              display: "flex",
              alignItems: "center",
              gap: 15,
              fontSize: 26,
            }}
          >
            <img
              src={logo}
              width="44"
              height="44"
              alt=""
              style={{ borderRadius: 10 }}
            />{" "}
            ETH.sh
          </div>
          <div
            style={{
              position: "absolute",
              right: 0,
              height: 44,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              color: "#FAFAFA",
              background: "#111113",
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 22,
              fontSize: 18,
            }}
          >
            LayerZero OFT
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: -44,
            left: 0,
            width: size.width,
            height: size.height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 68,
              lineHeight: 0.96,
              letterSpacing: "-.055em",
            }}
          >
            Base -&gt; Robinhood Chain
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 25,
              color: "#A1A1AA",
              fontSize: 25,
            }}
          >
            Bridge Base coins to Robinhood &amp; Add liquidity
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 380,
            left: 0,
            width: size.width,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          {tokens.map((token) => (
            <div
              key={token.symbol}
              style={{
                height: 58,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 20px 8px 10px",
                background: "#111113",
                border: "1px solid rgba(255,255,255,.13)",
                borderRadius: 29,
                fontSize: 20,
              }}
            >
              <img
                src={token.logo}
                width="38"
                height="38"
                alt=""
                style={{ borderRadius: 19 }}
              />
              {token.symbol}
            </div>
          ))}
          <div
            style={{
              width: 58,
              height: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#A1A1AA",
              background: "#111113",
              border: "1px solid rgba(255,255,255,.13)",
              borderRadius: 29,
              fontSize: 38,
              fontFamily: "sans-serif",
              fontWeight: 400,
            }}
          >
            +
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 54,
            left: 0,
            width: size.width,
            display: "flex",
            justifyContent: "center",
            color: "#71717A",
            fontSize: 18,
          }}
        >
          eth.sh/robin-bridge
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Poppins", data: font, style: "normal" }] }
  );
}
