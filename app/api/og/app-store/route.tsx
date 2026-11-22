import { NextRequest } from "next/server";
import { renderToolOg } from "@/lib/toolOg";

export const runtime = "edge";

async function fetchAndConvertToDataUrl(
  imageUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(5000),
    });
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
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
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
      return new URL(ogImageMatch[1], url).href;
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
      return new URL(twitterImageMatch[1], url).href;
    }

    return null;
  } catch (error) {
    console.error("Error fetching OG image:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  let appUrl: URL;
  try {
    appUrl = new URL(raw || "");
    if (!["https:", "http:"].includes(appUrl.protocol))
      throw new Error("Invalid app URL");
  } catch {
    return new Response("Provide an app URL to preview.", { status: 400 });
  }
  const imageUrl = await getOgImage(appUrl.href);
  const artwork = imageUrl ? await fetchAndConvertToDataUrl(imageUrl) : null;
  const hostname =
    appUrl.hostname.length > 42
      ? `${appUrl.hostname.slice(0, 39)}…`
      : appUrl.hostname;
  return renderToolOg({
    title: "Web3 App Store",
    description: [hostname, "Your Web3 Operating System"],
    artworkSrc: artwork || undefined,
  });
}
