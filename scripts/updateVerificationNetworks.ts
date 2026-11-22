/** Refresh public provider coverage. Review this diff before publishing new routes.
 * Sources: Etherscan chainlist, Sourcify /chains, Blockscout Chainscout,
 * Routescan's published /chains directory (only networks with API support).
 */
import { writeFile } from "node:fs/promises";
async function main() {
  const [etherscan, sourcify, blockscout] = await Promise.all([
    fetch("https://api.etherscan.io/v2/chainlist").then((r) => r.json()),
    fetch("https://sourcify.dev/server/chains").then((r) => r.json()),
    fetch(
      "https://raw.githubusercontent.com/blockscout/chainscout/main/data/chains.json"
    ).then((r) => r.json()),
  ]);
  const routescan = [
    1, 560048, 11155111, 43114, 43113, 5000, 13322, 88888, 88882, 4337, 13337,
    43419, 43111, 743111, 68414, 288, 28882, 6900, 6911, 432204, 432201, 1015,
    151, 153, 5566, 8021, 6119, 10507, 3011, 1234, 8227, 84358, 168587773,
  ];
  const extras = [
    100, 10200, 534352, 534351, 5000, 5003, 43114, 43113, 42220, 11142220,
    7777777, 999999999, 34443, 919, 81457, 168587773, 1868, 1946, 480, 4801,
    1135, 4202, 57073, 763373,
  ];
  const rows: Record<string, any> = {};
  const sourcifyById = new Map(
    sourcify.map((c: any) => [String(c.chainId), c])
  );
  for (const id of new Set([
    ...etherscan.result.map((c: any) => String(c.chainid)),
    ...extras.map(String),
    ...routescan.map(String),
  ])) {
    const e = etherscan.result.find(
      (c: any) => String(c.chainid) === id && c.status === 1
    );
    const s: any = sourcifyById.get(id);
    const b = blockscout[id];
    const testnet =
      b?.isTestnet ??
      /testnet|sepolia|hoodi|amoy|fuji|chiado|spicy/i.test(
        e?.chainname ?? s?.name ?? ""
      );
    const row: any = {
      name: e?.chainname ?? b?.name ?? s?.name ?? `Chain ${id}`,
      testnet,
    };
    if (e) row.etherscan = e.blockexplorer.replace(/\/$/, "");
    // Only known Blockscout-hosted instances by default. Self-hosted endpoints need
    // explicit API validation before admission; registry presence alone isn't enough.
    const instance = b?.explorers?.find(
      (v: any) =>
        v.hostedBy === "blockscout" &&
        new URL(v.url).hostname.endsWith("blockscout.com")
    );
    if (instance) row.blockscout = instance.url.replace(/\/$/, "");
    if (id === "10") row.blockscout = "https://optimism.blockscout.com";
    if (id === "11155420")
      row.blockscout = "https://optimism-sepolia.blockscout.com";
    if (s?.supported) row.sourcify = true;
    if (routescan.includes(Number(id))) row.routescan = true;
    if (row.etherscan || row.blockscout || row.sourcify || row.routescan)
      rows[id] = row;
  }
  await writeFile(
    "lib/verification/networks.json",
    JSON.stringify(rows, null, 2) + "\n"
  );
  console.log(
    `Updated ${Object.keys(rows).length} networks; validate provider APIs before enabling new instances.`
  );
}
main().catch(() => {
  console.error("Could not refresh provider registries");
  process.exitCode = 1;
});
