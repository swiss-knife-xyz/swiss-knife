"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keyframes } from "@emotion/react";
import { ConnectButton } from "@/components/ConnectButton";
import { DitherGradient } from "@/components/DitherGradient";
import { Layout } from "@/components/Layout";
import { TokenSetupPanel } from "./components/TokenSetupPanel";
import { LiquidityPanel } from "./components/LiquidityPanel";
import {
  RegisteredTokenList,
  TokenLogo,
} from "./components/RegisteredTokenList";
import { useBatchSupport } from "@/app/migrate/hooks/useBatchSupport";
import {
  BASE_CHAIN_ID,
  BASE_EID,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EID,
  type OftDeployment,
} from "./lib/oft";
import { resolveOftDeployment } from "./lib/resolveDeployment";
import { DEFAULT_DEPLOYMENT, findRegisteredDeployment } from "./lib/registry";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Grid,
  Heading,
  HStack,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Spinner,
  Stack,
  Text,
  usePrefersReducedMotion,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowDownUp,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  Share2,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useAccount,
  usePublicClient,
  useReadContracts,
  useSendCalls,
  useSwitchChain,
  useWaitForCallsStatus,
  useWalletClient,
} from "wagmi";
import {
  encodeFunctionData,
  formatEther,
  formatUnits,
  getAddress,
  isAddress,
  padHex,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { base } from "viem/chains";
import { chainIdToImage, robinhood } from "@/data/common";
import { getPublicClient } from "@/lib/publicClient";

const EXTRA_OPTIONS = "0x00030100110100000000000000000000000000030d40" as Hex;
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;
const BASE_DITHER_COLOR = [45, 91, 255] as const;
const ROBINHOOD_DITHER_COLOR = [201, 255, 47] as const;

type WorkflowTab = "setup" | "bridge" | "liquidity";
type BridgeDirection = "toRobinhood" | "toBase";

const getDirectionForChain = (
  chainId: number | undefined
): BridgeDirection | null =>
  chainId === BASE_CHAIN_ID
    ? "toRobinhood"
    : chainId === ROBINHOOD_CHAIN_ID
      ? "toBase"
      : null;

const edgePatternScroll = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(0, -16px, 0); }
`;

const erc20Abi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "token",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
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

export default function RobinBridgePage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkflowTab>("bridge");
  const [direction, setDirection] = useState<BridgeDirection>("toRobinhood");
  const directionRef = useRef(direction);
  const bridgeDirectionSyncReadyRef = useRef(false);
  const bridgeChainSwitchPendingRef = useRef(false);
  const liquidityChainSwitchAttemptedRef = useRef(false);
  const [deployment, setDeployment] =
    useState<OftDeployment>(DEFAULT_DEPLOYMENT);
  const [routeReady, setRouteReady] = useState(false);
  const [swapIconRotation, setSwapIconRotation] = useState(90);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isToRobinhood = direction === "toRobinhood";
  directionRef.current = direction;
  const deploymentLogo = useMemo(
    () =>
      deployment.logo ??
      findRegisteredDeployment(deployment.baseToken, deployment.robinToken)
        ?.logo,
    [deployment.baseToken, deployment.logo, deployment.robinToken]
  );
  const route = useMemo(
    () =>
      isToRobinhood
        ? {
            sourceName: "Base",
            destinationName: "Robinhood",
            chainId: BASE_CHAIN_ID,
            chain: base,
            token: deployment.baseToken,
            oft: deployment.adapter,
            decimals: deployment.baseDecimals,
            dstEid: ROBINHOOD_EID,
          }
        : {
            sourceName: "Robinhood",
            destinationName: "Base",
            chainId: ROBINHOOD_CHAIN_ID,
            chain: robinhood,
            token: deployment.robinToken,
            oft: deployment.robinToken,
            decimals: 18,
            dstEid: BASE_EID,
          },
    [deployment, isToRobinhood]
  );
  const { address, chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: route.chainId });
  const { switchChainAsync } = useSwitchChain();
  const { supports: supportsBatch } = useBatchSupport(route.chainId);
  const {
    sendCallsAsync,
    error: sendCallsError,
    reset: resetSendCalls,
  } = useSendCalls();
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>();
  const { data: callsStatus, error: callsStatusError } = useWaitForCallsStatus({
    id: activeBatchId,
    query: { enabled: Boolean(activeBatchId) },
  });
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [fee, setFee] = useState<bigint | null>(null);
  const [status, setStatus] = useState<
    "idle" | "quoting" | "approving" | "batching" | "sending"
  >("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [observedAllowance, setObservedAllowance] = useState<bigint | null>(
    null
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!shareCopied) return;
    const timeoutId = window.setTimeout(() => setShareCopied(false), 2_000);
    return () => window.clearTimeout(timeoutId);
  }, [shareCopied]);

  useEffect(() => {
    if (!mounted) return;
    const params = new URL(window.location.href).searchParams;
    const baseToken = params.get("baseToken");
    const robinToken = params.get("robinToken");
    if (!baseToken && !robinToken) {
      const url = new URL(window.location.href);
      url.searchParams.set("baseToken", DEFAULT_DEPLOYMENT.baseToken);
      url.searchParams.set("robinToken", DEFAULT_DEPLOYMENT.robinToken);
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
      setRouteReady(true);
      return;
    }
    if (
      !baseToken ||
      !robinToken ||
      !isAddress(baseToken) ||
      !isAddress(robinToken)
    ) {
      setRouteReady(true);
      return;
    }

    const registeredDeployment = findRegisteredDeployment(
      getAddress(baseToken),
      getAddress(robinToken)
    );
    if (registeredDeployment) {
      setDeployment(registeredDeployment);
      setRouteReady(true);
      return;
    }

    let cancelled = false;
    const loadDeployment = async () => {
      try {
        const resolved = await resolveOftDeployment(
          getAddress(baseToken),
          getAddress(robinToken)
        );
        if (!cancelled) {
          setDeployment(resolved.deployment);
          setRouteReady(true);
        }
      } catch (urlError) {
        if (!cancelled) {
          setError(cleanError(urlError));
          setRouteReady(true);
        }
      }
    };
    void loadDeployment();
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const walletIsConnected = mounted && isConnected;
  const hydratedAddress = mounted ? address : undefined;

  const destination = recipient || hydratedAddress || "";
  const amountLD = useMemo(() => {
    try {
      return amount ? parseUnits(amount, route.decimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, route.decimals]);
  const decimalConversionRate = 10n ** BigInt(Math.max(route.decimals - 6, 0));
  const minAmountLD = amountLD - (amountLD % decimalConversionRate);

  const { data: tokenReads, refetch: refetchTokenReads } = useReadContracts({
    allowFailure: false,
    multicallAddress: MULTICALL3,
    contracts: [
      {
        address: route.token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: hydratedAddress ? [hydratedAddress] : undefined,
        chainId: route.chainId,
      },
      {
        address: deployment.baseToken,
        abi: erc20Abi,
        functionName: "allowance",
        args: hydratedAddress
          ? [hydratedAddress, deployment.adapter]
          : undefined,
        chainId: BASE_CHAIN_ID,
      },
    ],
    query: { enabled: Boolean(hydratedAddress) && routeReady },
  });
  const balance = tokenReads?.[0];
  const allowance = tokenReads?.[1];
  const effectiveAllowance = observedAllowance ?? allowance ?? 0n;

  const needsApproval =
    isToRobinhood && amountLD > 0n && effectiveAllowance < amountLD;
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

  useEffect(() => {
    if (activeTab !== "bridge") {
      bridgeDirectionSyncReadyRef.current = false;
      bridgeChainSwitchPendingRef.current = false;
      return;
    }
    if (!walletIsConnected) {
      bridgeDirectionSyncReadyRef.current = false;
      return;
    }

    if (!bridgeDirectionSyncReadyRef.current) {
      if (directionRef.current !== "toRobinhood") {
        directionRef.current = "toRobinhood";
        setDirection("toRobinhood");
        setSwapIconRotation((current) => current + 180);
        setAmount("");
        setRecipient("");
        setFee(null);
        setTxHash(null);
        setStatus("idle");
        setError("");
      }

      if (chainId === BASE_CHAIN_ID) {
        bridgeDirectionSyncReadyRef.current = true;
        bridgeChainSwitchPendingRef.current = false;
        return;
      }
      if (bridgeChainSwitchPendingRef.current) return;

      bridgeChainSwitchPendingRef.current = true;
      void switchChainAsync({ chainId: BASE_CHAIN_ID })
        .catch(() => {
          // Keep the Base-first route and expected-chain control available if
          // the automatic request is rejected.
        })
        .finally(() => {
          bridgeChainSwitchPendingRef.current = false;
          bridgeDirectionSyncReadyRef.current = true;
        });
      return;
    }

    const walletDirection = getDirectionForChain(chainId);
    if (walletDirection === null || directionRef.current === walletDirection)
      return;

    directionRef.current = walletDirection;
    setDirection(walletDirection);
    setSwapIconRotation((current) => current + 180);
    setAmount("");
    setRecipient("");
    setFee(null);
    setTxHash(null);
    setStatus("idle");
    setError("");
  }, [activeTab, chainId, switchChainAsync, walletIsConnected]);

  useEffect(() => {
    if (activeTab !== "liquidity") {
      liquidityChainSwitchAttemptedRef.current = false;
      return;
    }
    if (
      !walletIsConnected ||
      chainId === ROBINHOOD_CHAIN_ID ||
      liquidityChainSwitchAttemptedRef.current
    ) {
      return;
    }

    liquidityChainSwitchAttemptedRef.current = true;
    void switchChainAsync({ chainId: ROBINHOOD_CHAIN_ID }).catch(() => {
      // Keep the expected-chain control visible if the request is rejected.
    });
  }, [activeTab, chainId, switchChainAsync, walletIsConnected]);

  useEffect(() => {
    setObservedAllowance(null);
  }, [address, deployment.adapter, deployment.baseToken]);

  useEffect(() => {
    if (!address || !routeReady || !isToRobinhood) return;
    let cancelled = false;
    const refreshAllowance = async () => {
      try {
        const nextAllowance = await getPublicClient(BASE_CHAIN_ID).readContract(
          {
            address: deployment.baseToken,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, deployment.adapter],
          }
        );
        if (!cancelled) setObservedAllowance(nextAllowance);
      } catch {
        // The regular multicall result remains the fallback if this refresh
        // fails temporarily.
      }
    };

    void refreshAllowance();
    window.addEventListener("focus", refreshAllowance);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshAllowance);
    };
  }, [
    address,
    deployment.adapter,
    deployment.baseToken,
    isToRobinhood,
    routeReady,
  ]);

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
      const latestAllowance = await publicClient.readContract({
        address: deployment.baseToken,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, deployment.adapter],
      });
      if (latestAllowance >= amountLD) {
        setObservedAllowance(latestAllowance);
        void refetchTokenReads();
        setStatus("idle");
        return;
      }
      const hash = await walletClient.writeContract({
        account: address,
        chain: base,
        address: deployment.baseToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [deployment.adapter, amountLD],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("The approval transaction reverted.");
      }

      // Read at the confirmed receipt block so a lagging latest-block RPC or
      // multicall cache cannot leave the button stuck on "Approve".
      const nextAllowance = await publicClient
        .readContract({
          address: deployment.baseToken,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, deployment.adapter],
          blockNumber: receipt.blockNumber,
        })
        .catch(() => amountLD);
      setObservedAllowance(nextAllowance);
      void refetchTokenReads();
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
      setAmount("");
      setFee(null);
      setStatus("idle");
      void refetchTokenReads();
    } catch (sendError) {
      setStatus("idle");
      setError(cleanError(sendError));
    }
  };

  const approveAndSendBatch = async () => {
    if (
      !isToRobinhood ||
      !supportsBatch ||
      !publicClient ||
      !address ||
      fee === null
    ) {
      return;
    }
    setStatus("batching");
    setError("");
    setActiveBatchId(undefined);
    resetSendCalls();
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

      const result = await sendCallsAsync({
        chainId: route.chainId,
        forceAtomic: true,
        calls: [
          {
            to: deployment.baseToken,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [deployment.adapter, amountLD],
            }),
          },
          {
            to: route.oft,
            data: encodeFunctionData({
              abi: oftAbi,
              functionName: "send",
              args: [
                buildSendParam(),
                { nativeFee: latestFee.nativeFee, lzTokenFee: 0n },
                address,
              ],
            }),
            value: latestFee.nativeFee,
          },
        ],
      });
      setActiveBatchId(result.id);
    } catch (batchError) {
      setStatus("idle");
      setError(cleanError(batchError));
    }
  };

  useEffect(() => {
    if (status !== "batching" || !sendCallsError) return;
    setStatus("idle");
    setError(cleanError(sendCallsError));
  }, [sendCallsError, status]);

  useEffect(() => {
    if (status !== "batching" || !activeBatchId) return;
    if (callsStatusError) {
      setActiveBatchId(undefined);
      setStatus("idle");
      setError(cleanError(callsStatusError));
      return;
    }
    if (!callsStatus) return;

    const receipts = callsStatus.receipts ?? [];
    if (callsStatus.status === "failure") {
      setActiveBatchId(undefined);
      setStatus("idle");
      setError(
        receipts.some((receipt) => receipt.status === "reverted")
          ? "The approval or bridge call reverted. No partial batch was submitted."
          : "The wallet rejected or failed to submit the batch."
      );
      return;
    }

    const allSucceeded =
      callsStatus.status === "success" &&
      receipts.length > 0 &&
      receipts.every((receipt) => receipt.status === "success");
    if (!allSucceeded) return;

    const sourceHash = [...receipts]
      .reverse()
      .find((receipt) => receipt.transactionHash)?.transactionHash;
    setActiveBatchId(undefined);
    setTxHash(sourceHash ?? null);
    setAmount("");
    setFee(null);
    setStatus("idle");
    void refetchTokenReads();
  }, [activeBatchId, callsStatus, callsStatusError, refetchTokenReads, status]);

  const buttonLabel =
    status === "quoting"
      ? "Getting live quote…"
      : status === "approving"
        ? `Approving ${deployment.symbol}…`
        : status === "batching"
          ? "Confirming approval & bridge…"
          : status === "sending"
            ? "Confirming bridge…"
            : fee === null
              ? "Review bridge"
              : needsApproval
                ? supportsBatch
                  ? `Approve & bridge to ${route.destinationName}`
                  : `Approve ${deployment.symbol}`
                : `Bridge to ${route.destinationName}`;

  const formattedBalance =
    !mounted || balance === undefined
      ? "—"
      : Number(formatUnits(balance, route.decimals)).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        });
  const hasInvalidRecipient = Boolean(recipient) && !isAddress(recipient);
  const amountExceedsBalance =
    amountLD > 0n && balance !== undefined && amountLD > balance;

  const reverseDirection = () => {
    const nextDirection =
      direction === "toRobinhood" ? "toBase" : "toRobinhood";
    const nextChainId =
      nextDirection === "toRobinhood" ? BASE_CHAIN_ID : ROBINHOOD_CHAIN_ID;

    setSwapIconRotation((current) => current + 180);
    setDirection(nextDirection);
    setAmount("");
    setRecipient("");
    resetQuote();

    if (walletIsConnected && chainId !== nextChainId) {
      void switchChainAsync({ chainId: nextChainId }).catch(() => {
        // The route stays reversed if the wallet request is rejected. The
        // expected-chain connect control remains available for a later retry.
      });
    }
  };

  const setMaxAmount = () => {
    if (balance !== undefined) {
      setAmount(formatUnits(balance, route.decimals));
      resetQuote();
    }
  };

  const changeWorkflowTab = (nextTab: WorkflowTab) => {
    if (nextTab === "bridge") {
      bridgeDirectionSyncReadyRef.current = false;
      bridgeChainSwitchPendingRef.current = false;
      if (directionRef.current !== "toRobinhood") {
        directionRef.current = "toRobinhood";
        setDirection("toRobinhood");
        setSwapIconRotation((current) => current + 180);
      }
      setAmount("");
      setRecipient("");
      resetQuote();
    } else if (nextTab === "liquidity") {
      liquidityChainSwitchAttemptedRef.current = false;
    }
    setActiveTab(nextTab);
  };

  const openLiquidityAfterBridge = () => {
    changeWorkflowTab("liquidity");
    window.requestAnimationFrame(() => {
      document.getElementById("workflow-tab-liquidity")?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  const replaceDeploymentUrl = (nextDeployment: OftDeployment) => {
    const url = new URL(window.location.href);
    url.searchParams.set("baseToken", nextDeployment.baseToken);
    url.searchParams.set("robinToken", nextDeployment.robinToken);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  };

  const copyBridgeUrl = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("baseToken", deployment.baseToken);
    url.searchParams.set("robinToken", deployment.robinToken);
    try {
      await navigator.clipboard.writeText(url.toString());
      setError("");
      setShareCopied(true);
    } catch {
      setError("Could not copy the bridge link. Copy it from the address bar.");
    }
  };

  const selectDeployment = (nextDeployment: OftDeployment) => {
    const isSameRoute =
      deployment.baseToken.toLowerCase() ===
        nextDeployment.baseToken.toLowerCase() &&
      deployment.robinToken.toLowerCase() ===
        nextDeployment.robinToken.toLowerCase();
    if (isSameRoute && deployment.logo === nextDeployment.logo) {
      return;
    }
    setDeployment(nextDeployment);
    setRouteReady(true);
    if (isSameRoute) return;
    setAmount("");
    setRecipient("");
    resetQuote();
    replaceDeploymentUrl(nextDeployment);
  };

  const openDeploymentBridge = (nextDeployment: OftDeployment) => {
    setDeployment(nextDeployment);
    bridgeDirectionSyncReadyRef.current = false;
    bridgeChainSwitchPendingRef.current = false;
    if (directionRef.current !== "toRobinhood") {
      directionRef.current = "toRobinhood";
      setDirection("toRobinhood");
      setSwapIconRotation((current) => current + 180);
    }
    setAmount("");
    setRecipient("");
    resetQuote();
    setActiveTab("bridge");
    replaceDeploymentUrl(nextDeployment);
  };

  return (
    <Layout allowSticky mt={0}>
      <Box position="relative" isolation="isolate">
        <AmbientChainEdges
          activeTab={activeTab}
          isToRobinhood={isToRobinhood}
          animate={mounted && !prefersReducedMotion}
        />
        <Box
          position="relative"
          zIndex={1}
          w="full"
          maxW={activeTab === "liquidity" ? "container.xl" : "container.lg"}
          mx="auto"
          py={{ base: 4, md: 6 }}
        >
          <RobinWorkflowNav
            activeTab={activeTab}
            onChange={changeWorkflowTab}
          />

          {activeTab === "bridge" ? (
            <Box
              role="tabpanel"
              id="workflow-panel-bridge"
              aria-labelledby="workflow-tab-bridge"
            >
              <Flex
                direction={{ base: "column-reverse", md: "row" }}
                align={{ base: "stretch", md: "center" }}
                justify="space-between"
                gap={4}
                mb={8}
              >
                <Box textAlign={{ base: "center", md: "left" }}>
                  <Heading
                    as="h1"
                    fontSize={{ base: "3xl", md: "4xl" }}
                    color="text.primary"
                    fontWeight="bold"
                    letterSpacing="tight"
                  >
                    Bridge {deployment.symbol}
                  </Heading>
                  <Text
                    color="text.secondary"
                    fontSize="md"
                    mt={2}
                    maxW="620px"
                  >
                    Move {deployment.symbol} between Base and Robinhood Chain
                    through its LayerZero OFT route.
                  </Text>
                  <RegisteredTokenList
                    deployment={deployment}
                    onSelect={selectDeployment}
                  />
                </Box>
                {mounted ? (
                  <Box display="flex" justifyContent="flex-end" flexShrink={0}>
                    <ConnectButton expectedChainId={route.chainId} />
                  </Box>
                ) : null}
              </Flex>

              <Grid
                templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 340px" }}
                gap={4}
                alignItems="start"
              >
                <Box
                  bg="bg.subtle"
                  border="1px solid"
                  borderColor="border.default"
                  borderRadius="lg"
                  overflow="hidden"
                >
                  <Box p={{ base: 4, md: 6 }}>
                    <Flex align="center" justify="space-between" gap={4} mb={5}>
                      <Text color="text.primary" fontWeight="600" fontSize="lg">
                        Transfer details
                      </Text>
                      <HStack
                        spacing={1.5}
                        px={2.5}
                        py={1}
                        bg="whiteAlpha.50"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        borderRadius="md"
                        color="text.secondary"
                        fontSize="xs"
                        fontWeight="600"
                        whiteSpace="nowrap"
                      >
                        <Clock3 size={14} aria-hidden="true" />
                        <Text>Est. time 90 sec</Text>
                      </HStack>
                    </Flex>

                    <Box
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      borderRadius="lg"
                      p={{ base: 3, md: 4 }}
                      mb={6}
                    >
                      <Grid
                        templateColumns="minmax(0, 1fr) auto minmax(0, 1fr)"
                        gap={{ base: 2, sm: 4 }}
                        alignItems="center"
                      >
                        <ChainTile
                          label="From"
                          name={route.sourceName}
                          icon={chainIdToImage[route.chainId]}
                        />
                        <IconButton
                          aria-label="Reverse bridge direction"
                          title="Reverse bridge direction"
                          icon={
                            <Box
                              as="span"
                              display="inline-flex"
                              transform={`rotate(${swapIconRotation}deg)`}
                              transition={
                                !mounted || prefersReducedMotion
                                  ? "none"
                                  : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)"
                              }
                            >
                              <ArrowDownUp size={18} />
                            </Box>
                          }
                          variant="secondary"
                          size="sm"
                          borderRadius="full"
                          onClick={reverseDirection}
                        />
                        <ChainTile
                          label="To"
                          name={route.destinationName}
                          icon={
                            chainIdToImage[
                              isToRobinhood ? ROBINHOOD_CHAIN_ID : BASE_CHAIN_ID
                            ]
                          }
                          align="right"
                        />
                      </Grid>
                    </Box>

                    <VStack spacing={5} align="stretch">
                      <FormControl isInvalid={amountExceedsBalance}>
                        <Flex
                          align="center"
                          justify="space-between"
                          mb={2}
                          gap={3}
                        >
                          <FormLabel m={0} color="text.secondary" fontSize="sm">
                            You send
                          </FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            h="auto"
                            minW={0}
                            p={0}
                            color="text.secondary"
                            fontSize="xs"
                            fontWeight="500"
                            onClick={setMaxAmount}
                          >
                            Balance: {formattedBalance} {deployment.symbol}
                          </Button>
                        </Flex>
                        <InputGroup size="lg">
                          <Input
                            id="amount"
                            name="robin-bridge-amount"
                            inputMode="decimal"
                            autoComplete="off"
                            spellCheck={false}
                            data-1p-ignore="true"
                            data-lpignore="true"
                            data-form-type="other"
                            value={amount}
                            onChange={(event) => {
                              setAmount(
                                event.target.value.replace(/[^\d.]/g, "")
                              );
                              resetQuote();
                            }}
                            placeholder="0.00"
                            aria-label={`${deployment.symbol} amount`}
                            pr="9.5rem"
                            h="72px"
                            bg="whiteAlpha.50"
                            borderColor="whiteAlpha.200"
                            borderRadius="lg"
                            color="text.primary"
                            fontFamily="mono"
                            fontSize={{ base: "2xl", md: "3xl" }}
                            fontWeight="600"
                            _placeholder={{ color: "text.tertiary" }}
                            _hover={{ borderColor: "whiteAlpha.400" }}
                            _focusVisible={{
                              borderColor: "primary.400",
                              boxShadow:
                                "0 0 0 1px var(--chakra-colors-primary-400)",
                            }}
                          />
                          <InputRightElement h="72px" w="9rem" pr={3}>
                            <HStack spacing={2}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                color="primary.400"
                                onClick={setMaxAmount}
                              >
                                MAX
                              </Button>
                              <HStack
                                spacing={2}
                                bg="whiteAlpha.100"
                                px={2.5}
                                py={1.5}
                                borderRadius="md"
                              >
                                {deploymentLogo ? (
                                  <TokenLogo src={deploymentLogo} />
                                ) : (
                                  <Box
                                    boxSize="22px"
                                    display="grid"
                                    placeItems="center"
                                    bg="primary.500"
                                    borderRadius="full"
                                    color="white"
                                    fontSize="xs"
                                    fontWeight="700"
                                  >
                                    {deployment.symbol
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </Box>
                                )}
                                <Text
                                  fontSize="sm"
                                  color="text.primary"
                                  fontWeight="600"
                                >
                                  {deployment.symbol}
                                </Text>
                              </HStack>
                            </HStack>
                          </InputRightElement>
                        </InputGroup>
                        {amountExceedsBalance ? (
                          <FormErrorMessage>
                            Amount exceeds your {deployment.symbol} balance on{" "}
                            {route.sourceName}.
                          </FormErrorMessage>
                        ) : null}
                      </FormControl>

                      <FormControl isInvalid={hasInvalidRecipient}>
                        <FormLabel color="text.secondary" fontSize="sm" mb={2}>
                          Recipient on {route.destinationName}
                        </FormLabel>
                        <Input
                          id="recipient"
                          value={recipient}
                          onChange={(event) => {
                            setRecipient(event.target.value.trim());
                            resetQuote();
                          }}
                          placeholder={
                            hydratedAddress
                              ? `${shortAddress(hydratedAddress)} (connected wallet)`
                              : "0x…"
                          }
                          aria-invalid={hasInvalidRecipient}
                          bg="whiteAlpha.50"
                          borderColor={
                            hasInvalidRecipient
                              ? "error.solid"
                              : "whiteAlpha.200"
                          }
                          borderRadius="lg"
                          color="text.primary"
                          fontFamily="mono"
                          fontSize="sm"
                          _placeholder={{ color: "text.tertiary" }}
                          _hover={{
                            borderColor: hasInvalidRecipient
                              ? "error.solid"
                              : "whiteAlpha.400",
                          }}
                          _focusVisible={{
                            borderColor: hasInvalidRecipient
                              ? "error.solid"
                              : "primary.400",
                            boxShadow: hasInvalidRecipient
                              ? "0 0 0 1px var(--chakra-colors-error-solid)"
                              : "0 0 0 1px var(--chakra-colors-primary-400)",
                          }}
                        />
                        {hasInvalidRecipient ? (
                          <FormErrorMessage>
                            Enter a valid EVM address.
                          </FormErrorMessage>
                        ) : (
                          <FormHelperText color="text.tertiary" fontSize="xs">
                            Leave blank to receive {deployment.symbol} in your
                            connected wallet.
                          </FormHelperText>
                        )}
                      </FormControl>

                      <Box
                        bg="whiteAlpha.50"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        borderRadius="lg"
                        px={4}
                      >
                        <SummaryRow
                          label="Route"
                          value={
                            isToRobinhood
                              ? "OFT Adapter → Native OFT"
                              : "Native OFT → OFT Adapter"
                          }
                        />
                        <Divider borderColor="whiteAlpha.200" />
                        <SummaryRow
                          label="LayerZero fee"
                          value={
                            fee === null
                              ? "Calculated at review"
                              : `${Number(formatEther(fee)).toFixed(6)} ETH`
                          }
                        />
                        <Divider borderColor="whiteAlpha.200" />
                        <SummaryRow
                          label="Minimum received"
                          value={
                            minAmountLD
                              ? `${formatUnits(minAmountLD, route.decimals)} ${deployment.symbol}`
                              : "—"
                          }
                        />
                      </Box>

                      {error ? (
                        <Alert
                          status="error"
                          bg="rgba(239,68,68,0.10)"
                          border="1px solid"
                          borderColor="rgba(239,68,68,0.30)"
                          borderRadius="lg"
                          color="error.text"
                          fontSize="sm"
                          alignItems="flex-start"
                          aria-live="polite"
                        >
                          <AlertIcon color="error.text" mt="2px" />
                          <Text overflowWrap="anywhere">{error}</Text>
                        </Alert>
                      ) : null}

                      {txHash ? (
                        <Alert
                          status="success"
                          bg="rgba(34,197,94,0.10)"
                          border="1px solid"
                          borderColor="rgba(34,197,94,0.30)"
                          borderRadius="lg"
                          color="success.text"
                          alignItems="flex-start"
                          aria-live="polite"
                          position="relative"
                          pr={12}
                        >
                          <CheckCircle2
                            size={19}
                            style={{ marginTop: 2, flexShrink: 0 }}
                          />
                          <Box ml={3}>
                            <Text fontWeight="600">Bridge submitted</Text>
                            <Text color="text.secondary" fontSize="sm" mt={0.5}>
                              Delivery usually takes about 90 seconds.
                            </Text>
                            <Link
                              href={`https://layerzeroscan.com/tx/${txHash}`}
                              isExternal
                              display="inline-flex"
                              alignItems="center"
                              gap={1}
                              color="primary.400"
                              fontSize="sm"
                              mt={2}
                            >
                              Track on LayerZero Scan <ExternalLink size={13} />
                            </Link>
                          </Box>
                          <IconButton
                            aria-label="Dismiss bridge confirmation"
                            icon={<X size={16} />}
                            variant="ghost"
                            size="sm"
                            position="absolute"
                            top={2}
                            right={2}
                            color="text.secondary"
                            _hover={{
                              color: "text.primary",
                              bg: "whiteAlpha.100",
                            }}
                            onClick={() => setTxHash(null)}
                          />
                        </Alert>
                      ) : null}

                      {!walletIsConnected ? (
                        <Box
                          minH="48px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          bg="whiteAlpha.50"
                          border="1px solid"
                          borderColor="whiteAlpha.200"
                          borderRadius="lg"
                          py={2}
                        >
                          {mounted ? (
                            <ConnectButton
                              expectedChainId={route.chainId}
                              hideChain
                            />
                          ) : null}
                        </Box>
                      ) : (
                        <Button
                          type="button"
                          variant="primary"
                          size="lg"
                          w="full"
                          disabled={!amountIsValid || status !== "idle"}
                          onClick={
                            fee === null
                              ? quote
                              : needsApproval
                                ? supportsBatch
                                  ? approveAndSendBatch
                                  : approve
                                : send
                          }
                          rightIcon={
                            status !== "idle" ? (
                              <Spinner size="sm" />
                            ) : (
                              <ArrowRight size={18} />
                            )
                          }
                        >
                          {buttonLabel}
                        </Button>
                      )}

                      {txHash && isToRobinhood ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="lg"
                          w="full"
                          rightIcon={<ArrowRight size={18} />}
                          onClick={openLiquidityAfterBridge}
                        >
                          Add liquidity on Robinhood?
                        </Button>
                      ) : null}

                      <HStack
                        justify="center"
                        spacing={2}
                        color="text.tertiary"
                      >
                        <ShieldCheck size={14} aria-hidden="true" />
                        <Text fontSize="xs" textAlign="center">
                          Permissionless LayerZero route · 2 DVNs · 20
                          confirmations
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                </Box>

                <Stack
                  spacing={4}
                  position={{ lg: "sticky" }}
                  top={{ lg: "1rem" }}
                >
                  <Box
                    bg="bg.subtle"
                    border="1px solid"
                    borderColor="border.default"
                    borderRadius="lg"
                    p={5}
                  >
                    <HStack color="primary.400" spacing={2} mb={3}>
                      <Info size={18} />
                      <Text color="text.primary" fontWeight="600">
                        How it works
                      </Text>
                    </HStack>
                    <VStack align="stretch" spacing={3} color="text.secondary">
                      <Step
                        number="1"
                        text={
                          isToRobinhood
                            ? `${deployment.symbol} is locked on Base.`
                            : `${deployment.symbol} is burned on Robinhood.`
                        }
                      />
                      <Step
                        number="2"
                        text="LayerZero verifies the cross-chain message."
                      />
                      <Step
                        number="3"
                        text={`${deployment.symbol} is released on ${route.destinationName}.`}
                      />
                    </VStack>
                  </Box>

                  <Box
                    bg="bg.subtle"
                    border="1px solid"
                    borderColor="border.default"
                    borderRadius="lg"
                    p={5}
                  >
                    <Text color="text.primary" fontWeight="600" mb={1}>
                      Contracts
                    </Text>
                    <Text color="text.secondary" fontSize="sm" mb={4}>
                      Review the contracts used by this bridge.
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      <ContractLink
                        label={deployment.symbol}
                        chainIcon={{
                          src: "/chainIcons/base.svg",
                          alt: "Base",
                        }}
                        address={deployment.baseToken}
                        href={`https://basescan.org/address/${deployment.baseToken}`}
                      />
                      <ContractLink
                        label={deployment.symbol}
                        chainIcon={{
                          src: "/chainIcons/robinhood.svg",
                          alt: "Robinhood Chain",
                        }}
                        address={deployment.robinToken}
                        href={`https://robinhoodchain.blockscout.com/address/${deployment.robinToken}`}
                      />
                      <Divider borderColor="whiteAlpha.200" my={1} />
                      <ContractLink
                        label={`Base adapter for ${deployment.symbol}`}
                        address={deployment.adapter}
                        href={`https://basescan.org/address/${deployment.adapter}`}
                      />
                      <ContractLink
                        label={`Robinhood OFT for ${deployment.symbol}`}
                        address={deployment.robinToken}
                        href={`https://robinhoodchain.blockscout.com/address/${deployment.robinToken}`}
                      />
                    </VStack>
                  </Box>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    w="full"
                    leftIcon={
                      shareCopied ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Share2 size={18} />
                      )
                    }
                    color={shareCopied ? "success.text" : "text.primary"}
                    aria-live="polite"
                    onClick={() => void copyBridgeUrl()}
                  >
                    {shareCopied
                      ? "Bridge link copied"
                      : `Share link to Bridge ${deployment.symbol}`}
                  </Button>
                </Stack>
              </Grid>
            </Box>
          ) : activeTab === "setup" ? (
            <TokenSetupPanel onOpenBridge={openDeploymentBridge} />
          ) : (
            <LiquidityPanel
              deployment={deployment}
              onSelectDeployment={selectDeployment}
              onOpenBridge={() => changeWorkflowTab("bridge")}
            />
          )}
        </Box>
      </Box>
    </Layout>
  );
}

