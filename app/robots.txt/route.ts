import { getRobotsText } from "@/lib/crawlerDiscovery";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return new Response(getRobotsText(request.headers.get("host")), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
