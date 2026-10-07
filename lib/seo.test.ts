import assert from "node:assert/strict";
import { test } from "node:test";
import sitemap from "../app/sitemap";
import { getMetadata } from "../utils";
import { getPath } from "../utils";
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import nextConfig from "../next.config.js";
import { defaultTools, getToolEntryRedirect } from "./seo";

test("category redirects preserve arbitrary local ports and preview origins without a development flag", () => {
  for (const [base, tool] of Object.entries(defaultTools)) {
    for (const host of ["localhost:3212", "127.0.0.1:8765", "[::1]:4317", "review.vercel.app", "solidity.eth.sh.attacker.example", null]) {
      assert.equal(getToolEntryRedirect(base, host), `/${base}/${tool}`);
    }
    assert.equal(getToolEntryRedirect(base, `${base}.eth.sh`), `https://${base}.eth.sh/${tool}`);
    assert.equal(getToolEntryRedirect(base, "eth.sh"), `https://${base}.eth.sh/${tool}`);
  }
});

function layouts(dir = new URL("../app/", import.meta.url)): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
    return entry.isDirectory() ? layouts(url) : entry.name === "layout.tsx" ? [url] : [];
  });
}

const headingPages = [
  "calldata/cowswap/CoWSwapVerifyPage.tsx", "uniswap/tick-to-price/page.tsx", "storage-slots/page.tsx", "siwe/page.tsx", "explorer/ExplorerLayout.tsx",
  "contract/page.tsx", "contract/[chainId]/[address]/page.tsx", "determine-address/page.tsx",
  "epoch-converter/page.tsx", "contract-diff/page.tsx", "character-counter/page.tsx", "constants/page.tsx",
  "converter/eth/page.tsx", "converter/hexadecimal/page.tsx", "converter/keccak256/page.tsx", "converter/padding/page.tsx", "converter/address-checksum/page.tsx",
  "calldata/decoder/CalldataDecoderPage.tsx", "calldata/encoder/CalldataEncoderPage.tsx", "calldata/viem-error-simulate/page.tsx",
  "safe/eip-712-hash/page.tsx", "solidity/compiler/page.tsx", "foundry/forge-stack-tracer-ui/page.tsx", "ens/history/ENSHistoryLayout.tsx",
  "uniswap/swap/page.tsx", "uniswap/positions/page.tsx", "uniswap/initialize-pool/page.tsx", "uniswap/add-liquidity/page.tsx", "uniswap/pool-price-to-target/page.tsx",
  "wallet/signatures/page.tsx", "wallet/bridge/page.tsx", "wallet/_smart-wallet-connect/SmartWalletConnect.tsx", "transact/send-tx/page.tsx", "apps/page.tsx", "gwei/GweiMigrationPage.tsx", "migrate/MigratePage.tsx",
];
test("tool title headings expose an H1 without promoting navigation headings", () => {
  for (const path of headingPages) {
    assert.match(readFileSync(new URL(`../app/${path}`, import.meta.url), "utf8"), /<Heading\s+as="h1"/, path);
  }
});

test("public tool leaves have page-specific canonical metadata and dedicated OG routes", () => {
  for (const path of ["uniswap/tick-to-price", "uniswap/pool-price-to-target", "uniswap/swap", "uniswap/add-liquidity", "uniswap/initialize-pool", "uniswap/positions", "calldata/encoder", "transact/send-tx"]) {
    const source = readFileSync(new URL(`../app/${path}/layout.tsx`, import.meta.url), "utf8");
    const slug = path.replaceAll("/", "-");
    assert.ok(source.includes(`https://${path.split("/")[0]}.eth.sh/${path.split("/")[1]}`), path);
    assert.ok(source.includes(`/api/og/${slug}`), path);
    assert.doesNotThrow(() => readFileSync(new URL(`../app/api/og/${slug}/route.tsx`, import.meta.url)));
  }
});

import { generateMetadata as contractMetadata } from "../app/contract/[chainId]/[address]/layout";
import { generateMetadata as decoderMetadata } from "../app/calldata/decoder/page";

