import assert from "node:assert/strict";
import test from "node:test";
import { AxiosError } from "axios";
import { fetchContractMetadata } from "./contractMetadata";

const address = "0x2738d13E81e30bC615766A0410e7cF199FD59A83";
const abi = [
  {
    type: "function",
    name: "retrieve",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
];
const exact = {
  chainId: "11155111",
  address,
  match: "exact_match",
  runtimeMatch: "exact_match",
  creationMatch: "exact_match",
  abi,
  compilation: { name: "Storage" },
  sources: { "contracts/Storage.sol": { content: "contract Storage {}" } },
};
const missing = {
  status: "1",
  message: "OK",
  result: [
    {
      ABI: "Contract source code not verified",
      SourceCode: "",
      ContractName: "",
      Implementation: "",
    },
  ],
};

test("falls back to chain/address-scoped Sourcify v2 exact sources and ABI", async () => {
  const calls: string[] = [];
  const result = await fetchContractMetadata(
    { chainId: 11155111, address, isRoutescan: false },
    async (url) => {
      calls.push(url);
      return { data: calls.length === 1 ? missing : exact };
    }
  );
  assert.equal(result.statusCode, 200);
  assert.equal(calls.length, 2);
  const url = new URL(calls[1]);
  assert.equal(url.origin, "https://sourcify.dev");
  assert.equal(
    url.pathname.toLowerCase(),
    `/server/v2/contract/11155111/${address.toLowerCase()}`
  );
  assert.equal(url.searchParams.get("fields"), "abi,sources,compilation");
  assert.deepEqual(result.body.result[0], {
    ABI: JSON.stringify(abi),
    ContractName: "Storage",
    Implementation: "",
    SourceCode: `{${JSON.stringify({ sources: exact.sources })}}`,
  });
  assert.deepEqual(result.body.verification, {
    provider: "sourcify",
    match: "exact_match",
    chainId: 11155111,
    address: address.toLowerCase(),
  });
});

const lookup = { chainId: 11155111, address, isRoutescan: false };
const verified = {
  ABI: JSON.stringify(abi),
  SourceCode: "contract Primary {}",
  ContractName: "Primary",
  Implementation: "0x" + "1".repeat(40),
};
const httpError = (status: number) =>
  Object.assign(new AxiosError("upstream"), { response: { status } });

test("preserves Etherscan priority without querying Sourcify", async () => {
  const primary = {
    status: "1",
    message: "OK",
    result: [verified],
    extra: "preserved",
  };
  let calls = 0;
  const result = await fetchContractMetadata(lookup, async (url, options) => {
    calls++;
    assert.equal(new URL(url).hostname, "api.etherscan.io");
    assert.equal(new URL(url).searchParams.get("chainid"), "11155111");
    assert.equal(new URL(url).searchParams.get("address"), address);
    assert.equal(options.timeout, 8000);
    assert.equal(options.maxRedirects, 0);
    assert.equal(options.maxContentLength, 10485760);
    return { data: primary };
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { statusCode: 200, body: primary });
});

test("Routescan chains keep their provider and fallback order", async () => {
  const urls: string[] = [];
  const result = await fetchContractMetadata(
    { ...lookup, isRoutescan: true },
    async (url) => {
      urls.push(url);
      return { data: urls.length === 1 ? missing : exact };
    }
  );
  assert.equal(new URL(urls[0]).hostname, "api.routescan.io");
  assert.match(urls[0], /evm\/11155111\/etherscan/);
  assert.equal(result.statusCode, 200);
});

for (const [match, runtimeMatch] of [
  ["match", "match"],
  ["exact_match", "match"],
  ["match", "exact_match"],
]) {
  test(`accepts Sourcify ${match}/${runtimeMatch} after Etherscan DNS failure`, async () => {
    let calls = 0;
    const result = await fetchContractMetadata(lookup, async () => {
      if (++calls === 1) throw Object.assign(new Error("DNS failure"), { code: "ENOTFOUND" });
      return { data: { ...exact, match, runtimeMatch } };
    });
    assert.equal(result.statusCode, 200);
    assert.deepEqual(JSON.parse(result.body.result[0].ABI), abi);
    assert.equal(result.body.result[0].ContractName, "Storage");
    assert.equal(result.body.verification?.match, "match");
  });
}

for (const [label, change] of Object.entries({
  unknownMatch: { match: "unknown" },
  unknownRuntime: { runtimeMatch: "unknown" },
  nullMatch: { match: null, runtimeMatch: null },
  creationOnly: { runtimeMatch: null },
  wrongChain: { chainId: "1" },
  wrongAddress: { address: "0x" + "2".repeat(40) },
  missingIdentity: { address: undefined },
  missingAbi: { abi: undefined },
  stringAbi: { abi: "[]" },
  malformedAbi: { abi: [null] },
  unknownAbiType: { abi: [{ type: "malicious" }] },
  noSources: { sources: {} },
  remoteOnlySources: {
    sources: { "X.sol": { urls: ["https://untrusted.example/file"] } },
  },
  incompleteSources: {
    sources: { ...exact.sources, "Missing.sol": { content: null } },
  },
  missingName: { compilation: {} },
})) {
  test(`does not expose disallowed Sourcify data: ${label}`, async () => {
    let calls = 0;
    const result = await fetchContractMetadata(lookup, async () => ({
      data: ++calls === 1 ? missing : { ...exact, ...change },
    }));
    assert.equal(result.statusCode, 404);
    assert.equal(result.body.status, "0");
    assert.deepEqual(result.body.result, []);
    assert.equal(result.body.verification, undefined);
  });
}

test("not-found on both providers returns no verified metadata", async () => {
  let calls = 0;
  const result = await fetchContractMetadata(lookup, async () => {
    if (++calls === 1) return { data: missing };
    throw httpError(404);
  });
  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.body.result, []);
});

for (const status of [403, 429, 500, 503]) {
  test(`unavailable Sourcify HTTP ${status} is not reported as unverified success`, async () => {
    let calls = 0;
    const result = await fetchContractMetadata(lookup, async () => {
      if (++calls === 1) return { data: missing };
      throw httpError(status);
    });
    assert.equal(result.statusCode, 502);
    assert.deepEqual(result.body.result, []);
  });
}

test("timeout/network failure does not masquerade as not-found", async () => {
  const result = await fetchContractMetadata(lookup, async () => {
    throw new Error("timeout");
  });
  assert.equal(result.statusCode, 502);
  assert.deepEqual(result.body.result, []);
});

test("primary HTTP-200 rate limit falls through to an exact match", async () => {
  let calls = 0;
  const result = await fetchContractMetadata(lookup, async () => ({
    data:
      ++calls === 1 ? { status: "0", result: "Max rate limit reached" } : exact,
  }));
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.verification?.provider, "sourcify");
});

