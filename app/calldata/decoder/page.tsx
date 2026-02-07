import { fetchFunctionInterface } from "@/lib/decoder";
import { getMetadata, startHexWith0x } from "@/utils";
import type { Metadata } from "next";
// Putting the page into separate component as it uses "use client" which doesn't work with `generateMetadata`
import { CalldataDecoderPage as CalldataDecoderP } from "./CalldataDecoderPage";
import { metadata } from "../layout";
import { Chain, createPublicClient, Hex, http } from "viem";
import { c, chainIdToChain } from "@/data/common";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  let title = "ETH Calldata Decoder | ETH.sh";

  let calldata = params.calldata as string | undefined;
  let tx = params.tx as string | undefined;

  // add function name to the title if possible
  if (tx) {
    let chainId = params.chainId as string | undefined;
    let chain: Chain;

    try {
      let txHash: string;
      if (/^0x([A-Fa-f0-9]{64})$/.test(tx)) {
        txHash = tx;

        if (!chainId) throw new Error("Chain ID not provided");
        chain = chainIdToChain[parseInt(chainId)];
      } else {
        txHash = tx.split("/").pop()!;

        const chainKey = Object.keys(c).filter((chainKey) => {
          const chain = c[chainKey as keyof typeof c] as Chain;

          // using "null" instead of "" because tx.split("/") contains ""
          let explorerDomainDefault = "null";
          let explorerDomainEtherscan = "null";
          if (chain.blockExplorers) {
            explorerDomainDefault = chain.blockExplorers.default.url
              .split("//")
              .pop()!;

            if (chain.blockExplorers.etherscan) {
              explorerDomainEtherscan = chain.blockExplorers.etherscan.url
                .split("//")
                .pop()!;
            }
          }

          return (
            tx!
              .split("/")
              .filter(
                (urlPart) =>
                  urlPart.toLowerCase() ===
                    explorerDomainDefault.toLowerCase() ||
                  urlPart.toLowerCase() ===
                    explorerDomainEtherscan.toLowerCase()
              ).length > 0
          );
        })[0];
        chain = c[chainKey as keyof typeof c];
      }

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });
      const transaction = await publicClient.getTransaction({
        hash: txHash as Hex,
      });
      calldata = transaction.input;
    } catch {}
  }
  if (calldata) {
    calldata = startHexWith0x(calldata);
    const selector = calldata.slice(0, 10);
    const functionInterface = await fetchFunctionInterface({ selector });
    if (functionInterface) {
      const functionName = functionInterface.split("(")[0];
      title = `${functionName}() - Universal Calldata Decoder | ETH.sh`;
    }
  }

  return getMetadata({
    title,
    description: metadata.description as string,
    images: metadata.openGraph?.images as string,
  });
}

const CalldataDecoderPage = () => {
  return <CalldataDecoderP />;
};
export default CalldataDecoderPage;
