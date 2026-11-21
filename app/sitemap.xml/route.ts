import { getSitemapUrls } from "@/lib/crawlerDiscovery";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const urls = getSitemapUrls(request.headers.get("host"));
  const headers = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (!urls.length) return new Response("Not found", { status: 404, headers });
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`;
  return new Response(body, { status: 200, headers });
}
