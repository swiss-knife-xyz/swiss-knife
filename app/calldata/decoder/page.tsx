import { fetchFunctionInterface } from "@/lib/decoder";
import { getMetadata, startHexWith0x } from "@/utils";
import type { Metadata } from "next";
// Putting the page into separate component as it uses "use client" which doesn't work with `generateMetadata`
import { CalldataDecoderPage as CalldataDecoderP } from "@/components/pages/CalldataDecoderPage";

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  let title = "ETH Calldata Decoder | Swiss-Knife.xyz";

  let calldata = searchParams.calldata as string | undefined;

  // add function name to the title if possible
  if (calldata) {
    calldata = startHexWith0x(calldata);
    const selector = calldata.slice(0, 10);
    const functionInterface = await fetchFunctionInterface({ selector });
    if (functionInterface) {
      const functionName = functionInterface.split("(")[0];
      title = `${functionName} - Universal Calldata Decoder | Swiss-Knife.xyz`;
    }
  }

  return getMetadata({
    title,
    description:
      "Decode any calldata, and view the parameters in a human-readable format, even without having the contract ABI with this Universal ETH Calldata Decoder.",
    images: "https://swiss-knife.xyz/og/calldata-decoder.png",
  });
}

const CalldataDecoderPage = () => {
  return <CalldataDecoderP />;
};
export default CalldataDecoderPage;
