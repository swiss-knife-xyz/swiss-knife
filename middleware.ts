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
  // limit the request based on the IP
  const { success, limit, reset, remaining } = await ratelimit.limit(
    `ratelimit_middleware_${getIP(request)}`
  );

  // if the request isn't rate limited, continue
  const res = success
    ? NextResponse.next()
    : NextResponse.redirect(new URL("/api/blocked", request.url));

  res.headers.set("X-RateLimit-Limit", limit.toString());
  res.headers.set("X-RateLimit-Remaining", remaining.toString());
  res.headers.set("X-RateLimit-Reset", reset.toString());
  return res;
}

export const config = {
  matcher: "\/api\/(.*)",
};
