import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { getToolEntryRedirect } from "@/lib/seo";

export default async function ToolEntry() {
  const host = (await headers()).get("host");
  permanentRedirect(getToolEntryRedirect("transact", host));
}
