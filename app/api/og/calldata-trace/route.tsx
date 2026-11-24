import { renderToolOg } from "@/lib/toolOg";
import { toolOgCards } from "@/lib/toolOgCards";

export const runtime = "edge";
export async function GET() {
  return renderToolOg(toolOgCards["calldata-trace"]);
}
