import { ImageResponse } from "next/og";
import { privacyProtocols } from "@/app/privacy/data";

export const runtime = "edge";

export const alt = "ETH.sh privacy protocol comparison";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const getPublicAssetUrl = (path: string, request: Request) =>
  new URL(path, request.url).toString();

const featuredProtocols = privacyProtocols.slice(0, 5);

const getProtocolLabel = (name: string, version?: string) =>
  version ? `${name} ${version}` : name;

const shortDepositFeeByProtocolId: Record<string, string> = {
  "tornado-cash": "0%",
  railgun: "0.25% shield",
  "privacy-pools-v1": "0%-0.5% vetting",
  "privacy-pools-v2": "0%",
  "veil-cash": "0.3% deposit",
};

export async function GET(request: Request) {
  try {
    const [fontData] = await Promise.all([
      fetch(
        new URL("../../../../assets/Poppins-Bold.ttf", import.meta.url)
      ).then((response) => response.arrayBuffer()),
    ]);
    const logoUrl = getPublicAssetUrl("/logo.png", request);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#080809",
            color: "#F7F7F8",
            fontFamily: "Poppins",
            padding: "52px 58px",
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
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              opacity: 0.22,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background:
                "linear-gradient(135deg, rgba(125,226,209,0.18), transparent 32%), linear-gradient(315deg, rgba(246,200,81,0.16), transparent 30%), radial-gradient(circle at 84% 12%, rgba(138,156,255,0.18), transparent 28%)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <img
                  src={logoUrl}
                  width={46}
                  height={46}
                  alt=""
                  style={{ borderRadius: 10 }}
                />
                <div style={{ display: "flex", fontSize: 28 }}>ETH.sh</div>
              </div>
              <div
                style={{
                  display: "flex",
                  color: "#A1A1AA",
                  fontSize: 23,
                }}
              >
                privacy.eth.sh
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                gap: 34,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 472,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 78,
                    lineHeight: 0.98,
                    maxWidth: 468,
                  }}
                >
                  Privacy Protocols
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#B9B9C0",
                    fontSize: 27,
                    lineHeight: 1.34,
                    marginTop: 24,
                    maxWidth: 455,
                  }}
                >
                  Compare chains, assets, fees, waits, transfers, and screening
                  models.
                </div>
              </div>

              <div
                style={{
                  width: 572,
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  background: "rgba(17,17,19,0.84)",
                  overflow: "hidden",
                }}
              >
                {featuredProtocols.map((protocol, index) => (
                  <div
                    key={protocol.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 18,
                      height: 70,
                      padding: "0 20px",
                      borderTop:
                        index === 0 ? "0" : "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 13,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          width: 13,
                          height: 48,
                          borderRadius: 999,
                          background: protocol.accent,
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            fontSize: 24,
                            color: "#F7F7F8",
                          }}
                        >
                          {getProtocolLabel(protocol.name, protocol.version)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            color: "#A1A1AA",
                            fontSize: 17,
                            marginTop: 3,
                            maxWidth: 338,
                          }}
                        >
                          {protocol.networks.slice(0, 3).join(" / ")}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        minWidth: 148,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          color: "#F6C851",
                          fontSize: 16,
                        }}
                      >
                        Deposit
                      </div>
                      <div
                        style={{
                          display: "flex",
                          color: "#D4D4D8",
                          fontSize: 19,
                          marginTop: 3,
                          textAlign: "right",
                        }}
                      >
                        {shortDepositFeeByProtocolId[protocol.id]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: "Poppins",
            data: fontData,
            style: "normal",
            weight: 700,
          },
        ],
      }
    );
  } catch (error) {
    return new Response(`Failed to generate privacy OG image: ${error}`, {
      status: 500,
    });
  }
}
