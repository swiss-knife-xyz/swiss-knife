import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BANKR bridge between Base and Robinhood Chain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function GET(request: Request) {
  const font = await fetch(
    new URL("../../../../assets/Poppins-Bold.ttf", import.meta.url)
  ).then((response) => response.arrayBuffer());
  const logo = new URL("/logo.png", request.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "54px 62px",
          color: "#f4f2ec",
          background: "#080a09",
          fontFamily: "Poppins",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 660,
            height: 660,
            borderRadius: "50%",
            top: -390,
            right: -50,
            display: "flex",
            background: "rgba(157,252,174,.17)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 15,
              fontSize: 26,
            }}
          >
            <img src={logo} width="44" height="44" alt="" /> ETH.sh
          </div>
          <div
            style={{
              display: "flex",
              color: "#9dfcae",
              border: "1px solid rgba(157,252,174,.3)",
              padding: "9px 13px",
              fontSize: 18,
            }}
          >
            LAYERZERO OFT
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
            <div
              style={{
                display: "flex",
                fontSize: 84,
                lineHeight: 0.96,
                letterSpacing: "-.055em",
              }}
            >
              BANKR, now on Robinhood.
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 25,
                color: "#9b9993",
                fontSize: 25,
              }}
            >
              Bridge both ways through the verified LayerZero route.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 92,
                height: 92,
                border: "1px solid rgba(255,255,255,.15)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              BASE
            </div>
            <div
              style={{
                display: "flex",
                width: 70,
                height: 2,
                background: "#9dfcae",
              }}
            />
            <div
              style={{
                width: 92,
                height: 92,
                color: "#081009",
                background: "#9dfcae",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 35,
              }}
            >
              R
            </div>
          </div>
        </div>
        <div
          style={{ display: "flex", color: "#666963", fontSize: 18, zIndex: 1 }}
        >
          eth.sh/bankr-bridge · Base ↔ Robinhood Chain
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Poppins", data: font, style: "normal" }] }
  );
}