test("dynamic contract metadata canonical preserves chain and address", async () => {
  const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const metadata = await contractMetadata({ params: Promise.resolve({ address, chainId: "1" }) } as any);
  assert.equal(metadata.alternates?.canonical, `https://contract.eth.sh/1/${address}`);
});

test("decoder metadata keeps a string image URL and query-free canonical", async () => {
  const metadata = await decoderMetadata({ searchParams: Promise.resolve({}) });
  assert.equal(metadata.alternates?.canonical, "https://calldata.eth.sh/decoder");
  assert.equal(typeof (metadata.openGraph as any).images[0].url, "string");
});

import { generateMetadata as addressMetadata } from "../app/explorer/address/[address]/layout";
import { generateMetadata as txMetadata } from "../app/explorer/tx/[tx]/layout";
import ExplorerContractAlias from "../app/explorer/contract/[chainId]/[address]/page";

test("explorer metadata awaits Next 16 params and canonicals identify the record", async () => {
  const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const tx = `0x${"1".repeat(64)}`;
  assert.equal((await addressMetadata({ params: Promise.resolve({ address }) } as any)).alternates?.canonical, `https://explorer.eth.sh/address/${address}`);
  assert.equal((await txMetadata({ params: Promise.resolve({ tx }) } as any)).alternates?.canonical, `https://explorer.eth.sh/tx/${tx}`);
});

test("legacy explorer contract alias awaits params before redirecting", async () => {
  const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  await assert.rejects(async () => ExplorerContractAlias({ params: Promise.resolve({ address, chainId: "1" }) } as any), (error: any) => {
    assert.ok(error.digest.includes(`https://contract.eth.sh/1/${address}`));
    return true;
  });
});

test("explorer record pages unwrap promised params before generating outbound links", () => {
  for (const path of ["explorer/address/[address]", "explorer/tx/[tx]"]) {
    assert.match(readFileSync(new URL(`../app/${path}/page.tsx`, import.meta.url), "utf8"), /use\(params\)/);
  }
});

test("USDC Pay uses its existing visible title as an H1", () => {
  const source = readFileSync(new URL("../app/usdc-pay/page.tsx", import.meta.url), "utf8");
  assert.match(source, /<Text\s+as="h1"[\s\S]*?USDC Pay/);
});

