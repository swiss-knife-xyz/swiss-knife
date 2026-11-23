/**
 * Built-in (client-side) ERC-7730 descriptors.
 *
 * The remote registry at walletchan.eth.sh/api/clearsigning/descriptor is keyed
 * by (chainId, contract address, selector/EIP-712 type) — fine for per-app
 * contracts (Permit2, Uniswap router, etc.), but useless for "every ERC-20
 * ever deployed".
 * Rather than seeding the registry with thousands of duplicate entries we
 * synthesize generic descriptors here on demand. We also keep address-bound
 * local descriptors for contracts WalletChan knows how to render without a
 * remote registry round-trip (GNS, Multicall3, etc.).
 *
 * Returns null when the calldata isn't recognized. The remote descriptor always
 * wins — built-ins are a fallback for unknown contracts that happen to expose a
 * standard function, plus known contracts whose descriptor ships with the
 * extension.
 */

import type { Erc7730Descriptor } from "./types";

const GNS_NAME_NFT_ADDRESS = "0x9d51d507bc7264d4fe8ad1cf7fe191933a0a81d6";
const GNS_SUBDOMAIN_REGISTRAR_ADDRESS =
  "0xc1d5245bfd98ddb7e73b33209b346b4fc0e03f3c";
const GNS_HUMAN_REGISTRARS_BY_CHAIN: Record<number, string> = {
  1: "0xa4283d56f523d05bbd46e483f7861d6d10cb330a",
  11155111: "0xaa6c81c54eca32e1949b9ff80eac21d03261e870",
};
const MULTICALL3_ADDRESS = "0xca11bde05977b3631167028862be2a173976ca11";

const GNS_CHAIN_IDS = new Set([1, 11155111]);
const MULTICALL3_CHAIN_IDS = new Set([1, 11155111, 8453, 137, 130, 4326]);

/**
 * Selector-only generic descriptors. These may match any target contract, so
 * keep this list limited to standards where selector-only matching is useful.
 */
const GENERIC_BUILTIN_SELECTORS = new Set<string>([
  "0xa9059cbb", // transfer(address,uint256)
  "0x095ea7b3", // approve(address,uint256)
  "0x8d80ff0a", // multiSend(bytes) — Safe MultiSend / MultiSendCallOnly
]);

export const MULTISEND_SELECTOR = "0x8d80ff0a";
export const MULTISEND_FORMAT_KEY = "multiSend(bytes transactions)";
export const MULTICALL3_AGGREGATE3_VALUE_FORMAT_KEY =
  "aggregate3Value((address target,bool allowFailure,uint256 value,bytes callData)[] calls)";

export function isBuiltinCalldataSelector(
  calldata: string | undefined | null
): boolean {
  if (!calldata || !calldata.startsWith("0x") || calldata.length < 10)
    return false;
  return GENERIC_BUILTIN_SELECTORS.has(calldata.slice(0, 10).toLowerCase());
}

export function isGenericBuiltinCalldataCall(
  chainId: number,
  contractAddress: string | undefined | null,
  calldata: string | undefined | null
): boolean {
  if (!calldata || !calldata.startsWith("0x") || calldata.length < 10)
    return false;
  if (
    contractAddress &&
    getAddressBoundCalldataDescriptor(chainId, contractAddress, calldata)
  ) {
    return false;
  }
  return isBuiltinCalldataSelector(calldata);
}

export function getBuiltinCalldataDescriptor(
  chainId: number,
  contractAddress: string,
  calldata: string
): Erc7730Descriptor | null {
  if (!calldata || !calldata.startsWith("0x") || calldata.length < 10)
    return null;
  if (!chainId || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) return null;

  const addressBound = getAddressBoundCalldataDescriptor(
    chainId,
    contractAddress,
    calldata
  );
  if (addressBound) return addressBound;

  const selector = calldata.slice(0, 10).toLowerCase();
  switch (selector) {
    case "0xa9059cbb":
      return erc20TransferDescriptor(chainId, contractAddress);
    case "0x095ea7b3":
      return erc20ApproveDescriptor(chainId, contractAddress);
    case MULTISEND_SELECTOR:
      return multiSendDescriptor(chainId, contractAddress);
    default:
      return null;
  }
}

