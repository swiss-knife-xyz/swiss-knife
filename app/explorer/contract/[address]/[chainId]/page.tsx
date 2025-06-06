import { redirect } from "next/navigation";
import { getPath } from "@/utils";

export default function ExplorerContractPage({
  params,
}: {
  params: { address: string; chainId: string };
}) {
  redirect(`${getPath("contract")}${params.address}/${params.chainId}`);
}
