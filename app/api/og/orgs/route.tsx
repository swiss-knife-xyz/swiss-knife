import { ImageResponse } from "next/og";
import { ethereumOrgs, type EthereumOrg } from "@/app/orgs/data";

export const runtime = "edge";

export const alt = "Ethereum Orgs Directory";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const logoSrcOverrides: Record<string, string> = {
  "ethereum-foundation": "/external/ethereum-foundation.svg",
};

const getPublicAssetUrl = (path: string, request: Request) =>
  new URL(path, request.url).toString();

const getOrgLogoUrl = (org: EthereumOrg, request: Request) =>
  logoSrcOverrides[org.id]
    ? getPublicAssetUrl(logoSrcOverrides[org.id], request)
    : `https://www.google.com/s2/favicons?domain=${org.logoDomain}&sz=128`;

const ogCategoryLabels: Record<string, string> = {
  "ethereum-applications-guild": "App adoption",
  "ethereum-economic-zone": "Composability infra",
  argot: "Compiler tooling",
  "ethereum-institutional": "Institutions",
};

const getOgCategoryLabel = (org: EthereumOrg) =>
  ogCategoryLabels[org.id] ?? org.category;

export async function GET(request: Request) {
  try {
    const fontData = await fetch(
      new URL("../../../../assets/Poppins-Bold.ttf", import.meta.url)
    ).then((response) => response.arrayBuffer());
    const logoUrl = getPublicAssetUrl("/logo.png", request);
    const orgLogoUrls = ethereumOrgs.map((org) => getOrgLogoUrl(org, request));

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#080809",
            color: "#FAFAFA",
            fontFamily: "Poppins",
            padding: "54px 60px",
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
                "linear-gradient(rgba(255,255,255,0.034) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.034) 1px, transparent 1px)",
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
                "radial-gradient(circle at 12% 8%, rgba(59,130,246,0.18), transparent 32%), radial-gradient(circle at 94% 18%, rgba(232,65,66,0.14), transparent 30%)",
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
                eth.sh/orgs
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                gap: 32,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 410,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#60A5FA",
                    fontSize: 25,
                    marginBottom: 20,
                  }}
                >
                  Ethereum ecosystem directory
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 78,
                    lineHeight: 0.98,
                    letterSpacing: "-0.045em",
                    maxWidth: 410,
                  }}
                >
                  Ethereum Orgs
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#B9B9C0",
                    fontSize: 27,
                    lineHeight: 1.34,
                    marginTop: 26,
                    maxWidth: 400,
                  }}
                >
                  Foundations, labs, guilds, collectives, and adoption groups
                  shaping Ethereum stewardship.
                </div>
              </div>

              <div
                style={{
                  width: 642,
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  background: "rgba(17,17,19,0.82)",
                  overflow: "hidden",
                }}
              >
                {ethereumOrgs.map((org, index) => (
                  <div
                    key={org.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      height: 68,
                      padding: "0 18px",
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
                          alignItems: "center",
                          justifyContent: "center",
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          border: "1px solid rgba(255,255,255,0.16)",
                          background: "rgba(255,255,255,0.055)",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={orgLogoUrls[index]}
                          width={org.id === "ethereum-foundation" ? 18 : 27}
                          height={org.id === "ethereum-foundation" ? 31 : 27}
                          alt=""
                          style={{
                            borderRadius:
                              org.id === "ethereum-foundation" ? 0 : 8,
                            objectFit: "contain",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 21,
                            color: "#F5F5F5",
                            maxWidth: 360,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {org.name}
                        </span>
                        <span style={{ fontSize: 13, color: "#85858F" }}>
                          {org.stage}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "6px 10px",
                        borderRadius: 10,
                        background: "rgba(59,130,246,0.12)",
                        border: "1px solid rgba(59,130,246,0.22)",
                        color: "#93C5FD",
                        fontSize: 13,
                        maxWidth: 178,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {getOgCategoryLabel(org)}
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
          },
        ],
      }
    );
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
