import assert from "node:assert/strict";
import { test } from "node:test";
import { getAddress, isAddress } from "viem";
import {
  contractSources,
  getKnownContract,
  getKnownContractUrl,
  knownContracts,
} from "../data/contracts";
import { chainIdToChain } from "../data/networks";
import { getKnownContractSeo } from "./contractSeo";
import { getSitemapUrls } from "./crawlerDiscovery";
import { generateMetadata } from "../app/explorer/[chainId]/[address]/layout";

test("curated deployments have unique chain/address identities and traceable sources", () => {
  const keys = new Set<string>();
  for (const entry of knownContracts) {
    const key = `${entry.chainId}:${entry.address.toLowerCase()}`;
    assert.ok(!keys.has(key), `Duplicate deployment: ${key}`);
    keys.add(key);
    assert.ok(isAddress(entry.address, { strict: true }), entry.label);
    assert.equal(entry.address, getAddress(entry.address), entry.label);
    assert.notEqual(BigInt(entry.address), 0n);
    assert.ok(chainIdToChain[entry.chainId], entry.label);
    assert.ok(!chainIdToChain[entry.chainId].testnet, entry.label);
    for (const field of [
      entry.protocol,
      entry.label,
      entry.description,
      entry.kind,
    ]) {
      assert.ok(field.trim(), key);
    }
    const source = contractSources[entry.source];
    assert.ok(source, `Missing source for ${entry.label}`);
    assert.equal(new URL(source.url).protocol, "https:");
    assert.match(source.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
  for (const key of Object.keys(contractSources)) {
    assert.ok(
      knownContracts.some((entry) => entry.source === key),
      key
    );
  }
});

test("requested Aave and Uniswap generations have separately identified deployments", () => {
  for (const protocol of ["Aave", "Uniswap"]) {
    for (const version of ["v2", "v3", "v4"]) {
      assert.ok(
        knownContracts.some(
          (entry) =>
            entry.protocol === protocol &&
            entry.version === version &&
            entry.chainId === 1
        ),
        `${protocol} ${version}`
      );
    }
  }
});

test("lookup is case-insensitive and never matches a deployment on a different chain", () => {
  const address = "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2";
  assert.equal(getKnownContract(1, address)?.label, "Aave V3 Pool");
  assert.equal(getKnownContract(8453, address), undefined);
  assert.equal(getKnownContract(1, "not-an-address"), undefined);
  assert.equal(getKnownContractSeo("1junk", address), undefined);
  assert.equal(getKnownContractSeo("01", address), undefined);
});

test("curated metadata names the deployment and canonicalizes address casing", async () => {
  const address = "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2";
  const metadata = await generateMetadata({
    params: Promise.resolve({ chainId: "1", address }),
  });
  assert.equal(metadata.title, "Aave V3 Pool on Ethereum | ETH.sh");
  assert.match(metadata.description!, /Supply, borrow, repay/);
  assert.equal(
    metadata.alternates?.canonical,
    "https://explorer.eth.sh/1/0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
  );
  assert.equal(metadata.robots, "index, follow");
});

test("unlisted contract pages retain indexable fallback metadata", async () => {
  const address = `0x${"1".repeat(40)}`;
  const metadata = await generateMetadata({
    params: Promise.resolve({ chainId: "1", address }),
  });
  assert.equal(metadata.title, `Contract ${address} | ETH.sh`);
  assert.equal(metadata.robots, "index, follow");
});

test("every curated URL is discoverable only in the explorer host sitemap", () => {
  const urls = getSitemapUrls("explorer.eth.sh");
  assert.equal(urls.length, new Set(urls).size);
  for (const entry of knownContracts) {
    const url = getKnownContractUrl(entry);
    assert.ok(urls.includes(url), entry.label);
    assert.ok(!getSitemapUrls("eth.sh").includes(url), entry.label);
  }
});
