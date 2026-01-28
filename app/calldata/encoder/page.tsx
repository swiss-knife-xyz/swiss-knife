import { getMetadata } from "@/utils";
import type { Metadata } from "next";
import { CalldataEncoderPage as CalldataEncoderP } from "./CalldataEncoderPage";
import { metadata as parentMetadata } from "../layout";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata({
    title: "ETH Calldata Encoder | ETH.sh",
    description: parentMetadata.description as string,
    images: parentMetadata.openGraph?.images as string,
  });
}

const CalldataEncoderPage = () => {
  return <CalldataEncoderP />;
};
export default CalldataEncoderPage;
