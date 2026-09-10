import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FaucetPageClient from "../FaucetPageClient";
import { getFaucetChainBySlug, getFaucetChainSeoEntries } from "../chains";
import { getFaucetMetadata } from "../metadata";

type FaucetChainPageProps = {
  params: Promise<{ chain: string }>;
};

export const generateStaticParams = () =>
  getFaucetChainSeoEntries().map(({ slug }) => ({ chain: slug }));

export async function generateMetadata({
  params,
}: FaucetChainPageProps): Promise<Metadata> {
  const { chain: slug } = await params;
  const chain = getFaucetChainBySlug(slug);

  if (!chain) return {};

  return getFaucetMetadata(chain);
}

const FaucetChainPage = async ({ params }: FaucetChainPageProps) => {
  const { chain: slug } = await params;
  const chain = getFaucetChainBySlug(slug);

  if (!chain) notFound();

  return <FaucetPageClient initialChain={chain} />;
};

export default FaucetChainPage;