export function getAddressBoundCalldataDescriptor(
  chainId: number,
  contractAddress: string,
  calldata: string
): Erc7730Descriptor | null {
  if (!calldata || !calldata.startsWith("0x") || calldata.length < 10)
    return null;
  if (!chainId || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) return null;

  const address = contractAddress.toLowerCase();
  const selector = calldata.slice(0, 10).toLowerCase();

  if (address === GNS_NAME_NFT_ADDRESS && GNS_CHAIN_IDS.has(chainId)) {
    return gnsNameNftDescriptor(chainId);
  }
  if (
    address === GNS_SUBDOMAIN_REGISTRAR_ADDRESS &&
    GNS_CHAIN_IDS.has(chainId)
  ) {
    return gnsSubdomainRegistrarDescriptor(chainId);
  }
  if (GNS_HUMAN_REGISTRARS_BY_CHAIN[chainId] === address) {
    return gnsHumanRegistrarDescriptor(chainId, address);
  }
  if (
    address === MULTICALL3_ADDRESS &&
    MULTICALL3_CHAIN_IDS.has(chainId) &&
    selector === "0x174dea71"
  ) {
    return multicall3Descriptor(chainId);
  }

  return null;
}

/**
 * Shared boilerplate — every built-in ERC-20 descriptor targets the same
 * (chainId, contractAddress) deployment and is labelled "via ERC-20" via
 * the owner metadata. The amount field hardcodes the call target as its
 * token address (the token IS the contract being called), so TokenAmount
 * formatters can resolve symbol/decimals/logo/price exactly the way they
 * do for app-specific descriptors.
 */
function erc20DescriptorBase(chainId: number, contractAddress: string) {
  return {
    context: {
      contract: {
        deployments: [{ chainId, address: contractAddress.toLowerCase() }],
      },
    },
    metadata: { owner: "ERC-20" as const },
  };
}

/** `transfer(address to, uint256 amount)` — ERC-20 send. */
function erc20TransferDescriptor(
  chainId: number,
  contractAddress: string
): Erc7730Descriptor {
  return {
    ...erc20DescriptorBase(chainId, contractAddress),
    display: {
      formats: {
        "transfer(address to,uint256 amount)": {
          intent: "Send tokens",
          fields: [
            {
              path: "#.amount",
              label: "Amount",
              format: "tokenAmount",
              params: { tokenAddress: contractAddress.toLowerCase() },
            },
            { path: "#.to", label: "Recipient", format: "addressName" },
          ],
        },
      },
    },
  };
}

/**
 * `multiSend(bytes transactions)` — Safe `MultiSend` / `MultiSendCallOnly`.
 *
 * The `transactions` param is a packed concatenation of `(op:1, to:20,
 * value:32, dataLen:32, data:dataLen)` tuples — NOT standard ABI. The
 * matching custom decoder in `decodeForDescriptor.ts` unpacks the bytes
 * into a normalized `transactions: [{operation, to, value, data}, …]`
 * array, which this descriptor's `transactions.[].data` calldata field
 * then feeds to the recursive nested-calldata pipeline. Result: each
 * inner call lights up as its own clear-signed card (or falls through to
 * the InlineCalldataRow when its target has no descriptor).
 *
 * Built-in (not registry-keyed) because every Safe deploys a unique
 * `MultiSendCallOnly` instance and the format is identical across them.
 */
function multiSendDescriptor(
  chainId: number,
  contractAddress: string
): Erc7730Descriptor {
  return {
    context: {
      contract: {
        deployments: [{ chainId, address: contractAddress.toLowerCase() }],
      },
    },
    metadata: { owner: "Safe MultiSend" },
    display: {
      formats: {
        [MULTISEND_FORMAT_KEY]: {
          intent: "Batched calls",
          fields: [
            {
              path: "transactions.[].data",
              label: "Call",
              format: "calldata",
              params: {
                calleePath: "transactions.[].to",
                amountPath: "transactions.[].value",
              },
            },
          ],
        },
      },
    },
  };
}

/** `approve(address spender, uint256 amount)` — ERC-20 allowance grant. */
function erc20ApproveDescriptor(
  chainId: number,
  contractAddress: string
): Erc7730Descriptor {
  return {
    ...erc20DescriptorBase(chainId, contractAddress),
    display: {
      formats: {
        "approve(address spender,uint256 amount)": {
          intent: "Approve token",
          fields: [
            {
              path: "#.amount",
              label: "Amount",
              format: "tokenAmount",
              params: { tokenAddress: contractAddress.toLowerCase() },
            },
            { path: "#.spender", label: "Spender", format: "addressName" },
          ],
        },
      },
    },
  };
}

