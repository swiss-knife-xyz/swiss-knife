import {
  VERIFICATION_CHAINS,
  VerificationError,
  importBlockscoutSource,
  type ImportedSource,
  type VerificationProvider,
  type VerificationState,
  VERIFICATION_MESSAGES,
} from "./source";
import {
  importEtherscanSource,
  importSourcifySource,
  record,
} from "./normalize";
import { readJson } from "./transport";
export type ProviderKeys = Partial<Record<VerificationProvider, string>>;
export type ProviderResult = {
  state: VerificationState;
  guid?: string;
  error?: keyof typeof VERIFICATION_MESSAGES;
};
export class ProviderClient {
  constructor(
    private fetcher: typeof fetch,
    private keys: ProviderKeys,
    private signal: AbortSignal,
    private reserve?: (provider: VerificationProvider) => Promise<void>,
    private browser = false
  ) {}
  private async json(
    url: string,
    init: RequestInit = {},
    max = 4_000_000,
    missing = false
  ): Promise<any> {
    const host = new URL(url).hostname;
    const family: VerificationProvider =
      host === "api.etherscan.io"
        ? "etherscan"
        : host === "api.routescan.io"
          ? "routescan"
          : host === "sourcify.dev"
            ? "sourcify"
            : "blockscout";
    await this.reserve?.(family);
    let r: Response;
    try {
      r = await this.fetcher.call(globalThis, url, {
        ...init,
        method: init.method ?? "GET",
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        signal: this.signal,
        referrerPolicy: "no-referrer",
        headers: {
          ...(!this.browser
            ? {
                "User-Agent":
                  "ETH.sh cross-explorer verification (https://eth.sh)",
              }
            : {}),
          ...init.headers,
        },
      });
    } catch (e) {
      if (this.browser) throw new VerificationError("BROWSER_REQUEST_FAILED");
      throw e;
    }
    if (missing && r.status === 404) {
      await r.body?.cancel();
      return undefined;
    }
    if (!r.ok) {
      await r.body?.cancel();
      throw new VerificationError(
        r.status === 429
          ? "RATE_LIMITED"
          : [401, 403].includes(r.status)
            ? "PROVIDER_REJECTED"
            : "UNAVAILABLE"
      );
    }
    return readJson(r.body, max, this.signal);
  }
  private endpoint(
    provider: VerificationProvider,
    chainId: string,
    action: string
  ) {
    const chain = VERIFICATION_CHAINS[chainId];
    if (!chain?.[provider]) throw new VerificationError("UNSUPPORTED_ROUTE");
    const url = new URL(
      provider === "etherscan"
        ? "https://api.etherscan.io/v2/api"
        : provider === "blockscout"
          ? `${chain.blockscout}/api`
          : `https://api.routescan.io/v2/network/${chain.testnet ? "testnet" : "mainnet"}/evm/${chainId}/etherscan/api`
    );
    url.searchParams.set("module", "contract");
    url.searchParams.set("action", action);
    if (provider === "etherscan") url.searchParams.set("chainid", chainId);
    const key = this.keys[provider];
    if (provider === "etherscan" && !key)
      throw new VerificationError("API_KEY_REQUIRED");
    if (key && !/^[A-Za-z0-9_-]{8,128}$/.test(key))
      throw new VerificationError("NOT_CONFIGURED");
    if (key) url.searchParams.set("apikey", key);
    return url;
  }
  private checkError(raw: any) {
    const text = typeof raw?.result === "string" ? raw.result : "";
    if (/rate limit|too many requests|daily limit/i.test(text))
      throw new VerificationError("RATE_LIMITED");
    if (
      /api key|apikey|invalid key|paid plan|free api access|not supported.*chain|missing.*chainid/i.test(
        text
      )
    )
      throw new VerificationError("PROVIDER_REJECTED");
  }
  async source(
    provider: VerificationProvider,
    chainId: string,
    address: string
  ): Promise<ImportedSource> {
    if (provider === "blockscout") {
      const raw = await this.json(
        `${VERIFICATION_CHAINS[chainId].blockscout}/api/v2/smart-contracts/${address}`,
        {},
        4_000_000,
        true
      );
      return importBlockscoutSource(raw);
    }
    if (provider === "sourcify") {
      const raw = await this.json(
        `https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=compilation,sources,metadata,creationBytecode.transformationValues,runtimeBytecode.transformationValues,proxyResolution`,
        {},
        4_000_000,
        true
      );
      return importSourcifySource(raw);
    }
    const url = this.endpoint(provider, chainId, "getsourcecode");
    url.searchParams.set("address", address);
    const raw = await this.json(url.href);
    this.checkError(raw);
    return importEtherscanSource(raw);
  }
  async verified(
    provider: VerificationProvider,
    chainId: string,
    address: string
  ) {
    if (provider === "sourcify") {
      const raw = await this.json(
        `https://sourcify.dev/server/v2/contract/${chainId}/${address}`,
        {},
        16_384,
        true
      );
      if (!raw) return false;
      if (!record(raw) || !Object.hasOwn(raw, "match"))
        throw new VerificationError("UNAVAILABLE");
      return ["exact_match", "match"].includes(raw.match);
    }
    if (provider === "blockscout") {
      const raw = await this.json(
        `${VERIFICATION_CHAINS[chainId].blockscout}/api/v2/smart-contracts/${address}`,
        {},
        4_000_000,
        true
      );
      if (!raw) return false;
      if (!record(raw) || typeof raw.is_verified !== "boolean")
        throw new VerificationError("UNAVAILABLE");
      return raw.is_verified;
    }
    const url = this.endpoint(provider, chainId, "getsourcecode");
    url.searchParams.set("address", address);
    const raw = await this.json(url.href);
    this.checkError(raw);
    if (
      !record(raw) ||
      raw.status !== "1" ||
      !Array.isArray(raw.result) ||
      !record(raw.result[0]) ||
      typeof raw.result[0].SourceCode !== "string"
    )
      throw new VerificationError("UNAVAILABLE");
    return !!raw.result[0].SourceCode.trim();
  }
  async submit(
    provider: VerificationProvider,
    chainId: string,
    address: string,
    source: ImportedSource
  ): Promise<ProviderResult> {
    if (provider === "sourcify") {
      const raw = await this.json(
        `https://sourcify.dev/server/v2/verify/${chainId}/${address}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stdJsonInput: JSON.parse(source.sourceCode),
            compilerVersion: source.compilerVersion.replace(/^v/, ""),
            contractIdentifier: source.contractName,
          }),
        },
        16_384
      );
      if (
        typeof raw?.verificationId === "string" &&
        /^[a-fA-F0-9-]{36}$/.test(raw.verificationId)
      )
        return { state: "pending", guid: raw.verificationId };
      throw new VerificationError("UNAVAILABLE");
    }
    const url = this.endpoint(provider, chainId, "verifysourcecode");
    const form = new URLSearchParams({
      contractaddress: address,
      sourceCode: source.sourceCode,
      contractname: source.contractName,
      compilerversion: source.compilerVersion,
      constructorArguments: source.constructorArguments,
      codeformat: "solidity-standard-json-input",
      licenseType: source.licenseType,
    });
    const raw = await this.json(
      url.href,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      },
      16_384
    );
    this.checkError(raw);
    const result = this.parse(raw);
    if (result) return result;
    if (
      raw?.status === "1" &&
      typeof raw.result === "string" &&
      /^[A-Za-z0-9_-]{8,256}$/.test(raw.result) &&
      !Object.values(this.keys).some((k) => !!k && raw.result.includes(k))
    )
      return { state: "pending", guid: raw.result };
    throw new VerificationError("UNAVAILABLE");
  }
  async status(
    provider: VerificationProvider,
    chainId: string,
    address: string,
    guid?: string
  ): Promise<ProviderResult> {
    // A lost response can still be reconciled by checking published source.
    if (await this.verified(provider, chainId, address))
      return { state: "verified" };
    if (!guid) return { state: "unknown" };
    if (provider === "sourcify") {
      const raw = await this.json(
        `https://sourcify.dev/server/v2/verify/${guid}`,
        {},
        64_000,
        true
      );
      if (!raw) return { state: "unknown" };
      if (raw.isJobCompleted === false) return { state: "pending" };
      if (
        raw.isJobCompleted === true &&
        ["match", "exact_match"].includes(raw.contract?.match)
      )
        return { state: "verified" };
      if (raw.isJobCompleted === true && raw.error)
        return {
          state: "failed",
          error: failureReason(raw.error?.customCode ?? ""),
        };
      return { state: "unknown" };
    }
    const url = this.endpoint(provider, chainId, "checkverifystatus");
    url.searchParams.set("guid", guid);
    const raw = await this.json(url.href, {}, 16_384);
    this.checkError(raw);
    return this.parse(raw) ?? { state: "unknown" };
  }
  private parse(raw: any): ProviderResult | undefined {
    if (!record(raw) || typeof raw.result !== "string") return;
    const text = raw.result;
    if (
      /^(?:(?:Contract source code|Source code) already verified|Already Verified)$/i.test(
        text
      )
    )
      return { state: "already_verified" };
    if (
      raw.status === "1" &&
      /^(Pass - Verified|Successfully verified)$/i.test(text)
    )
      return { state: "verified" };
    if (/^(Pending in queue|In progress)$/i.test(text))
      return { state: "pending" };
    if (
      raw.status === "0" &&
      /^(Fail -|Error!|Unable to verify|Invalid constructor arguments)/i.test(
        text
      )
    )
      return { state: "failed", error: failureReason(text) };
  }
}

function failureReason(
  text: string
): keyof typeof VERIFICATION_MESSAGES | undefined {
  if (/constructor/i.test(text)) return "INVALID_CONSTRUCTOR";
  if (/compiler.*(version|support)|invalid.*compiler/i.test(text))
    return "UNSUPPORTED_COMPILER";
  if (/bytecode|no_match|does not match|mismatch/i.test(text))
    return "SOURCE_MISMATCH";
}
