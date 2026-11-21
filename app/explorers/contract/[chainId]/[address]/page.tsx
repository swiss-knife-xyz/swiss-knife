import { redirect } from "next/navigation";
import { getPath } from "@/utils";

export default async function ExplorerContractPage({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: Promise<{ address: string; chainId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { address, chainId } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value)
      ? value
      : value === undefined
        ? []
        : [value])
      query.append(key, item);
  }
  redirect(
    `${getPath("contract")}${encodeURIComponent(chainId)}/${encodeURIComponent(address)}${query.size ? `?${query}` : ""}`
  );
}
