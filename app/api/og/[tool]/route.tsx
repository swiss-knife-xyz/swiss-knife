import { renderToolOg } from "@/lib/toolOg";
import { toolOgCards, type ToolOgSlug } from "@/lib/toolOgCards";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tool: string }> }
) {
  const { tool } = await params;
  if (!Object.hasOwn(toolOgCards, tool)) {
    return new Response("Unknown OG image", { status: 404 });
  }
  return renderToolOg(toolOgCards[tool as ToolOgSlug]);
}
