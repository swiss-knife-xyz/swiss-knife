import { ImageResponse } from "next/og";
import { skillResources, type SkillResource } from "@/app/skills/data";

export const runtime = "edge";

export const alt = "Web3 AI Skills directory";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const featuredResourceIds = [
  "polymarket-cli",
  "hyperliquid-cli",
  "walletchan-mcp",
  "base-mcp",
  "uniswap-ai",
  "morpho-agents",
  "fluid-skill",
];

const resourceById = new Map(
  skillResources.map((resource) => [resource.id, resource])
);
const featuredResources = featuredResourceIds.flatMap((id) => {
  const resource = resourceById.get(id);
  return resource ? [resource] : [];
});

const getPublicAssetUrl = (path: string, request: Request) =>
  new URL(path, request.url).toString();

const getFaviconUrl = (resource: SkillResource) =>
  `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
    `https://${resource.logoDomain}`
  )}&sz=128`;

const getToolTypeCount = () =>
  new Set(skillResources.flatMap((resource) => resource.toolTypes)).size;

const getMcpCount = () =>
  skillResources.filter((resource) => resource.toolTypes.includes("MCP"))
    .length;

const getCliWalletCount = () =>
  skillResources.filter(
    (resource) =>
      resource.toolTypes.includes("CLI") ||
      resource.toolTypes.includes("Wallet")
  ).length;

export async function GET(request: Request) {
  try {
    const [fontData] = await Promise.all([
      fetch(
        new URL("../../../../assets/Poppins-Bold.ttf", import.meta.url)
      ).then((response) => response.arrayBuffer()),
    ]);
    const logoUrl = getPublicAssetUrl("/logo.png", request);
    const resourceLogoUrls = featuredResources.map(getFaviconUrl);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#080809",
            color: "#F6F6F7",
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
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              opacity: 0.24,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background:
                "linear-gradient(135deg, rgba(232,65,66,0.22), transparent 34%), linear-gradient(315deg, rgba(75,115,255,0.16), transparent 32%)",
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
                skills.eth.sh
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
                  width: 492,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 82,
                    lineHeight: 0.98,
                    letterSpacing: "-0.045em",
                    maxWidth: 490,
                  }}
                >
                  Web3 AI Skills
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#B9B9C0",
                    fontSize: 28,
                    lineHeight: 1.34,
                    marginTop: 26,
                    maxWidth: 475,
                  }}
                >
                  Skills, MCP servers, CLIs, wallets, models, and protocol
                  interfaces for onchain agents.
                </div>

                <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
                  {[
                    ["Resources", skillResources.length.toString()],
                    ["Tool types", getToolTypeCount().toString()],
                    ["MCP", getMcpCount().toString()],
                    ["CLI / wallet", getCliWalletCount().toString()],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 104,
                        padding: "13px 15px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 15,
                        background: "rgba(255,255,255,0.045)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          color: "#8D8D96",
                          fontSize: 16,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          fontSize: 31,
                          marginTop: 4,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  width: 555,
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  background: "rgba(17,17,19,0.84)",
                  overflow: "hidden",
                }}
              >
                {featuredResources.map((resource, index) => (
                  <div
                    key={resource.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      height: 62,
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
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          border: resource.logoBg
                            ? "1px solid rgba(255,255,255,0.14)"
                            : "1px solid rgba(0,0,0,0.08)",
                          background:
                            resource.logoBg ?? "rgba(255,255,255,0.94)",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={resourceLogoUrls[index]}
                          width={28}
                          height={28}
                          alt=""
                          style={{
                            borderRadius: 7,
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
                            fontSize: 20,
                            color: "#F5F5F5",
                            maxWidth: 300,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {resource.name}
                        </span>
                        <span style={{ fontSize: 13, color: "#85858F" }}>
                          {resource.provider}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {resource.toolTypes.slice(0, 2).map((type) => (
                        <div
                          key={type}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            height: 28,
                            padding: "0 10px",
                            borderRadius: 999,
                            color: "#F5F5F5",
                            fontSize: 14,
                            background: "rgba(232,65,66,0.12)",
                            border: "1px solid rgba(232,65,66,0.3)",
                          }}
                        >
                          {type}
                        </div>
                      ))}
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
