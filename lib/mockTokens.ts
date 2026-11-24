import {
  encodeDeployData,
  getAddress,
  isAddress,
  parseUnits,
  type Abi,
  type Address,
  type Hex,
  type Chain,
} from "viem";
import { chainIdToChain, getRuntimeCustomChain } from "../data/common";
import { MOCK_ARTIFACTS } from "./mockTokens.generated";

type DeploymentChain = Chain;
export function getMockChains(): DeploymentChain[] {
  return Object.values(chainIdToChain).filter(chain =>
    chain.rpcUrls.default.http.length && (chain.blockExplorers?.default.url || getRuntimeCustomChain(chain.id))
  );
}
export const MOCK_CHAINS = getMockChains();
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
  const chain = getMockChains().find((c) => String(c.id) === draft.chainId);
  if (!chain) throw new Error("Choose a supported network explicitly.");
  if (!["ERC20", "ERC721", "ERC1155"].includes(draft.standard))
    throw new Error("Choose an ERC20, ERC721 or ERC1155 mock.");
  const standard = draft.standard as MockStandard;
  const label = draft.name.trim();
  const ticker = draft.symbol.trim();
  if (!/^[\x20-\x7e]{1,64}$/.test(label))
    throw new Error("Name must be 1–64 printable ASCII characters.");
  if (!/^[A-Za-z0-9_]{1,16}$/.test(ticker))
    throw new Error("Symbol must be 1–16 letters, digits or underscores.");
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
    args = [label, ticker, draft.uri];
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
    name: label,
    symbol: ticker,
    data,
    value: 0n,
    args,
    artifact,
  };
}
export type MockDeployment = ReturnType<typeof buildMockDeployment>;
export type MockSendClient = {
  getChainId(): Promise<number>;
  getAddresses(): Promise<readonly Address[]>;
  sendTransaction(request: {
    chain: MockDeployment["chain"];
    account: Address;
    data: Hex;
    value: bigint;
  }): Promise<Hex>;
};
export async function sendMockDeployment(
  deployment: MockDeployment,
  account: Address,
  client: MockSendClient
): Promise<Hex> {
  const liveChainId = await client.getChainId();
  const [liveAccount] = await client.getAddresses();
  if (
    !liveAccount ||
    getAddress(liveAccount) !== getAddress(account) ||
    liveChainId !== deployment.chain.id
  )
    throw new Error(
      "Wallet account or network changed. Try again on the selected network."
    );
  return client.sendTransaction({
    chain: deployment.chain,
    account,
    data: deployment.data,
    value: 0n,
  });
}
