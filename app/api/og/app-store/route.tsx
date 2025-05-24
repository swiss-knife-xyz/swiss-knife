import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const DEFAULT_OG_IMAGE = "https://swiss-knife.xyz/og/web3-app-store.png";

async function fetchAndConvertToDataUrl(
  imageUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const imageArrayBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageArrayBuffer).toString("base64");
    return `data:${
      response.headers.get("content-type") || "image/jpeg"
    };base64,${imageBase64}`;
  } catch (error) {
    console.error(`Error fetching image from ${imageUrl}:`, error);
    return null;
  }
}

async function getOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();

    // Try to find og:image meta tag
    const ogImageMatch =
      html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
      ) ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i
      );

    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }

    // Fallback to twitter:image
    const twitterImageMatch =
      html.match(
        /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
      ) ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["'][^>]*>/i
      );

    if (twitterImageMatch && twitterImageMatch[1]) {
      return twitterImageMatch[1];
    }

    return null;
  } catch (error) {
    console.error("Error fetching OG image:", error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return new Response("Missing url parameter", { status: 400 });
    }

    // Load Poppins font
    const fontData = await fetch(
      new URL("../../../../assets/Poppins-Bold.ttf", import.meta.url)
    ).then((res) => res.arrayBuffer());

    // Try to get the OG image URL and convert to data URL
    let imageDataUrl: string | null = null;
    const ogImageUrl = await getOgImage(url);

    if (ogImageUrl) {
      imageDataUrl = await fetchAndConvertToDataUrl(ogImageUrl);
    }

    // If no OG image found or failed to fetch, use default image
    if (!imageDataUrl) {
      imageDataUrl = await fetchAndConvertToDataUrl(DEFAULT_OG_IMAGE);

      // If even default image fails, return error
      if (!imageDataUrl) {
        return new Response("Failed to generate image", { status: 500 });
      }
    }

    // Try to load the Swiss-Knife logo
    let logoDataUrl: string | null = null;
    try {
      const logoResponse = await fetch(
        new URL("/public/splashImage.png", import.meta.url)
      );
      if (!logoResponse.ok) {
        throw new Error(`Failed to fetch logo: ${logoResponse.statusText}`);
      }
      const logoArrayBuffer = await logoResponse.arrayBuffer();
      const logoBase64 = Buffer.from(logoArrayBuffer).toString("base64");
      logoDataUrl = `data:image/png;base64,${logoBase64}`;
    } catch (error) {
      console.error("Error loading logo:", error);
      // Continue without logo if it fails to load
    }

    // Create the OG image with overlay
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "1200",
            height: "630",
            position: "relative",
            fontFamily: "Poppins",
          }}
        >
          {/* Background OG image */}
          <img
            src={imageDataUrl}
            alt="Website preview"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Dark overlay for better readability */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "250px",
              background: `linear-gradient(to bottom, 
                rgba(0,0,0,0) 0%, 
                rgba(0,0,0,0.7) 40%, 
                rgba(0,0,0,0.9) 80%
              )`,
            }}
          />

          {/* Red gradient overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "250px",
              background: `linear-gradient(to bottom, 
                rgba(220,10,45,0) 0%, 
                rgba(220,10,45,0.3) 60%, 
                rgba(220,10,45,0.5) 100%
              )`,
              mixBlendMode: "overlay",
            }}
          />

          {/* Content container with padding */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "40px",
              display: "flex",
              alignItems: "center",
              gap: "24px",
              filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.5))",
            }}
          >
            {logoDataUrl && (
              <img
                src={logoDataUrl}
                alt="Swiss-Knife Logo"
                style={{
                  width: "100px",
                  height: "100px",
                  filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.3))",
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                color: "white",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  lineHeight: "1.2",
                  letterSpacing: "-0.02em",
                }}
              >
                Swiss-Knife Wallet
              </span>
              <span
                style={{
                  fontSize: "24px",
                  opacity: 0.9,
                  fontWeight: "500",
                }}
              >
                Your Web3 Operating System
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
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
    console.error("Error generating OG image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
