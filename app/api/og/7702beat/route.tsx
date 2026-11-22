import { ImageResponse } from "next/og";
import { wallets } from "@/app/7702beat/data";
import { loadToolOgAssets, ToolOgBrand } from "@/lib/toolOg";

export const runtime = "edge";

async function loadIcon(path: string | undefined, request: Request) {
  if (!path) return;
  try {
    const response = await fetch(new URL(path, request.url), {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return;
    const type = response.headers.get("content-type") || "";
    // Satori does not decode WebP or ICO. Missing artwork uses the label below.
    if (!/image\/(png|jpeg|svg\+xml)/.test(type)) return;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let mime: string;
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      mime = "image/png";
    } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      mime = "image/jpeg";
    } else if (
      new TextDecoder()
        .decode(bytes)
        .trimStart()
        .match(/^(?:<\?xml[^>]*>\s*)?<svg[\s>]/)
    ) {
      mime = "image/svg+xml";
    } else {
      return;
    }
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return;
  }
}

export async function GET(request: Request) {
  const [{ logo, fonts }, walletIcons] = await Promise.all([
    loadToolOgAssets(),
    Promise.all(wallets.map((wallet) => loadIcon(wallet.logoUrl, request))),
  ]);
  const rows = Math.ceil(wallets.length / 3);
  const cardHeight = Math.min(74, (320 - (rows - 1) * 10) / rows);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#111111",
          color: "white",
          fontFamily: "Poppins",
          fontWeight: 300,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 36,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.2 }}>
            7702 Beat
          </div>
          <div style={{ marginTop: 9, fontSize: 25, whiteSpace: "nowrap" }}>
            Track EIP-7702 adoption across EVM chains, wallets and dapps.
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 207,
            fontSize: 25,
            fontWeight: 700,
          }}
        >
          Wallets
        </div>
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 255,
            width: 660,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {wallets.map((wallet, index) => (
            <div
              key={wallet.name}
              style={{
                width: 213,
                height: cardHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 7,
                border: "1px solid #38383e",
                borderRadius: 8,
              }}
            >
              {walletIcons[index] ? (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    background: wallet.name === "Bitget" ? "transparent" : "white",
                  }}
                >
                  <img
                    alt=""
                    src={walletIcons[index]}
                    width={36}
                    height={36}
                    style={{ objectFit: "contain", borderRadius: 8 }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 6,
                    background: "#303033",
                  }}
                >
                  {wallet.name[0]}
                </div>
              )}
              <span style={{ fontSize: 14, lineHeight: 1.1 }}>
                {wallet.name}
              </span>
            </div>
          ))}
        </div>
        <ToolOgBrand logo={logo} />
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