test("primary service outage still permits Sourcify success", async () => {
  let calls = 0;
  const result = await fetchContractMetadata(lookup, async () => {
    if (++calls === 1) throw httpError(503);
    return { data: exact };
  });
  assert.equal(result.statusCode, 200);
});

test("a usable explorer ABI survives a source fallback outage", async () => {
  let calls = 0;
  const record = { ...verified, SourceCode: "" };
  const result = await fetchContractMetadata(lookup, async () => {
    if (++calls === 1) return { data: { status: "1", result: [record] } };
    throw httpError(503);
  });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.result, [record]);
});

test("source fallback preserves verified explorer implementation pointer", async () => {
  let calls = 0;
  const result = await fetchContractMetadata(lookup, async () => ({
    data:
      ++calls === 1
        ? { status: "1", result: [{ ...verified, SourceCode: "" }] }
        : exact,
  }));
  assert.equal(result.body.result[0].Implementation, verified.Implementation);
});

test("same address on different chains never reuses Sourcify metadata", async () => {
  const urls: string[] = [];
  const get = async (url: string) => {
    urls.push(url);
    return { data: url.includes("sourcify.dev") ? exact : missing };
  };
  assert.equal((await fetchContractMetadata(lookup, get)).statusCode, 200);
  assert.equal(
    (await fetchContractMetadata({ ...lookup, chainId: 1 }, get)).statusCode,
    404
  );
  assert.equal(urls.length, 4);
  assert.match(urls[3], /contract\/1\//);
});
