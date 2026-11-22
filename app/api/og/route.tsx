import { renderToolOg } from "@/lib/toolOg";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const explorerType = searchParams.get("explorerType");
  const value = searchParams.get("value")?.trim();
  if (
    !value ||
    value.length > 256 ||
    !["address", "tx"].includes(explorerType || "")
  ) {
    return new Response("Provide an address or transaction to preview.", {
      status: 400,
    });
  }
  const isAddress = explorerType === "address";
  return renderToolOg({
    title: "Explorer Directory",
    description: [
      isAddress
        ? "Browse this address across EVM explorers."
        : "Browse this transaction across EVM explorers.",
    ],
    detail: { label: isAddress ? "Address / ENS" : "Transaction", value },
  });
}
