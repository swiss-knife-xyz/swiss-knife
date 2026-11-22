// Curated ERC-165 interfaces, not an ERC-number → ID lookup. Optional
// extensions have their own IDs. Sources explicitly publish each identifier.
export const erc165Interfaces = [
  {
    label: "ERC-165",
    id: "0x01ffc9a7",
    source: "https://eips.ethereum.org/EIPS/eip-165",
  },
  {
    label: "ERC-721",
    id: "0x80ac58cd",
    source: "https://eips.ethereum.org/EIPS/eip-721",
  },
  {
    label: "ERC-721 Metadata (optional)",
    id: "0x5b5e139f",
    source: "https://eips.ethereum.org/EIPS/eip-721#specification",
  },
  {
    label: "ERC-721 Enumerable (optional)",
    id: "0x780e9d63",
    source: "https://eips.ethereum.org/EIPS/eip-721#specification",
  },
  {
    label: "ERC-1155",
    id: "0xd9b67a26",
    source: "https://eips.ethereum.org/EIPS/eip-1155",
  },
  {
    label: "ERC-1155 Metadata URI (optional)",
    id: "0x0e89341c",
    source: "https://eips.ethereum.org/EIPS/eip-1155#metadata",
  },
  {
    label: "ERC-2981 Royalties",
    id: "0x2a55205a",
    source: "https://eips.ethereum.org/EIPS/eip-2981#specification",
  },
] as const;
