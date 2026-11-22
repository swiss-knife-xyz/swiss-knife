import { renderToolOg } from "@/lib/toolOg";
import { toolOgCards } from "@/lib/toolOgCards";
export const runtime = "edge";
export function GET() {
  return renderToolOg(toolOgCards["mock-tokens"]);
}
