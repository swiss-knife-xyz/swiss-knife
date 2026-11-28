import { createHostedTraceHandler } from "@/lib/tracer/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const POST = createHostedTraceHandler();
