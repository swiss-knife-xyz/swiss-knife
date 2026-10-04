import { redirect } from "next/navigation";
import { getPath } from "@/utils";

export default async function ExplorerContractPage({
  params,
}: {
  params: Promise<{ address: string; chainId: string }>;
}) {
  const { address, chainId } = await params;
  redirect(`${getPath("contract")}${chainId}/${address}`);
}