test("query-dependent tools expose a semantic crawlable loading shell before hydration", () => {
  for (const path of ["apps/page.tsx", "calldata/encoder/CalldataEncoderPage.tsx", "explorer/ExplorerLayout.tsx", "contract-diff/page.tsx", "converter/eth/page.tsx", "transact/send-tx/page.tsx", "calldata/decoder/CalldataDecoderPage.tsx", "safe/eip-712-hash/page.tsx", "usdc-pay/page.tsx", "siwe/page.tsx"]) {
    const source = readFileSync(new URL(`../app/${path}`, import.meta.url), "utf8");
    assert.match(source, /fallback=\{\s*<ToolLoading\b/, path);
  }
});

test("footer exposes a server-rendered directory of public tools for discovery", () => {
  const source = readFileSync(new URL("../components/Footer.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("getPublicPageUrls()"));
  assert.ok(source.includes("href={url}"));
  assert.ok(source.includes("getFaucetChainSeoEntries()"));
  assert.ok(!source.includes('href="#all-tools"'));
});

test("private inspection and test views opt out of indexing in the nearest layout", () => {
  for (const path of ["wallet/signatures/view", "7702beat/test", "skills/new"]) {
    const source = readFileSync(new URL(`../app/${path}/layout.tsx`, import.meta.url), "utf8");
    assert.match(source, /index: false/);
    assert.match(source, /follow: false/);
    assert.match(source, /canonical: null/);
  }
  const robots = readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
  assert.ok(robots.includes("https://eth.sh/sitemap.xml"));
  assert.ok(robots.includes("/api/"));
  assert.ok(robots.includes("/api/og/"));
});

test("static social images resolve to files or OG routes on ETH.sh", () => {
  for (const url of layouts()) {
    if (url.pathname.includes("[")) continue;
    const source = readFileSync(url, "utf8");
    for (const match of source.matchAll(/images: "(https:\/\/[^"\n]+)"/g)) {
      const image = new URL(match[1]);
      assert.equal(image.hostname, "eth.sh", url.pathname);
      const file = image.pathname.startsWith("/api/og/") ? `../app${image.pathname}/route.tsx` : `../public${image.pathname}`;
      assert.doesNotThrow(() => readFileSync(new URL(file, import.meta.url)), match[1]);
    }
  }
});

test("unknown routes remain a genuine not-found page with a crawlable home link", () => {
  const source = readFileSync(new URL("../app/not-found.tsx", import.meta.url), "utf8");
  assert.ok(!source.includes("router.replace"));
  assert.ok(source.includes('href={getPath("")}'));
});

test("sidebar navigation is a crawlable anchor rather than a JavaScript-only button", () => {
  const source = readFileSync(new URL("../components/Sidebar.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('as="a"'));
  assert.ok(source.includes('href={fullPath}'));
});

test("sitemap lists real public leaf pages, not parameter placeholders or redirect entrypoints", () => {
  const urls = sitemap().map(({ url }) => url);
  assert.ok(urls.includes("https://eth.sh/"));
  assert.ok(urls.includes("https://ens.eth.sh/ccip"));
  assert.ok(urls.includes("https://uniswap.eth.sh/positions"));
  assert.ok(urls.includes("https://eth.sh/robin-bridge"));
  for (const url of urls) {
    const parsed = new URL(url);
    if (parsed.hostname === "eth.sh") continue;
    const base = parsed.hostname.split(".")[0];
    const pathname = base === "faucet" && parsed.pathname !== "/" ? "/[chain]" : parsed.pathname;
    const path = `../app/${base}${pathname === "/" ? "" : pathname}/page.tsx`;
    assert.doesNotThrow(() => readFileSync(new URL(path, import.meta.url)), url);
    assert.ok(!["calldata", "converter", "ens", "foundry", "safe", "solidity", "transact", "uniswap", "wallet"].includes(base) || parsed.pathname !== "/", url);
    assert.ok(!url.includes("signatures/view") && !url.includes("/test") && !url.includes("skills/new"), url);
  }
});

test("category entrypoints issue server permanent redirects to their actual default tool", () => {
  for (const [base, tool] of Object.entries({ calldata: "decoder", converter: "eth", ens: "history", foundry: "forge-stack-tracer-ui", safe: "eip-712-hash", solidity: "compiler", transact: "send-tx", uniswap: "tick-to-price", wallet: "bridge" })) {
    const source = readFileSync(new URL(`../app/${base}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, /permanentRedirect\(/, base);
    assert.ok(!source.includes("useEffect"), base);
    assert.ok(source.includes(`getToolEntryRedirect("${base}", host)`), base);
    assert.ok(source.includes('await headers()'), base);
    assert.equal(getToolEntryRedirect(base, "eth.sh"), `https://${base}.eth.sh/${tool}`);
  }
});

test("static getMetadata layouts declare their own canonical instead of inheriting home", () => {
  for (const url of layouts()) {
    const source = readFileSync(url, "utf8");
    if (source.includes("getMetadata") && !url.pathname.includes("[")) {
      assert.match(source, /canonical:/, url.pathname);
    }
  }
});

test("metadata emits canonical, complete Open Graph identity and descriptive image", () => {
  const metadata = getMetadata({ title: "Contract | ETH.sh", description: "Interact with contracts", images: "https://eth.sh/og/index.png", canonical: "https://contract.eth.sh/" } as any);
  assert.equal(metadata.alternates?.canonical, "https://contract.eth.sh/");
  assert.equal((metadata.openGraph as any).url, "https://contract.eth.sh/");
  assert.equal((metadata.openGraph as any).siteName, "ETH.sh");
  assert.equal((metadata.openGraph as any).locale, "en_US");
  assert.equal((metadata.openGraph as any).images[0].alt, "Contract | ETH.sh");
  assert.equal((metadata.openGraph as any).images[0].width, 2144);
  assert.equal((metadata.openGraph as any).images[0].height, 1122);
});

test("contract detail back link targets the tool root on both hosts", () => {
  const page = readFileSync(new URL("../app/contract/[chainId]/[address]/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('href={getPath("contract")}'));
});

import { ToolsGridItem } from "../components/HomePage/ToolsGrid/ToolsGridItem";

test("homepage tool cards link directly to default tools instead of redirect roots", () => {
  const card = ToolsGridItem({ subdomain: "converter", info: { emoji: "", label: "Converter", description: "Unit converter" } });
  assert.equal(card.props.href, "https://converter.eth.sh/eth");
});

import { getFaucetMetadata } from "../app/faucet/metadata";

test("faucet metadata preserves descriptive structured social images", () => {
  const metadata = getFaucetMetadata("ethereum-sepolia");
  assert.equal(typeof (metadata.openGraph as any).images[0].alt, "string");
  assert.equal((metadata.openGraph as any).images[0].width, 1200);
});

test("ENS record views have their own canonical rather than the history landing page", () => {
  const source = readFileSync(new URL("../app/ens/history/[ensName]/layout.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("encodeURIComponent(ensName)"));
  assert.ok(source.includes("https://ens.eth.sh/history/"));
});

test("legacy explorer contract alias redirects at HTTP config before React streaming", () => {
  const rules = nextConfig.redirects?.() ?? [];
  for (const [host, source] of [["explorer.eth.sh", "/contract/:chainId/:address"], ["eth.sh", "/explorer/contract/:chainId/:address"]]) {
    const rule = rules.find((entry: any) => entry.source === source);
    assert.ok(rule);
    assert.equal(rule.has?.[0]?.value, host);
    assert.equal(rule.destination, "https://contract.eth.sh/:chainId/:address");
    assert.equal(rule.permanent, true);
  }
});

test("non-OG API responses are explicitly non-indexable", () => {
  const rules = nextConfig.headers?.() ?? [];
  const rule = rules.find((rule: any) => rule.source.startsWith("/api/"));
  assert.ok(rule);
  assert.ok(rule.headers.some((header: any) => header.key === "X-Robots-Tag" && header.value === "noindex, nofollow"));
});

test("orgs legacy host root redirects to the supported apex directory", () => {
  const route = nextConfig.redirects().find((route: any) => route.source === "/" && route.has?.[0]?.value === "orgs.eth.sh");
  assert.ok(route);
  assert.equal(route.destination, "https://eth.sh/orgs");
});

test("contract legacy link redirects only on the contract host", () => {
  const redirects = nextConfig.redirects();
  const alias = redirects.find((route: any) => route.source === "/contract" && route.has?.[0]?.value === "contract.eth.sh");
  assert.ok(alias, "contract host /contract alias is missing");
  assert.equal(alias.destination, "https://contract.eth.sh/");
  assert.equal(alias.permanent, true);
});

test("subdomain rewrites leave crawler endpoints and OG assets on the root app", () => {
  const route = nextConfig.rewrites().beforeFiles.find((route: any) => route.has?.[0]?.value === "contract.eth.sh");
  assert.ok(route);
  const pattern = new RegExp(`^${route.source.replace('/:path(', '(')}$`);
  for (const path of ["/og/contract.png", "/robots.txt", "/sitemap.xml", "/frame/wallet-bridge.png", "/api/og/orgs", "/_next/static/test.js"]) {
    assert.equal(pattern.test(path.slice(1)), false, path);
  }
  assert.equal(pattern.test("1/0x123"), true);
});

test("sitemap uses the orgs apex path, not an unsupported orgs host", () => {
  const urls = sitemap().map(({ url }) => url);
  assert.ok(urls.includes("https://eth.sh/orgs"));
  assert.ok(!urls.some((url) => url.startsWith("https://orgs.eth.sh")));
});
