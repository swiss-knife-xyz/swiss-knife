import assert from "node:assert/strict";
import { test } from "node:test";
import { getPath } from "../utils";
import {
  createContractCallLink,
  parseContractCallFragment,
} from "./contractCall";
import { getCanonicalUrl, getPublicPageUrls } from "./seo";
import { getSitemapUrls, getRobotsText } from "./crawlerDiscovery";
import { GET as sitemap } from "../app/sitemap.xml/route";
import { GET as robots } from "../app/robots.txt/route";
import { metadata as rootMetadata } from "../app/contract/layout";
import { metadata as directoryMetadata } from "../app/explorers/layout";
import { generateMetadata as contractMetadata } from "../app/contract/[chainId]/[address]/layout";
import LegacyExplorer from "../app/explorer/[[...path]]/page";
import ContractAlias from "../app/explorers/contract/[chainId]/[address]/page";
import nextConfig from "../next.config.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  getPathMatch,
} = require("next/dist/shared/lib/router/utils/path-match");
const {
  matchHas,
  prepareDestination,
} = require("next/dist/shared/lib/router/utils/prepare-destination");
const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

test("contract and directory navigation use separate canonical destinations without duplicate entries", () => {
  assert.equal(getPath("contract"), "https://explorer.eth.sh/");
  assert.equal(getPath("explorers"), "https://eth.sh/explorers/");
  assert.equal(getCanonicalUrl("/contract"), "https://explorer.eth.sh/");
  assert.equal(getCanonicalUrl("/explorers"), "https://eth.sh/explorers");
  const urls = getPublicPageUrls();
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(
    !urls.some(
      (x) => x.includes("contract.eth.sh") || x.includes("explorers.eth.sh")
    )
  );
});

test("shared call URLs use prefix-free explorer bookmarks and retain exact review state", () => {
  const review = {
    data: "0x12345678",
    value: "9007199254740993",
    abiMode: "implementation" as const,
    signature: "run()",
  };
  const url = new URL(
    createContractCallLink(getPath("contract"), 8453, address, review)
  );
  assert.equal(
    url.origin + url.pathname,
    `https://explorer.eth.sh/8453/${address}`
  );
  assert.equal(url.search, "");
  assert.deepEqual(parseContractCallFragment(url.hash), review);
});

test("local preview navigation retains both tools on its current origin", () => {
  const previous = process.env.NEXT_PUBLIC_DEVELOPMENT;
  process.env.NEXT_PUBLIC_DEVELOPMENT = "true";
  try {
    assert.equal(getPath("contract"), "/contract/");
    assert.equal(getPath("explorers"), "/explorers/");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_DEVELOPMENT;
    else process.env.NEXT_PUBLIC_DEVELOPMENT = previous;
  }
});

test("landing metadata separates contract and directory social identity; user records opt out", async () => {
  assert.equal(rootMetadata.alternates?.canonical, "https://explorer.eth.sh/");
  assert.equal(rootMetadata.openGraph?.url, "https://explorer.eth.sh/");
  assert.equal(
    directoryMetadata.alternates?.canonical,
    "https://eth.sh/explorers"
  );
  assert.equal(directoryMetadata.openGraph?.url, "https://eth.sh/explorers");
  assert.ok(
    JSON.stringify(directoryMetadata.openGraph).includes("/api/og/explorers")
  );
  assert.ok(
    JSON.stringify(directoryMetadata.twitter).includes("/api/og/explorers")
  );
  const metadata = await contractMetadata({
    params: Promise.resolve({ chainId: "8453", address }),
  });
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.equal(
    metadata.alternates?.canonical,
    `https://explorer.eth.sh/8453/${address}`
  );
});

