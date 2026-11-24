import { type NextRequest, NextResponse } from "next/server";
import { getMigrationRedirect } from "@/lib/migration/redirect";

export default function middleware(request: NextRequest) {
  // Next's internal request URL may use the deployment/localhost origin.
  // Route on the actual Host header; the resolver accepts only exact legacy hosts.
  const incoming = new URL(request.url);
  incoming.host = request.headers.get("host") || incoming.host;
  const destination = getMigrationRedirect(incoming.toString(), {
    enabled:
      process.env.SWISS_KNIFE_MIGRATION_ENABLED === "true" &&
      (request.method === "GET" || request.method === "HEAD"),
  });
  if (destination) {
    return NextResponse.redirect(destination, 308);
  }

  const response = NextResponse.next();
  // Retain metadata handling for the legacy embedded app browser.
  if (request.nextUrl.pathname.includes("/bridge/apps")) {
    response.headers.set("x-url-with-params", request.url);
  }
  return response;
}

export const config = { matcher: ["/:path*"] };
