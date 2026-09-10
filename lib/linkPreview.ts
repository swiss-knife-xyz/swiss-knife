import { unstable_cache } from "next/cache";

export const LINK_PREVIEW_REVALIDATE_SECONDS = 7 * 24 * 60 * 60;

export type LinkPreviewInput = {
  url: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  fallbackImage?: string;
};

export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  image: string | null;
  favicon: string | null;
  siteName: string;
  hostname: string;
};

const blockedHostnames = new Set(["localhost", "0.0.0.0", "127.0.0.1"]);

const isBlockedHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase();

  if (blockedHostnames.has(normalized)) return true;
  if (normalized.endsWith(".local")) return true;
  if (normalized === "::1" || normalized === "[::1]") return true;
  if (/^127\./.test(normalized)) return true;
  if (/^10\./.test(normalized)) return true;
  if (/^192\.168\./.test(normalized)) return true;
  if (/^169\.254\./.test(normalized)) return true;

  const private172Match = normalized.match(/^172\.(\d+)\./);
  if (private172Match) {
    const secondOctet = Number(private172Match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
};

const getValidatedUrl = (url: string) => {
  const parsedUrl = new URL(url);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("URLs with credentials are not supported.");
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    throw new Error("Private and local URLs are not supported.");
  }

  return parsedUrl;
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const cleanText = (value?: string | null, maxLength = 220) => {
  if (!value) return "";

  const cleaned = decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}...`;
};

const getAttribute = (tag: string, attribute: string) => {
  const match = tag.match(
    new RegExp(`${attribute}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );

  return cleanText(match?.[2] ?? match?.[3] ?? match?.[4] ?? "", 600);
};

const getMetaContent = (html: string, keys: string[]) => {
  const normalizedKeys = keys.map((key) => key.toLowerCase());
  const metaTags = html.match(/<meta\s+[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const property = getAttribute(tag, "property").toLowerCase();
    const name = getAttribute(tag, "name").toLowerCase();

    if (normalizedKeys.includes(property) || normalizedKeys.includes(name)) {
      const content = getAttribute(tag, "content");
      if (content) return content;
    }
  }

  return "";
};

const getTitle = (html: string) => {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(titleMatch?.[1], 120);
};

const resolveUrl = (baseUrl: URL, value?: string | null) => {
  if (!value) return null;

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
};

const getFavicon = (html: string, baseUrl: URL) => {
  const linkTags = html.match(/<link\s+[^>]*>/gi) ?? [];

  for (const tag of linkTags) {
    const rel = getAttribute(tag, "rel").toLowerCase();
    if (!rel.includes("icon")) continue;

    const href = getAttribute(tag, "href");
    const resolvedHref = resolveUrl(baseUrl, href);
    if (resolvedHref) return resolvedHref;
  }

  return resolveUrl(baseUrl, "/favicon.ico");
};

const getFallbackPreview = (
  parsedUrl: URL,
  input: LinkPreviewInput
): LinkPreview => ({
  url: parsedUrl.toString(),
  title: input.fallbackTitle || parsedUrl.hostname,
  description: input.fallbackDescription || "",
  image: input.fallbackImage
    ? resolveUrl(parsedUrl, input.fallbackImage)
    : null,
  favicon: resolveUrl(parsedUrl, "/favicon.ico"),
  siteName: parsedUrl.hostname.replace(/^www\./, ""),
  hostname: parsedUrl.hostname.replace(/^www\./, ""),
});

const fetchLinkPreview = async (
  input: LinkPreviewInput
): Promise<LinkPreview> => {
  const parsedUrl = getValidatedUrl(input.url);
  const fallbackPreview = getFallbackPreview(parsedUrl, input);

  try {
    const response = await fetch(parsedUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "ETH.sh link preview fetcher",
      },
      next: { revalidate: LINK_PREVIEW_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) {
      return fallbackPreview;
    }

    const html = await response.text();
    const title =
      getMetaContent(html, ["og:title", "twitter:title"]) ||
      getTitle(html) ||
      fallbackPreview.title;
    const description =
      getMetaContent(html, [
        "og:description",
        "twitter:description",
        "description",
      ]) || fallbackPreview.description;
    const image =
      resolveUrl(
        parsedUrl,
        getMetaContent(html, ["og:image", "twitter:image"]) ||
          input.fallbackImage
      ) ?? null;
    const siteName =
      getMetaContent(html, ["og:site_name", "application-name"]) ||
      fallbackPreview.siteName;

    return {
      url: parsedUrl.toString(),
      title: cleanText(title, 120),
      description: cleanText(description, 220),
      image,
      favicon: getFavicon(html, parsedUrl),
      siteName: cleanText(siteName, 80),
      hostname: fallbackPreview.hostname,
    };
  } catch {
    return fallbackPreview;
  }
};

export const getCachedLinkPreview = unstable_cache(
  async (input: LinkPreviewInput) => fetchLinkPreview(input),
  ["link-preview-v1"],
  {
    revalidate: LINK_PREVIEW_REVALIDATE_SECONDS,
  }
);
