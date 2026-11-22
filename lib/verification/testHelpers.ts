import { VerificationService } from "./server";
import { MemoryJobStore } from "./store";
import { importBlockscoutSource, type VerificationProvider } from "./source";
import { address, fixture } from "./fixtures";
export const key = "FAKE_SENTINEL_PRIVATE_KEY_121",
  guid = "a7lpxkm9kpcpicx7daftmjifrfhiuhf5vqqnawhkfhzfrcpnxj";
export const normalized = importBlockscoutSource(fixture);
export const etherscanFixture = {
  status: "1",
  result: [
    {
      SourceCode: JSON.stringify(JSON.parse(normalized.sourceCode)),
      CompilerVersion: normalized.compilerVersion,
      ContractName: "Example",
      ContractFileName: fixture.file_path,
      ConstructorArguments: "1234",
      LicenseType: "MIT",
    },
  ],
};
export const sourcifyFixture = {
  match: "exact_match",
  compilation: {
    language: "Solidity",
    compiler: "solc",
    compilerVersion: "0.8.24+commit.e11b9ed9",
    compilerSettings: fixture.compiler_settings,
    fullyQualifiedName: normalized.contractName,
  },
  sources: JSON.parse(normalized.sourceCode).sources,
  creationBytecode: {
    transformationValues: { constructorArguments: "0x1234" },
  },
  metadata: { sources: { [fixture.file_path]: { license: "MIT" } } },
};
export function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://explorer.eth.sh/api/verification", {
    method: "POST",
    headers: {
      origin: "https://explorer.eth.sh",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
export function harness(
  override?: (
    url: URL,
    init: RequestInit | undefined,
    family: VerificationProvider
  ) => Promise<Response | undefined>
) {
  let now = 100_000;
  const calls: {
    url: URL;
    init?: RequestInit;
    family: VerificationProvider;
  }[] = [];
  const published = new Set<VerificationProvider>();
  const submitted = new Set<VerificationProvider>();
  const store = new MemoryJobStore(() => now);
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const family: VerificationProvider =
      url.hostname === "api.etherscan.io"
        ? "etherscan"
        : url.hostname === "sourcify.dev"
          ? "sourcify"
          : url.hostname === "api.routescan.io"
            ? "routescan"
            : "blockscout";
    calls.push({ url, init, family });
    const custom = await override?.(url, init, family);
    if (custom) return custom;
    if (init?.method === "POST") {
      submitted.add(family);
      return Response.json(
        family === "sourcify"
          ? { verificationId: "550e8400-e29b-41d4-a716-446655440000" }
          : { status: "1", result: guid }
      );
    }
    if (url.searchParams.get("action") === "checkverifystatus")
      return Response.json({ status: "1", result: "Pass - Verified" });
    if (family === "sourcify" && /\/v2\/verify\//.test(url.pathname))
      return Response.json({
        isJobCompleted: true,
        contract: { match: "exact_match" },
      });
    if (family === "blockscout")
      return Response.json({ ...fixture, is_verified: published.has(family) });
    if (family === "sourcify")
      return published.has(family)
        ? Response.json(sourcifyFixture)
        : new Response(null, { status: 404 });
    return Response.json(
      published.has(family)
        ? etherscanFixture
        : { status: "1", result: [{ SourceCode: "" }] }
    );
  };
  const service = new VerificationService({
    key: () => key,
    fetch: fetcher,
    now: () => now,
    store,
  });
  const send = async (
    operation: string,
    extra: object = {},
    headers?: Record<string, string>
  ) => {
    now += 1100;
    return service.handle(
      req({ operation, chainId: "1", address, ...extra }, headers)
    );
  };
  return {
    service,
    store,
    fetcher,
    now: () => now,
    calls,
    published,
    submitted,
    send,
    tick: (ms = 6000) => {
      now += ms;
    },
  };
}
