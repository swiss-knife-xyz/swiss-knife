import { ImageResponse } from "next/og";
import { shutdownProjects } from "@/app/rip/data";

export const runtime = "edge";

const featuredProjectIds = [
  "abstract",
  "blast",
  "zapper",
  "ctrl-wallet",
  "odos",
  "moonbeam",
  "loopring-l2",
  "0xppl",
  "sophon-chain",
  "swellchain",
  "pudgy-party",
  "leap-wallet",
  "phi",
  "everclear",
  "syndicate-labs",
  "fantasy-top",
  "code4rena",
  "dl-news",
  "magic-eden-wallet",
  "foundation",
  "tally",
  "parsec",
  "zerolend",
  "polynomial-chain-trade",
];
const projectById = new Map(
  shutdownProjects.map((project) => [project.id, project])
);
const featuredProjects = featuredProjectIds.flatMap((id) => {
  const project = projectById.get(id);
  return project ? [project] : [];
});

export async function GET(request: Request) {
  const fontData = await fetch(
    new URL("../../../../assets/Poppins-Bold.ttf", import.meta.url)
  ).then((response) => response.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#080809",
          color: "#fafafa",
          padding: "38px 48px",
          fontFamily: "Poppins",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 76, lineHeight: 1.1, letterSpacing: -4 }}>
              R.I.P.
            </span>
            <span style={{ fontSize: 25, color: "#a1a1aa", marginTop: 9 }}>
              Web3 projects that shut down
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <span style={{ fontSize: 42, lineHeight: 1.2 }}>
              {shutdownProjects.length}
            </span>
            <span style={{ fontSize: 17, color: "#71717a", marginTop: 5 }}>
              Archived projects
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 30,
            position: "relative",
          }}
        >
          {featuredProjects.map((project) => (
            <div
              key={project.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 127,
                height: 112,
                border: "1px solid #27272a",
                borderRadius: 12,
                background: "#101012",
                gap: 9,
                padding: "8px 4px",
              }}
            >
              {/* ImageResponse renders native image elements, not next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={new URL(project.logo!, request.url).toString()}
                width={48}
                height={48}
                alt=""
                style={{
                  borderRadius: 12,
                  objectFit: "contain",
                  background: project.logoBackground || "transparent",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  lineHeight: 1.25,
                  textAlign: "center",
                  maxWidth: 117,
                  color: "#d4d4d8",
                }}
              >
                {project.name}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 620,
              background:
                "linear-gradient(to right, rgba(8,8,9,0), rgba(8,8,9,0.94) 48%, #080809 68%)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "absolute",
            right: 48,
            bottom: 38,
            gap: 14,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={new URL("/logo.png", request.url).toString()}
            width={80}
            height={80}
            alt="ETH.sh"
            style={{ borderRadius: 18 }}
          />
          <span style={{ fontSize: 24, letterSpacing: -1 }}>rip.ETH.sh</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Poppins", data: fontData, style: "normal", weight: 700 },
      ],
    }
  );
}