test("crawler responses use exact Host only, no forwarded host or user query; do not cache", async () => {
  for (const host of [
    "eth.sh",
    "explorer.eth.sh",
    "faucet.eth.sh",
    "solidity.eth.sh",
    "contract.eth.sh",
    "docs.eth.sh",
    "orgs.eth.sh",
    "localhost:3289",
    "explorerXethXsh",
    "explorer.eth.sh.attacker.example",
  ]) {
    const req = new Request(
      "https://evil.example/sitemap.xml?address=private&host=eth.sh",
      { headers: { host, "x-forwarded-host": "eth.sh" } }
    );
    const response = sitemap(req);
    const urls = getSitemapUrls(host);
    assert.equal(response.status, urls.length ? 200 : 404, host);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const xml = await response.text();
    assert.deepEqual(
      [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => x[1]),
      urls
    );
    assert.ok(!xml.includes("private"));
    const text = getRobotsText(host);
    const r = robots(req);
    assert.equal(await r.text(), text);
    assert.equal(r.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(
      [...text.matchAll(/^Sitemap: (.*)$/gm)].map((x) => x[1]),
      urls.length ? [`https://${host}/sitemap.xml`] : []
    );
  }
});

function redirectFor(url: string): string | null {
  const u = new URL(url);
  const query = Object.fromEntries(u.searchParams);
  for (const route of nextConfig.redirects()) {
    const params = getPathMatch(route.source)(u.pathname);
    const has = matchHas(
      { headers: { host: u.hostname }, cookies: {} },
      query,
      route.has ?? []
    );
    if (params && has) {
      const result = prepareDestination({
        destination: route.destination,
        params: { ...params, ...has },
        query,
        appendParamsToQuery: true,
      });
      const destination = result.parsedDestination;
      const target = new URL(
        destination.pathname,
        `${destination.protocol}//${destination.hostname}`
      );
      for (const [key, value] of Object.entries(destination.query)) {
        for (const item of Array.isArray(value)
          ? value
          : value === undefined
            ? []
            : [value])
          target.searchParams.append(key, String(item));
      }
      return target.href;
    }
  }
  return null;
}

test("current and cached legacy permanent hops terminate without revisiting an exact URL", () => {
  const paths = [
    `https://explorer.eth.sh/contract/1/${address}`,
    `https://contract.eth.sh/1/${address}`,
    `https://contract.eth.sh/contract/8453/${address}`,
    `https://eth.sh/explorer/contract/1/${address}`,
    `https://explorer.eth.sh/address/${address}?forContracts=true`,
    `https://explorer.eth.sh/address/${address}/contract?chainId=8453`,
    "https://contract.eth.sh/contract",
  ];
  for (const initial of paths) {
    const visited = new Set<string>();
    let url = initial;
    for (let i = 0; i < 6; i++) {
      assert.ok(!visited.has(url), `redirect loop: ${initial} → ${url}`);
      visited.add(url);
      const next = redirectFor(url);
      if (!next) break;
      url = next;
    }
    assert.equal(redirectFor(url), null, initial);
    assert.ok(
      url.startsWith("https://explorer.eth.sh/") ||
        url.startsWith("https://eth.sh/explorers/")
    );
  }
  // Simulate historical cached 308s before applying today's server mapping.
  for (const cached of [
    `https://contract.eth.sh/1/${address}`,
    "https://contract.eth.sh/",
  ]) {
    const final = redirectFor(cached)!;
    assert.ok(final.startsWith("https://explorer.eth.sh/"));
    assert.equal(redirectFor(final), null);
  }
});

test("local directory and contract aliases preserve repeated/encoded query parameters", async () => {
  await assert.rejects(
    LegacyExplorer({
      params: Promise.resolve({ path: ["address", address] }),
      searchParams: Promise.resolve({
        forContracts: "true",
        tag: ["one", "a b"],
      }),
    }),
    (e: any) => {
      assert.ok(
        e.digest.includes(
          `/explorers/address/${address}?forContracts=true&tag=one&tag=a+b`
        )
      );
      return true;
    }
  );
  await assert.rejects(
    ContractAlias({
      params: Promise.resolve({ chainId: "8453", address }),
      searchParams: Promise.resolve({ data: "0x1234", abi: "implementation" }),
    }),
    (e: any) => {
      assert.ok(
        e.digest.includes(
          `https://explorer.eth.sh/8453/${address}?data=0x1234&abi=implementation`
        )
      );
      return true;
    }
  );
});