function gnsBaseDescriptor(
  chainId: number,
  contractAddress: string,
  contractName: string
) {
  return {
    context: {
      contract: {
        deployments: [{ chainId, address: contractAddress }],
      },
    },
    metadata: { owner: "Gwei Names", contractName },
  };
}

function gnsNameNftDescriptor(chainId: number): Erc7730Descriptor {
  return {
    ...gnsBaseDescriptor(chainId, GNS_NAME_NFT_ADDRESS, "GNS NameNFT"),
    display: {
      formats: {
        "commit(bytes32 commitment)": {
          intent: "Commit .gwei registration",
          fields: [{ path: "#.commitment", label: "Commitment" }],
        },
        "reveal(string label,bytes32 secret)": {
          intent: "Register .gwei name",
          fields: [
            { path: "#.label", label: "Name" },
            { path: "@.value", label: "Payment", format: "amount" },
          ],
        },
        "renew(uint256 tokenId)": {
          intent: "Renew .gwei name",
          fields: [
            { path: "#.tokenId", label: "Name", format: "gweiName" },
            { path: "@.value", label: "Payment", format: "amount" },
          ],
        },
        "setPrimaryName(uint256 tokenId)": {
          intent: "Set primary .gwei name",
          fields: [{ path: "#.tokenId", label: "Name", format: "gweiName" }],
        },
        "setAddr(uint256 tokenId,address addr)": {
          intent: "Set .gwei address",
          fields: [
            { path: "#.tokenId", label: "Name", format: "gweiName" },
            { path: "#.addr", label: "Address", format: "addressName" },
          ],
        },
        "setText(uint256 tokenId,string key,string value)": {
          intent: "Set .gwei text record",
          fields: [
            { path: "#.tokenId", label: "Name", format: "gweiName" },
            { path: "#.key", label: "Key" },
            { path: "#.value", label: "Value" },
          ],
        },
        "setContenthash(uint256 tokenId,bytes hash)": {
          intent: "Set .gwei website",
          fields: [
            { path: "#.tokenId", label: "Name", format: "gweiName" },
            { path: "#.hash", label: "Website", format: "contentHash" },
          ],
        },
        "setAddrForCoin(uint256 tokenId,uint256 coinType,bytes addr)": {
          intent: "Set .gwei coin address",
          fields: [
            { path: "#.tokenId", label: "Name", format: "gweiName" },
            { path: "#.coinType", label: "Coin type" },
            {
              path: "#.addr",
              label: "Address",
              format: "interoperableAddressName",
            },
          ],
        },
        "registerSubdomain(string label,uint256 parentId)": {
          intent: "Create .gwei subdomain",
          fields: [
            { path: "#.label", label: "Label" },
            { path: "#.parentId", label: "Parent", format: "gweiName" },
          ],
        },
        "registerSubdomainFor(string label,uint256 parentId,address to)": {
          intent: "Create .gwei subdomain",
          fields: [
            { path: "#.label", label: "Label" },
            { path: "#.parentId", label: "Parent", format: "gweiName" },
            { path: "#.to", label: "Recipient", format: "addressName" },
          ],
        },
        "transferFrom(address from,address to,uint256 tokenId)": {
          intent: "Transfer .gwei name",
          fields: [
            { path: "#.from", label: "From", format: "addressName" },
            { path: "#.to", label: "Recipient", format: "addressName" },
            { path: "#.tokenId", label: "Name", format: "gweiName" },
          ],
        },
        "safeTransferFrom(address from,address to,uint256 tokenId)": {
          intent: "Transfer .gwei name",
          fields: [
            { path: "#.from", label: "From", format: "addressName" },
            { path: "#.to", label: "Recipient", format: "addressName" },
            { path: "#.tokenId", label: "Name", format: "gweiName" },
          ],
        },
        "safeTransferFrom(address from,address to,uint256 tokenId,bytes data)":
          {
            intent: "Transfer .gwei name",
            fields: [
              { path: "#.from", label: "From", format: "addressName" },
              { path: "#.to", label: "Recipient", format: "addressName" },
              { path: "#.tokenId", label: "Name", format: "gweiName" },
            ],
          },
        "approve(address to,uint256 tokenId)": {
          intent: "Approve .gwei name",
          fields: [
            { path: "#.to", label: "Approved address", format: "addressName" },
            { path: "#.tokenId", label: "Name", format: "gweiName" },
          ],
        },
        "setApprovalForAll(address operator,bool approved)": {
          intent: "Update .gwei operator",
          fields: [
            { path: "#.operator", label: "Operator", format: "addressName" },
            { path: "#.approved", label: "Approved" },
          ],
        },
      },
    },
  };
}

