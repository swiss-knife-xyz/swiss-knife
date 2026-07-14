"use client";

import { useMemo, useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import {
  formatEther,
  formatUnits,
  isAddress,
  padHex,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { base } from "viem/chains";
import { robinhood } from "@/data/common";
import styles from "./styles.module.css";

const BASE_CHAIN_ID = 8453;
const BASE_EID = 30184;
const ROBINHOOD_CHAIN_ID = 4663;
const ROBINHOOD_EID = 30416;
const TOKEN = "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b" as Address;
const ADAPTER = "0xe4bbb2d00aac984ccca26ac5abafd7de3afab8bf" as Address;
const ROBINHOOD_OFT = "0x178e54df3d091ee4d0b2534742ef9e3692b76526" as Address;
const EXTRA_OPTIONS = "0x00030100110100000000000000000000000000030d40" as Hex;
const SHARED_DECIMAL_DUST = 10n ** 12n;

const routes = {
  toRobinhood: {
    sourceName: "Base",
    sourceShortName: "BASE",
    destinationName: "Robinhood",
    destinationShortName: "R",
    chainId: BASE_CHAIN_ID,
    chain: base,
    token: TOKEN,
    oft: ADAPTER,
    dstEid: ROBINHOOD_EID,
  },
  toBase: {
    sourceName: "Robinhood",
    sourceShortName: "R",
    destinationName: "Base",
    destinationShortName: "BASE",
    chainId: ROBINHOOD_CHAIN_ID,
    chain: robinhood,
    token: ROBINHOOD_OFT,
    oft: ROBINHOOD_OFT,
    dstEid: BASE_EID,
  },
} as const;

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const sendParamComponents = [
  { name: "dstEid", type: "uint32" },
  { name: "to", type: "bytes32" },
  { name: "amountLD", type: "uint256" },
  { name: "minAmountLD", type: "uint256" },
  { name: "extraOptions", type: "bytes" },
  { name: "composeMsg", type: "bytes" },
  { name: "oftCmd", type: "bytes" },
] as const;

const oftAbi = [
  {
    type: "function",
    name: "quoteSend",
    stateMutability: "view",
    inputs: [
      { name: "sendParam", type: "tuple", components: sendParamComponents },
      { name: "payInLzToken", type: "bool" },
    ],
    outputs: [
      {
        name: "msgFee",
        type: "tuple",
        components: [
          { name: "nativeFee", type: "uint256" },
          { name: "lzTokenFee", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "send",
    stateMutability: "payable",
    inputs: [
      { name: "sendParam", type: "tuple", components: sendParamComponents },
      {
        name: "fee",
        type: "tuple",
        components: [
          { name: "nativeFee", type: "uint256" },
          { name: "lzTokenFee", type: "uint256" },
        ],
      },
      { name: "refundAddress", type: "address" },
    ],
    outputs: [
      {
        name: "msgReceipt",
        type: "tuple",
        components: [
          { name: "guid", type: "bytes32" },
          { name: "nonce", type: "uint64" },
          {
            name: "fee",
            type: "tuple",
            components: [
              { name: "nativeFee", type: "uint256" },
              { name: "lzTokenFee", type: "uint256" },
            ],
          },
        ],
      },
      {
        name: "oftReceipt",
        type: "tuple",
        components: [
          { name: "amountSentLD", type: "uint256" },
          { name: "amountReceivedLD", type: "uint256" },
        ],
      },
    ],
  },
] as const;

type SendParam = {
  dstEid: number;
  to: Hex;
  amountLD: bigint;
  minAmountLD: bigint;
  extraOptions: Hex;
  composeMsg: Hex;
  oftCmd: Hex;
};

const shortAddress = (value: string) =>
  `${value.slice(0, 6)}…${value.slice(-4)}`;

const cleanError = (error: unknown) => {
  if (!(error instanceof Error)) return "Something went wrong.";
  if (error.message.includes("User rejected")) return "Transaction rejected.";
  if (error.message.includes("insufficient funds"))
    return "Not enough ETH on the source chain to pay the LayerZero fee.";
  return error.message
    .split("\n")[0]
    .replace("ContractFunctionExecutionError: ", "");
};

export default function BankrBridgePage() {
  const [direction, setDirection] =
    useState<keyof typeof routes>("toRobinhood");
  const route = routes[direction];
  const isToRobinhood = direction === "toRobinhood";
  const { address, chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: route.chainId });
  const { switchChainAsync } = useSwitchChain();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [fee, setFee] = useState<bigint | null>(null);
  const [status, setStatus] = useState<
    "idle" | "quoting" | "approving" | "sending" | "submitted"
  >("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<Hex | null>(null);

  const destination = recipient || address || "";
  const amountLD = useMemo(() => {
    try {
      return amount ? parseUnits(amount, 18) : 0n;
    } catch {
      return 0n;
    }
  }, [amount]);
  const minAmountLD = amountLD - (amountLD % SHARED_DECIMAL_DUST);

  const { data: balance } = useReadContract({
    address: route.token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: route.chainId,
    query: { enabled: Boolean(address) },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ADAPTER] : undefined,
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(address) && isToRobinhood },
  });

  const needsApproval =
    isToRobinhood && amountLD > 0n && (allowance ?? 0n) < amountLD;
  const amountIsValid =
    amountLD > 0n &&
    minAmountLD > 0n &&
    amountLD <= (balance ?? 0n) &&
    isAddress(destination);

  const buildSendParam = (): SendParam => ({
    dstEid: route.dstEid,
    to: padHex(destination as Address, { size: 32 }),
    amountLD,
    minAmountLD,
    extraOptions: EXTRA_OPTIONS,
    composeMsg: "0x",
    oftCmd: "0x",
  });

  const resetQuote = () => {
    setFee(null);
    setTxHash(null);
    setStatus("idle");
    setError("");
  };

  const quote = async () => {
    if (!publicClient || !amountIsValid) return;
    setStatus("quoting");
    setError("");
    try {
      const result = await publicClient.readContract({
        address: route.oft,
        abi: oftAbi,
        functionName: "quoteSend",
        args: [buildSendParam(), false],
      });
      setFee(result.nativeFee);
      setStatus("idle");
    } catch (quoteError) {
      setStatus("idle");
      setError(cleanError(quoteError));
    }
  };

  const approve = async () => {
    if (!isToRobinhood || !walletClient || !publicClient || !address) return;
    setStatus("approving");
    setError("");
    try {
      if (chainId !== route.chainId) {
        await switchChainAsync({ chainId: route.chainId });
      }
      const hash = await walletClient.writeContract({
        account: address,
        chain: base,
        address: TOKEN,
        abi: erc20Abi,
        functionName: "approve",
        args: [ADAPTER, amountLD],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetchAllowance();
      setStatus("idle");
    } catch (approveError) {
      setStatus("idle");
      setError(cleanError(approveError));
    }
  };

  const send = async () => {
    if (!walletClient || !publicClient || !address || fee === null) return;
    setStatus("sending");
    setError("");
    try {
      if (chainId !== route.chainId) {
        await switchChainAsync({ chainId: route.chainId });
      }
      const latestFee = await publicClient.readContract({
        address: route.oft,
        abi: oftAbi,
        functionName: "quoteSend",
        args: [buildSendParam(), false],
      });
      setFee(latestFee.nativeFee);
      const hash = await walletClient.writeContract({
        account: address,
        chain: route.chain,
        address: route.oft,
        abi: oftAbi,
        functionName: "send",
        args: [
          buildSendParam(),
          { nativeFee: latestFee.nativeFee, lzTokenFee: 0n },
          address,
        ],
        value: latestFee.nativeFee,
      });
      setTxHash(hash);
      setStatus("submitted");
    } catch (sendError) {
      setStatus("idle");
      setError(cleanError(sendError));
    }
  };

  const buttonLabel =
    status === "quoting"
      ? "Getting live quote…"
      : status === "approving"
        ? "Approving BANKR…"
        : status === "sending"
          ? "Confirming bridge…"
          : fee === null
            ? "Review bridge"
            : needsApproval
              ? "Approve BANKR"
              : `Bridge to ${route.destinationName}`;

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <nav className={styles.nav}>
        <a className={styles.brand} href="/">
          <span className={styles.brandMark}>Ξ</span>
          <span>ETH.sh</span>
        </a>
        <ConnectButton expectedChainId={route.chainId} />
      </nav>

      <section className={styles.shell}>
        <header className={styles.intro}>
          <div className={styles.eyebrow}>
            <span className={styles.liveDot} /> LayerZero OFT route
          </div>
          <h1>
            BANKR, across
            <span> both worlds.</span>
          </h1>
          <p>
            Move BANKR between Base and Robinhood Chain through the verified OFT
            route. Switch direction without leaving the bridge.
          </p>
          <div className={styles.routeLine}>
            <div>
              <b>{route.sourceShortName}</b>
              <small>{route.sourceName}</small>
            </div>
            <span>
              <i />
              <em>LayerZero</em>
              <i />
            </span>
            <div>
              <b>{route.destinationShortName}</b>
              <small>{route.destinationName}</small>
            </div>
          </div>
        </header>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <span>BRIDGE</span>
              <strong>
                {route.sourceName} → {route.destinationName}
              </strong>
            </div>
            <div className={styles.cardActions}>
              <div className={styles.eta}>~90 sec</div>
              <button
                className={styles.flipButton}
                type="button"
                onClick={() => {
                  setDirection((current) =>
                    current === "toRobinhood" ? "toBase" : "toRobinhood"
                  );
                  setAmount("");
                  setRecipient("");
                  resetQuote();
                }}
                aria-label="Reverse bridge direction"
                title="Reverse bridge direction"
              >
                ⇄
              </button>
            </div>
          </div>

          <label className={styles.fieldLabel} htmlFor="amount">
            You send
            <button
              type="button"
              onClick={() => {
                if (balance !== undefined) {
                  setAmount(formatUnits(balance, 18));
                  resetQuote();
                }
              }}
            >
              Balance{" "}
              {balance === undefined
                ? "—"
                : Number(formatUnits(balance, 18)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
            </button>
          </label>
          <div className={styles.amountBox}>
            <input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value.replace(/[^\d.]/g, ""));
                resetQuote();
              }}
              placeholder="0.00"
              aria-label="BANKR amount"
            />
            <button
              type="button"
              onClick={() => {
                if (balance !== undefined) {
                  setAmount(formatUnits(balance, 18));
                  resetQuote();
                }
              }}
            >
              MAX
            </button>
            <div className={styles.tokenPill}>
              <span>B</span>BANKR
            </div>
          </div>

          <label className={styles.fieldLabel} htmlFor="recipient">
            Recipient on {route.destinationName}
            <span>Defaults to connected wallet</span>
          </label>
          <div className={styles.recipientBox}>
            <span>0x</span>
            <input
              id="recipient"
              value={recipient}
              onChange={(event) => {
                setRecipient(event.target.value.trim());
                resetQuote();
              }}
              placeholder={address ? shortAddress(address) : "Wallet address"}
              aria-invalid={Boolean(recipient) && !isAddress(recipient)}
            />
          </div>

          <div className={styles.summary}>
            <div>
              <span>Route</span>
              <b>
                {isToRobinhood
                  ? "OFT Adapter → Native OFT"
                  : "Native OFT → OFT Adapter"}
              </b>
            </div>
            <div>
              <span>LayerZero fee</span>
              <b>
                {fee === null
                  ? "Live quote"
                  : `${Number(formatEther(fee)).toFixed(6)} ETH`}
              </b>
            </div>
            <div>
              <span>You receive</span>
              <b>
                {minAmountLD ? `${formatUnits(minAmountLD, 18)} BANKR` : "—"}
              </b>
            </div>
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}
          {txHash ? (
            <div className={styles.success}>
              <div>
                <span>✓</span>
                <p>
                  <b>Bridge submitted</b>
                  <small>Delivery usually takes about 90 seconds.</small>
                </p>
              </div>
              <a
                href={`https://layerzeroscan.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Track on LayerZero Scan ↗
              </a>
            </div>
          ) : null}

          {!isConnected ? (
            <div className={styles.connectWrap}>
              <ConnectButton expectedChainId={route.chainId} hideChain />
            </div>
          ) : (
            <button
              className={styles.primaryButton}
              type="button"
              disabled={!amountIsValid || status !== "idle"}
              onClick={fee === null ? quote : needsApproval ? approve : send}
            >
              {buttonLabel}
              <span>→</span>
            </button>
          )}

          <p className={styles.disclaimer}>
            Permissionless LayerZero route · 2 DVNs · 20 confirmations
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <a
          href={`https://basescan.org/address/${ADAPTER}`}
          target="_blank"
          rel="noreferrer"
        >
          Base adapter {shortAddress(ADAPTER)} ↗
        </a>
        <a
          href={`https://robinhoodchain.blockscout.com/address/${ROBINHOOD_OFT}`}
          target="_blank"
          rel="noreferrer"
        >
          Robinhood OFT {shortAddress(ROBINHOOD_OFT)} ↗
        </a>
      </footer>
    </main>
  );
}
