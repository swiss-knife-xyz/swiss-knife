import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "ENS to Gwei Name Service";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const getPublicAssetUrl = (path: string, request: Request) =>
  new URL(path, request.url).toString();

export async function GET(request: Request) {
  try {
    const fontData = await fetch(
      new URL("../../../../assets/Poppins-Bold.ttf", import.meta.url)
    ).then((response) => response.arrayBuffer());
    const logoUrl = getPublicAssetUrl("/logo.png", request);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: "#070708",
            color: "#F7F7F8",
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
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "54px 54px",
              opacity: 0.18,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background:
                "radial-gradient(circle at 22% 8%, rgba(125,211,252,0.18), transparent 32%), radial-gradient(circle at 78% 18%, rgba(134,239,172,0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.025), transparent 58%)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              padding: "46px 54px",
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
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img
                  src={logoUrl}
                  width={44}
                  height={44}
                  alt=""
                  style={{ borderRadius: 9 }}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    color: "#FFFFFF",
                  }}
                >
                  ETH.sh
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  color: "#A1A1AA",
                  fontSize: 24,
                }}
              >
                gwei.eth.sh
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
                  width: 470,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#7DD3FC",
                    fontSize: 28,
                    marginBottom: 22,
                  }}
                >
                  ENS migration tool
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    fontSize: 74,
                    lineHeight: 0.98,
                    color: "#FFFFFF",
                  }}
                >
                  <div style={{ display: "flex" }}>ENS to</div>
                  <div style={{ display: "flex", color: "#86EFAC" }}>
                    Gwei Name Service
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#D4D4D8",
                    fontSize: 22,
                    lineHeight: 1.28,
                    marginTop: 24,
                    maxWidth: 390,
                  }}
                >
                  Register your matching .gwei name, verify ownership, then
                  copy ENS records in one guided workspace.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 28,
                  background: "rgba(255,255,255,0.045)",
                  overflow: "hidden",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.26)",
                }}
              >
                <div style={{ display: "flex", width: "100%" }}>
                  <NameColumn tone="ens" suffix=".eth" value="apoorv" />
                  <NameColumn tone="gns" suffix=".gwei" value="apoorv" />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <RecordRow
                    label="Website"
                    target="Import"
                    targetTone="action"
                  />
                  <RecordRow
                    label="Avatar"
                    target="Import"
                    targetTone="action"
                  />
                  <RecordRow
                    label="Primary"
                    target="Set"
                    targetTone="ready"
                    isLast
                  />
                </div>
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
}

function NameColumn({
  tone,
  suffix,
  value,
}: {
  tone: "ens" | "gns";
  suffix: string;
  value: string;
}) {
  const accent = tone === "ens" ? "#7DD3FC" : "#86EFAC";
  const label = tone === "ens" ? "ENS" : "GNS";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "50%",
        padding: "24px",
        gap: 16,
        borderRight:
          tone === "ens" ? "1px solid rgba(255,255,255,0.08)" : "0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            display: "flex",
            width: 10,
            height: 10,
            borderRadius: 999,
            background: accent,
          }}
        />
        <div style={{ display: "flex", fontSize: 24, color: "#FFFFFF" }}>
          {label}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 68,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          background: "rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            paddingLeft: 20,
            fontSize: 33,
            color: "#F4F4F5",
          }}
        >
          {value}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "stretch",
            width: 92,
            borderLeft: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.055)",
            color: tone === "gns" ? "#C7F9D4" : "#A1A1AA",
            fontSize: 24,
          }}
        >
          {suffix}
        </div>
      </div>
    </div>
  );
}

function RecordRow({
  label,
  target,
  targetTone,
  isLast,
}: {
  label: string;
  target: string;
  targetTone: "action" | "ready";
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 78,
        borderBottom: isLast ? "0" : "1px solid rgba(255,255,255,0.075)",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          paddingLeft: 30,
          color: "#F4F4F5",
          fontSize: 26,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 12,
          width: 166,
          marginRight: 30,
          padding: "12px 18px",
          borderRadius: 999,
          border:
            targetTone === "action"
              ? "1px solid rgba(134,239,172,0.48)"
              : "1px solid rgba(255,255,255,0.11)",
          background:
            targetTone === "action"
              ? "rgba(34,197,94,0.13)"
              : "rgba(255,255,255,0.045)",
          color: targetTone === "action" ? "#BBF7D0" : "#FFFFFF",
          fontSize: targetTone === "action" ? 21 : 22,
        }}
      >
        <svg
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
        {target}
      </div>
    </div>
  );
}
