import { createRpcHandler } from "@/lib/rawRpc/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;
export const POST = createRpcHandler();
