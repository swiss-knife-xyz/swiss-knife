import { ratelimit } from "@/lib/rateLimit";
import getIP from "@/utils";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
): Promise<Response | undefined> {
  // // API rate limiting logic
  // const { success, limit, reset, remaining } = await ratelimit.limit(
  //   `ratelimit_middleware_${getIP(request)}`
  // );

  // // if the request isn't rate limited, continue
  // const res =
  //   success || process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
  //     ? NextResponse.next()
  //     : NextResponse.redirect(new URL("/api/blocked", request.url));

  // res.headers.set("X-RateLimit-Limit", limit.toString());
  // res.headers.set("X-RateLimit-Remaining", remaining.toString());
  // res.headers.set("X-RateLimit-Reset", reset.toString());
  // return res;

  const response = NextResponse.next();

  // Handle URL params for bridge apps route
  const host = request.headers.get("host") || "";
  const isWalletSubdomain = host.startsWith("wallet.");

  if (
    (isWalletSubdomain &&
      request.nextUrl.pathname.startsWith("/bridge/apps")) ||
    (!isWalletSubdomain &&
      request.nextUrl.pathname.startsWith("/wallet/bridge/apps"))
  ) {
    response.headers.set("x-url-with-params", request.url);
  }

  return response;
}

export const config = {
  matcher: [
    // "/api/(.*)",  // For API rate limiting (commented out)
    "/wallet/bridge/apps/:path*", // For direct path
    "/bridge/apps/:path*", // For subdomain path
  ],
};
