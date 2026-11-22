import { ImageResponse } from "next/og";
import type { ToolOgArtwork, ToolOgCard } from "./toolOgCards";

const x = (value: number) => (value / 2144) * 1200;
const y = (value: number) => (value / 1122) * 630;
const read = (url: URL) =>
  fetch(url).then((response) => response.arrayBuffer());

// Explicit URLs let Next bundle these assets into the edge function.
const artworkLoaders: Record<ToolOgArtwork, () => Promise<ArrayBuffer>> = {
  cow: () => read(new URL("../assets/cow-face.png", import.meta.url)),
  apps: () => read(new URL("../assets/og-apps.png", import.meta.url)),
  "ens-ccip": () => read(new URL("../assets/og-ens-ccip.png", import.meta.url)),
  "usdc-pay": () => read(new URL("../assets/og-usdc-pay.png", import.meta.url)),
};

export async function loadToolOgAssets() {
  const [bold, light, logo] = await Promise.all([
    read(new URL("../assets/Poppins-Bold.ttf", import.meta.url)),
    read(new URL("../assets/Poppins-Light.ttf", import.meta.url)),
    read(new URL("../public/logo.png", import.meta.url)),
  ]);
  return {
    logo,
    fonts: [
      {
        name: "Poppins",
        data: bold,
        weight: 700 as const,
        style: "normal" as const,
      },
      {
        name: "Poppins",
        data: light,
        weight: 300 as const,
        style: "normal" as const,
      },
    ],
  };
}

export async function renderToolOg(card: ToolOgCard) {
  const [{ logo, fonts }, artwork] = await Promise.all([
    loadToolOgAssets(),
    card.artwork ? artworkLoaders[card.artwork]() : card.artworkSrc,
  ]);
  const illustrated =
    !!(card.artwork || card.artworkSrc) && card.artwork !== "cow";
  const cow = card.artwork === "cow";
  const diagram = card.artwork === "ens-ccip";
  const largeArtwork = diagram;

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
        {artwork && (
          <img
            alt=""
            src={artwork as unknown as string}
            width={largeArtwork ? 700 : cow ? x(128) : 450}
            height={diagram ? 453 : cow ? y(120) : 480}
            style={{
              position: "absolute",
              left: largeArtwork ? 72 : cow ? x(180) : 65,
              top: diagram ? 177 : cow ? y(255) : 65,
              objectFit: "contain",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: largeArtwork ? 72 : illustrated ? 570 : cow ? x(336) : x(180),
            top: largeArtwork ? 40 : illustrated ? 130 : y(245),
            width: largeArtwork ? 1056 : illustrated ? 550 : cow ? 910 : 1000,
            fontSize:
              card.titleSize ?? (largeArtwork ? 80 : illustrated ? 49 : x(128)),
            lineHeight: 1.25,
            fontWeight: 700,
          }}
        >
          {card.title}
        </div>
        {!diagram && (
          <div
            style={{
              position: "absolute",
              left: illustrated ? 570 : x(180),
              top: illustrated ? 285 : y(465),
              width: illustrated ? 550 : 1000,
              display: "flex",
              flexDirection: "column",
              fontSize: illustrated ? 26 : x(64),
              lineHeight: 1.46,
            }}
          >
            {card.description.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        )}
        {card.detail && (
          <div
            style={{
              position: "absolute",
              left: x(180),
              top: 330,
              width: 1000,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18, color: "#a1a1aa" }}>
              {card.detail.label}
            </span>
            <span
              style={{
                fontSize: card.detail.value.length > 50 ? 23 : 28,
                lineHeight: 1.4,
                wordBreak: "break-all",
              }}
            >
              {card.detail.value.length > 100
                ? `${card.detail.value.slice(0, 97)}…`
                : card.detail.value}
            </span>
          </div>
        )}
        <ToolOgBrand logo={logo} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    }
  );
}

export function ToolOgBrand({ logo }: { logo: ArrayBuffer }) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x(1225),
          top: y(800),
          width: x(919),
          height: y(130),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: x(28),
        }}
      >
        <img
          alt="ETH.sh logo"
          src={logo as unknown as string}
          width={x(130)}
          height={y(130)}
          style={{ borderRadius: x(32) }}
        />
        <span style={{ fontSize: x(100), fontWeight: 700, lineHeight: 1 }}>
          ETH.sh
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: x(1225),
          top: y(950),
          width: x(919),
          display: "flex",
          justifyContent: "center",
          fontSize: x(40),
          whiteSpace: "nowrap",
        }}
      >
        All your EVM dev tools in one place!
      </div>
    </>
  );
}

export function StackedToolOgBrand({ logo }: { logo: ArrayBuffer }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x(1580),
        top: y(700),
        width: x(564),
        display: "flex",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <img
        alt="ETH.sh logo"
        src={logo as unknown as string}
        width={x(159)}
        height={y(159)}
        style={{ borderRadius: x(32) }}
      />
      <div
        style={{
          marginTop: y(47),
          fontSize: x(64),
          fontWeight: 700,
          lineHeight: 1.25,
        }}
      >
        ETH.sh
      </div>
      <div style={{ marginTop: y(21), fontSize: x(26), whiteSpace: "nowrap" }}>
        All your EVM dev tools in one place!
      </div>
    </div>
  );
}
