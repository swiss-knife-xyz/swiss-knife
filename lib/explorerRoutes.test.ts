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
import { metadata as rootMetadata } from "../app/explorer/layout";
import { metadata as directoryMetadata } from "../app/explorers/layout";
import { generateMetadata as contractMetadata } from "../app/explorer/[chainId]/[address]/layout";
const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

test("contract and directory navigation use separate canonical destinations without duplicate entries", () => {
  assert.equal(getPath("explorer"), "https://explorer.eth.sh/");
  assert.equal(getPath("explorers"), "https://eth.sh/explorers/");
  assert.equal(getCanonicalUrl("/explorer"), "https://explorer.eth.sh/");
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
    createContractCallLink(getPath("explorer"), 8453, address, review)
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
    assert.equal(getPath("explorer"), "/explorer/");
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
