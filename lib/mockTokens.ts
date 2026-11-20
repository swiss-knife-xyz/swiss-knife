import {
  encodeDeployData,
  getAddress,
  isAddress,
  parseUnits,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  arbitrum,
  arbitrumSepolia,
  optimism,
  polygon,
} from "viem/chains";
import { MOCK_ARTIFACTS } from "./mockTokens.generated";

// No selected-chain default: the user must deliberately choose a labeled network.
export const MOCK_CHAINS = [
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
] as const;
export type MockStandard = keyof typeof MOCK_ARTIFACTS;
export type MockDraft = {
  standard: string;
  chainId: string;
  name: string;
  symbol: string;
  initialSupply: string;
  recipient: string;
  uri: string;
};
export function buildMockDeployment(draft: MockDraft) {
  const chain = MOCK_CHAINS.find((c) => String(c.id) === draft.chainId);
  if (!chain) throw new Error("Choose a supported network explicitly.");
  if (!["ERC20", "ERC721", "ERC1155"].includes(draft.standard))
    throw new Error("Choose an ERC20, ERC721 or ERC1155 mock.");
  const standard = draft.standard as MockStandard;
  const label = draft.name.trim();
  const ticker = draft.symbol.trim();
  if (standard !== "ERC1155") {
    if (!/^[\x20-\x7e]{1,64}$/.test(label))
      throw new Error("Name must be 1–64 printable ASCII characters.");
    if (!/^[A-Za-z0-9_]{1,16}$/.test(ticker))
      throw new Error("Symbol must be 1–16 letters, digits or underscores.");
  }
  let args: readonly unknown[];
  if (standard === "ERC20") {
    if (
      !isAddress(draft.recipient, { strict: true }) ||
      /^0x0{40}$/i.test(draft.recipient)
    )
      throw new Error(
        "Initial recipient must be a nonzero checksummed address (or all lowercase)."
      );
    if (
      !/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(draft.initialSupply) ||
      draft.initialSupply.length > 100
    )
      throw new Error(
        "Initial supply must be a nonnegative decimal with at most 18 fractional digits."
      );
    const supply = parseUnits(draft.initialSupply, 18);
    if (supply >= 2n ** 256n)
      throw new Error("Initial supply exceeds uint256.");
    args = [label, ticker, getAddress(draft.recipient), supply];
  } else {
    if (
      draft.uri.length > 512 ||
      /[\x00-\x20\x7f]/.test(draft.uri) ||
      (draft.uri !== "" && !/^(https:\/\/|ipfs:\/\/|ar:\/\/).+/.test(draft.uri))
    )
      throw new Error(
        "Metadata URI must be empty or an HTTPS, ipfs:// or ar:// URI without whitespace (max 512 characters)."
      );
    args = standard === "ERC721" ? [label, ticker, draft.uri] : [draft.uri];
  }
  const artifact = MOCK_ARTIFACTS[standard];
  const data = encodeDeployData({
    abi: artifact.abi as Abi,
    bytecode: artifact.bytecode,
    args,
  });
  return {
    chain,
    standard,
    name: standard === "ERC1155" ? "MOCK ERC1155" : `MOCK ${label}`,
    symbol: standard === "ERC1155" ? "MOCK_1155" : `MOCK_${ticker}`,
    data,
    value: 0n,
    args,
    artifact,
  };
}
export type MockDeployment = ReturnType<typeof buildMockDeployment>;
export type MockEstimate = {
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  balance: bigint;
  l1Fee?: bigint;
  createdAt: number;
};
export type MockEstimateClient = {
  getChainId(): Promise<number>;
  estimateGas(request: {
    account: Address;
    data: Hex;
    value: bigint;
  }): Promise<bigint>;
  estimateFeesPerGas(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }>;
  getBalance(request: { address: Address }): Promise<bigint>;
};
export async function estimateMockDeployment(
  deployment: MockDeployment,
  account: Address,
  client: MockEstimateClient
): Promise<MockEstimate> {
  if ((await client.getChainId()) !== deployment.chain.id)
    throw new Error("RPC network does not match the selected network.");
  const gas = await client.estimateGas({
    account,
    data: deployment.data,
    value: 0n,
  });
  const fees = await client.estimateFeesPerGas();
  const balance = await client.getBalance({ address: account });
  if (
    gas <= 0n ||
    fees.maxFeePerGas <= 0n ||
    fees.maxPriorityFeePerGas < 0n ||
    fees.maxPriorityFeePerGas > fees.maxFeePerGas
  )
    throw new Error("RPC returned an invalid gas estimate.");
  return {
    gas: (gas * 120n + 99n) / 100n,
    ...fees,
    balance,
    createdAt: Date.now(),
  };
}
export function maximumCost(estimate: MockEstimate) {
  return estimate.gas * estimate.maxFeePerGas + (estimate.l1Fee ?? 0n);
}
export type MockSendClient = {
  getChainId(): Promise<number>;
  getAddresses(): Promise<readonly Address[]>;
  sendTransaction(request: {
    chain: MockDeployment["chain"];
    account: Address;
    data: Hex;
    value: bigint;
    gas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }): Promise<Hex>;
};
export async function sendReviewedMock(
  deployment: MockDeployment,
  estimate: MockEstimate,
  account: Address,
  client: MockSendClient
): Promise<Hex> {
  const liveChainId = await client.getChainId();
  const [liveAccount] = await client.getAddresses();
  // The component consumes the explicitly consented review before calling this.
  // Re-check provider identity after awaiting the wallet, never auto-switch.
  assertReviewReady(
    deployment,
    estimate,
    account,
    liveAccount,
    liveChainId,
    true,
    true
  );
  return client.sendTransaction({
    chain: deployment.chain,
    account,
    data: deployment.data,
    value: 0n,
    gas: estimate.gas,
    maxFeePerGas: estimate.maxFeePerGas,
    maxPriorityFeePerGas: estimate.maxPriorityFeePerGas,
  });
}
export function assertReviewReady(
  deployment: MockDeployment,
  estimate: MockEstimate,
  reviewedAccount: Address,
  account: Address | undefined,
  chainId: number | undefined,
  consent: boolean,
  mainnetConsent: boolean,
  now = Date.now()
) {
  if (
    !account ||
    getAddress(account) !== getAddress(reviewedAccount) ||
    chainId !== deployment.chain.id
  )
    throw new Error(
      "Wallet account or network changed. Review again on the selected network."
    );
  if (!consent || (!deployment.chain.testnet && !mainnetConsent))
    throw new Error(
      "Confirm the public mock deployment and real mainnet gas cost."
    );
  if (now < estimate.createdAt || now - estimate.createdAt > 60_000)
    throw new Error("Gas review expired. Review again for a fresh estimate.");
  if (maximumCost(estimate) > estimate.balance)
    throw new Error(
      "Insufficient native balance for the reviewed maximum execution cost."
    );
}
