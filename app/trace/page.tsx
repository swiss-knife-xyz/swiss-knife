import type { Metadata } from "next";
import { TracePage } from "./TracePage";
type Params = { chain?: string | string[]; hash?: string | string[] };
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const query = await searchParams;
  return query.hash || query.chain
    ? { robots: { index: false, follow: true } }
    : {};
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const query = await searchParams;
  return (
    <TracePage
      initialHash={
        typeof query.hash === "string" && query.hash.length <= 66
          ? query.hash
          : ""
      }
      initialChain={typeof query.chain === "string" ? query.chain : "1"}
    />
  );
}