function gnsSubdomainRegistrarDescriptor(chainId: number): Erc7730Descriptor {
  return {
    ...gnsBaseDescriptor(
      chainId,
      GNS_SUBDOMAIN_REGISTRAR_ADDRESS,
      "GNS SubdomainRegistrar"
    ),
    display: {
      formats: {
        "register(uint256 parentId,string label)": {
          intent: "Claim .gwei subdomain",
          fields: [
            { path: "#.label", label: "Label" },
            { path: "#.parentId", label: "Parent", format: "gweiName" },
            { path: "@.value", label: "Payment", format: "amount" },
          ],
        },
        "registerFor(uint256 parentId,string label,address to)": {
          intent: "Claim .gwei subdomain",
          fields: [
            { path: "#.label", label: "Label" },
            { path: "#.parentId", label: "Parent", format: "gweiName" },
            { path: "#.to", label: "Recipient", format: "addressName" },
            { path: "@.value", label: "Payment", format: "amount" },
          ],
        },
        "configure(uint256 parentId,address payout,address feeToken,uint256 price,bool enabled,address gateToken,uint256 minGateBalance)":
          {
            intent: "Configure .gwei subdomain sales",
            fields: [
              { path: "#.parentId", label: "Parent", format: "gweiName" },
              { path: "#.payout", label: "Payout", format: "addressName" },
              { path: "#.feeToken", label: "Fee token", format: "addressName" },
              { path: "#.price", label: "Price" },
              { path: "#.enabled", label: "Enabled" },
              {
                path: "#.gateToken",
                label: "Gate token",
                format: "addressName",
              },
              { path: "#.minGateBalance", label: "Min gate balance" },
            ],
          },
        "disable(uint256 parentId)": {
          intent: "Disable .gwei subdomain sales",
          fields: [{ path: "#.parentId", label: "Parent", format: "gweiName" }],
        },
        "withdrawETH(address to)": {
          intent: "Withdraw .gwei registrar fees",
          fields: [{ path: "#.to", label: "Recipient", format: "addressName" }],
        },
        "deposit(uint256 parentId)": {
          intent: "Escrow .gwei parent name",
          fields: [{ path: "#.parentId", label: "Parent", format: "gweiName" }],
        },
        "withdrawParent(uint256 parentId,address to)": {
          intent: "Withdraw .gwei parent name",
          fields: [
            { path: "#.parentId", label: "Parent", format: "gweiName" },
            { path: "#.to", label: "Recipient", format: "addressName" },
          ],
        },
        "clearStaleEscrow(uint256 parentId)": {
          intent: "Clear stale .gwei escrow",
          fields: [{ path: "#.parentId", label: "Parent", format: "gweiName" }],
        },
      },
    },
  };
}

function gnsHumanRegistrarDescriptor(
  chainId: number,
  contractAddress: string
): Erc7730Descriptor {
  return {
    ...gnsBaseDescriptor(chainId, contractAddress, "GNS HumanRegistrar"),
    display: {
      formats: {
        "claim((bytes32 version,(bytes32 vkeyHash,bytes proof,bytes32[] publicInputs) proofVerificationData,bytes committedInputs,(uint256 validityPeriodInSeconds,string domain,string scope,bool devMode) serviceConfig) params,string label)":
          {
            intent: "Claim verified-human .gwei name",
            fields: [
              { path: "#.label", label: "Label" },
              { path: "#.params.serviceConfig.domain", label: "Domain" },
              { path: "#.params.serviceConfig.scope", label: "Scope" },
              { path: "#.params.serviceConfig.devMode", label: "Dev mode" },
            ],
          },
      },
    },
  };
}

function multicall3Descriptor(chainId: number): Erc7730Descriptor {
  return {
    context: {
      contract: {
        deployments: [{ chainId, address: MULTICALL3_ADDRESS }],
      },
    },
    metadata: { owner: "Multicall3", contractName: "Multicall3" },
    display: {
      formats: {
        [MULTICALL3_AGGREGATE3_VALUE_FORMAT_KEY]: {
          intent: "Batched calls with value",
          fields: [
            {
              path: "#.calls.[].callData",
              label: "Call",
              format: "calldata",
              params: {
                calleePath: "#.calls.[].target",
                amountPath: "#.calls.[].value",
              },
            },
          ],
        },
      },
    },
  };
}