function RobinWorkflowNav({
  activeTab,
  onChange,
}: {
  activeTab: WorkflowTab;
  onChange: (tab: WorkflowTab) => void;
}) {
  const tabs: {
    id: WorkflowTab;
    label: string;
    leadingLogo?: "base" | "uniswap";
    trailingLogo?: "robinhood";
  }[] = [
    { id: "setup", label: "Set up Token", trailingLogo: "robinhood" },
    {
      id: "bridge",
      label: "Bridge",
      leadingLogo: "base",
      trailingLogo: "robinhood",
    },
    { id: "liquidity", label: "Add Liquidity", leadingLogo: "uniswap" },
  ];

  return (
    <Box
      maxW="760px"
      mx="auto"
      mb={{ base: 6, md: 7 }}
      overflowX="auto"
      sx={{
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Flex
        role="tablist"
        aria-label="Robinhood token workflow"
        w="full"
        minW="540px"
        p="3px"
        gap="2px"
        bg="blackAlpha.300"
        border="1px solid"
        borderColor="border.default"
        borderRadius="lg"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <Button
              key={tab.id}
              id={`workflow-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`workflow-panel-${tab.id}`}
              variant="ghost"
              minH="44px"
              h="auto"
              px={{ base: 3, sm: 5 }}
              flex="1 1 0"
              gap={2}
              borderRadius="md"
              bg={isActive ? "whiteAlpha.100" : "transparent"}
              boxShadow={
                isActive
                  ? "inset 0 0 0 1px var(--chakra-colors-whiteAlpha-200)"
                  : "none"
              }
              color={isActive ? "text.primary" : "text.secondary"}
              fontSize={{ base: "sm", sm: "md" }}
              fontWeight={isActive ? "700" : "600"}
              whiteSpace="nowrap"
              transition="background-color 160ms ease, color 160ms ease"
              _hover={{
                bg: "whiteAlpha.100",
                color: "text.primary",
              }}
              _focusVisible={{
                outline: "2px solid",
                outlineColor: "blue.300",
                outlineOffset: "2px",
              }}
              onClick={() => onChange(tab.id)}
            >
              {tab.leadingLogo ? (
                <Image
                  src={
                    tab.leadingLogo === "uniswap"
                      ? "/tokenIcons/uniswap.svg"
                      : "/chainIcons/base.svg"
                  }
                  alt={tab.leadingLogo === "uniswap" ? "Uniswap" : "Base"}
                  boxSize="22px"
                  flexShrink={0}
                />
              ) : null}
              <Text as="span">{tab.label}</Text>
              {tab.trailingLogo ? (
                <Image
                  src="/chainIcons/robinhood.svg"
                  alt="Robinhood Chain"
                  boxSize="22px"
                  flexShrink={0}
                />
              ) : null}
            </Button>
          );
        })}
      </Flex>
    </Box>
  );
}

function AmbientChainEdges({
  activeTab,
  isToRobinhood,
  animate,
}: {
  activeTab: WorkflowTab;
  isToRobinhood: boolean;
  animate: boolean;
}) {
  const leftPalette =
    activeTab === "liquidity"
      ? "robinhood"
      : activeTab === "setup" || isToRobinhood
        ? "base"
        : "robinhood";
  const rightPalette =
    activeTab === "setup" || activeTab === "liquidity" || isToRobinhood
      ? "robinhood"
      : "base";

  return (
    <Box
      position="absolute"
      top={0}
      bottom="-40px"
      left="50%"
      w="100vw"
      transform="translateX(-50%)"
      overflow="hidden"
      pointerEvents="none"
      aria-hidden="true"
      zIndex={0}
    >
      <EdgeGlow
        side="left"
        palette="base"
        visible={leftPalette === "base"}
        animate={animate}
      />
      <EdgeGlow
        side="left"
        palette="robinhood"
        visible={leftPalette === "robinhood"}
        animate={animate}
      />
      <EdgeGlow
        side="right"
        palette="robinhood"
        visible={rightPalette === "robinhood"}
        animate={animate}
      />
      <EdgeGlow
        side="right"
        palette="base"
        visible={rightPalette === "base"}
        animate={animate}
      />
    </Box>
  );
}

function EdgeGlow({
  side,
  palette,
  visible,
  animate,
}: {
  side: "left" | "right";
  palette: "base" | "robinhood";
  visible: boolean;
  animate: boolean;
}) {
  const isLeft = side === "left";
  const isBase = palette === "base";

  return (
    <Box
      position="absolute"
      top="-5vh"
      bottom="-5vh"
      left={isLeft ? "-48px" : undefined}
      right={isLeft ? undefined : "-48px"}
      w={{ base: "150px", md: "clamp(210px, 18vw, 340px)" }}
      opacity={visible ? 1 : 0}
      animation={animate ? `${edgePatternScroll} 5s linear infinite` : "none"}
      transition="opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)"
      willChange="transform, opacity"
    >
      <DitherGradient
        from={isBase ? BASE_DITHER_COLOR : ROBINHOOD_DITHER_COLOR}
        direction={isLeft ? "right" : "left"}
        cell={4}
        opacity={0.38}
        bloom="aura"
      />
    </Box>
  );
}

function ChainTile({
  label,
  name,
  icon,
  align = "left",
}: {
  label: string;
  name: string;
  icon?: string;
  align?: "left" | "right";
}) {
  return (
    <Flex
      align="center"
      justify={align === "right" ? "flex-end" : "flex-start"}
      gap={3}
      minW={0}
    >
      {align === "left" && (
        <Image
          src={icon}
          alt=""
          aria-hidden="true"
          boxSize={{ base: "32px", sm: "38px" }}
          borderRadius="full"
          bg="whiteAlpha.100"
          fallbackSrc="/icon.png"
        />
      )}
      <Box textAlign={align} minW={0}>
        <Text color="text.tertiary" fontSize="xs">
          {label}
        </Text>
        <Text color="text.primary" fontWeight="600" noOfLines={1}>
          {name}
        </Text>
      </Box>
      {align === "right" && (
        <Image
          src={icon}
          alt=""
          aria-hidden="true"
          boxSize={{ base: "32px", sm: "38px" }}
          borderRadius="full"
          bg="whiteAlpha.100"
          fallbackSrc="/icon.png"
        />
      )}
    </Flex>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" align="flex-start" gap={4} py={3}>
      <Text color="text.secondary" fontSize="sm">
        {label}
      </Text>
      <Text
        color="text.primary"
        fontSize="sm"
        fontWeight="500"
        textAlign="right"
        overflowWrap="anywhere"
      >
        {value}
      </Text>
    </Flex>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <HStack align="flex-start" spacing={3}>
      <Box
        boxSize="22px"
        flexShrink={0}
        display="grid"
        placeItems="center"
        bg="whiteAlpha.100"
        borderRadius="full"
        color="primary.400"
        fontFamily="mono"
        fontSize="xs"
        fontWeight="600"
      >
        {number}
      </Box>
      <Text fontSize="sm" lineHeight="1.5">
        {text}
      </Text>
    </HStack>
  );
}

function ContractLink({
  label,
  chainIcon,
  address,
  href,
}: {
  label: string;
  chainIcon?: { src: string; alt: string };
  address: Address;
  href: string;
}) {
  return (
    <Link
      href={href}
      isExternal
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={3}
      px={3}
      py={2.5}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
      _hover={{ bg: "whiteAlpha.100", borderColor: "whiteAlpha.300" }}
    >
      <HStack minW={0} flex={1} spacing={2} justify="space-between">
        <HStack minW={0} spacing={2}>
          <Text color="text.secondary" fontSize="xs" noOfLines={1}>
            {label}
          </Text>
          {chainIcon ? (
            <HStack spacing={1.5} flexShrink={0}>
              <Text color="text.secondary" fontSize="xs">
                on
              </Text>
              <Image src={chainIcon.src} alt={chainIcon.alt} boxSize="16px" />
            </HStack>
          ) : null}
        </HStack>
        <Text
          color="text.primary"
          fontFamily="mono"
          fontSize="xs"
          flexShrink={0}
        >
          {shortAddress(address)}
        </Text>
      </HStack>
      <Box flexShrink={0} color="primary.400" lineHeight={0}>
        <ExternalLink size={14} />
      </Box>
    </Link>
  );
}
