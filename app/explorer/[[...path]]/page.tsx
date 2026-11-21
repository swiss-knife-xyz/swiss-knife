import { redirect } from "next/navigation";

/** Keep old local/preview directory bookmarks on the same origin. Live aliases
 * are handled in next.config before rendering, including cached permanent hops. */
export default async function LegacyExplorer({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { path = [] } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value)
      ? value
      : value === undefined
        ? []
        : [value])
      query.append(key, item);
  }
  const target =
    path[0] === "contract"
      ? `/contract/${path.slice(1).map(encodeURIComponent).join("/")}`
      : `/explorers${path.length ? `/${path.map(encodeURIComponent).join("/")}` : ""}`;
  redirect(`${target}${query.size ? `?${query}` : ""}`);
}
