"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getWalletClient } from "@wagmi/core";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Image,
  Input,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ArrowRight, Check, ExternalLink, ShieldCheck } from "lucide-react";
import {
  erc20Abi,
  formatUnits,
  isAddress,
  padHex,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { base } from "viem/chains";
import { useAccount, useConfig, useSwitchChain } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { getPublicClient } from "@/lib/publicClient";
import { robinhood } from "@/data/common";
import { usePortfolio } from "@/app/migrate/hooks/usePortfolio";
import { useCustomTokenMetadata } from "@/app/migrate/hooks/useCustomTokenMetadata";
import { type PortfolioToken } from "@/app/migrate/lib/portfolioApi";
import {
  BaseTokenHoldingsMenu,
  getBaseTokenHoldings,
} from "./BaseTokenHoldingsMenu";
import {
  BASE_CHAIN_ID,
  BASE_EID,
  CREATE2_FACTORY,
  LAYERZERO,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EID,
  buildDeploymentPlan,
  dvnAbi,
  encodeExecutorConfig,
  encodeUlnConfig,
  endpointConfigAbi,
  oappAdminAbi,
  type OftDeployment,
  type OftDeploymentPlan,
} from "../lib/oft";

const EXTRA_OPTIONS = "0x00030100110100000000000000000000000000030d40" as Hex;
const SETUP_RESUME_VERSION = 1;

const getSetupResumeKey = (owner: Address) =>
  `robin-bridge:setup:v${SETUP_RESUME_VERSION}:${owner.toLowerCase()}`;

const readSetupResumeToken = (owner: Address): Address | null => {
  try {
    const saved = window.localStorage.getItem(getSetupResumeKey(owner));
    if (!saved) return null;
    const parsed = JSON.parse(saved) as {
      version?: number;
      baseToken?: string;
    };
    return parsed.version === SETUP_RESUME_VERSION &&
      parsed.baseToken &&
      isAddress(parsed.baseToken)
      ? parsed.baseToken
      : null;
  } catch {
    return null;
  }
};

const saveSetupResumeToken = (owner: Address, baseToken: Address) => {
  try {
    window.localStorage.setItem(
      getSetupResumeKey(owner),
      JSON.stringify({ version: SETUP_RESUME_VERSION, baseToken })
    );
  } catch {
    // Onchain inspection still allows manual recovery if storage is blocked.
  }
};

const clearSetupResumeToken = (owner: Address) => {
  try {
    window.localStorage.removeItem(getSetupResumeKey(owner));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};

const quoteAbi = [
  {
    type: "function",
    name: "quoteSend",
    stateMutability: "view",
    inputs: [
      {
        name: "sendParam",
        type: "tuple",
        components: [
          { name: "dstEid", type: "uint32" },
          { name: "to", type: "bytes32" },
          { name: "amountLD", type: "uint256" },
          { name: "minAmountLD", type: "uint256" },
          { name: "extraOptions", type: "bytes" },
          { name: "composeMsg", type: "bytes" },
          { name: "oftCmd", type: "bytes" },
        ],
      },
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
] as const;

type SelectedToken = {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
  balanceFormatted?: string;
  valueUsd?: number;
};

type SetupStage =
  | "deploy-adapter"
  | "deploy-oft"
  | "peer-base"
  | "peer-robinhood"
  | "config-base-send"
  | "config-base-receive"
  | "config-robinhood-send"
  | "config-robinhood-receive"
  | "verify-route"
  | "complete";

const stages: {
  id: SetupStage;
  label: string;
  chain?: "Base" | "Robinhood";
}[] = [
  { id: "deploy-adapter", label: "Deploy token adapter", chain: "Base" },
  { id: "deploy-oft", label: "Deploy bridged token", chain: "Robinhood" },
  { id: "peer-base", label: "Connect Robinhood peer", chain: "Base" },
  { id: "peer-robinhood", label: "Connect Base peer", chain: "Robinhood" },
  { id: "config-base-send", label: "Secure outbound lane", chain: "Base" },
  { id: "config-base-receive", label: "Secure inbound lane", chain: "Base" },
  {
    id: "config-robinhood-send",
    label: "Secure outbound lane",
    chain: "Robinhood",
  },
  {
    id: "config-robinhood-receive",
    label: "Secure inbound lane",
    chain: "Robinhood",
  },
  { id: "verify-route", label: "Verify live LayerZero quote" },
];

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

const isMatchingPeer = (peer: Hex, address: Address) =>
  peer.toLowerCase() === padHex(address, { size: 32 }).toLowerCase();

export function TokenSetupPanel({
  onOpenBridge,
}: {
  onOpenBridge: (deployment: OftDeployment) => void;
}) {
  const { address, isConnected } = useAccount();
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const portfolio = usePortfolio(address);
  const [tokenInput, setTokenInput] = useState("");
  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(
    null
  );
  const [reviewed, setReviewed] = useState(false);
  const [stage, setStage] = useState<SetupStage>("deploy-adapter");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const resumeTokenRef = useRef<Address | null>(null);

  useEffect(() => {
    setSelectedToken(null);
    setReviewed(false);
    setStage("deploy-adapter");
    setError("");

    if (!address) {
      setTokenInput("");
      resumeTokenRef.current = null;
      return;
    }

    const savedToken = readSetupResumeToken(address);
    resumeTokenRef.current = savedToken;
    setTokenInput(savedToken ?? "");
  }, [address]);

  const baseHoldings = useMemo(
    () => getBaseTokenHoldings(portfolio.tokens),
    [portfolio.tokens]
  );

  const pastedAddress = isAddress(tokenInput) ? tokenInput : undefined;
  const knownHolding = useMemo(
    () =>
      pastedAddress
        ? baseHoldings.find(
            (token) =>
              token.contractAddress.toLowerCase() ===
              pastedAddress.toLowerCase()
          )
        : undefined,
    [baseHoldings, pastedAddress]
  );
  const customToken = useCustomTokenMetadata(
    pastedAddress,
    BASE_CHAIN_ID,
    Boolean(pastedAddress && !knownHolding)
  );

  useEffect(() => {
    if (!pastedAddress) {
      setSelectedToken(null);
      setReviewed(false);
      return;
    }
    if (knownHolding) {
      setSelectedToken(fromPortfolioToken(knownHolding));
      if (
        resumeTokenRef.current?.toLowerCase() ===
        knownHolding.contractAddress.toLowerCase()
      ) {
        resumeTokenRef.current = null;
        setReviewed(true);
      }
      return;
    }
    if (customToken.data) {
      setSelectedToken({
        address: customToken.data.address as Address,
        name: customToken.data.name,
        symbol: customToken.data.symbol,
        decimals: customToken.data.decimals,
      });
      if (
        resumeTokenRef.current?.toLowerCase() ===
        customToken.data.address.toLowerCase()
      ) {
        resumeTokenRef.current = null;
        setReviewed(true);
      }
    }
  }, [customToken.data, knownHolding, pastedAddress]);

  const plan = useMemo(() => {
    if (!selectedToken || !address) return null;
    return buildDeploymentPlan({
      baseToken: selectedToken.address,
      name: selectedToken.name,
      symbol: selectedToken.symbol,
      baseDecimals: selectedToken.decimals,
      owner: address,
    });
  }, [address, selectedToken]);

  const inspectProgress = useCallback(async () => {
    if (!plan || !address) return;
    setChecking(true);
    setError("");
    try {
      const baseClient = getPublicClient(BASE_CHAIN_ID);
      const robinClient = getPublicClient(ROBINHOOD_CHAIN_ID);
      const [adapterCode, oftCode] = await Promise.all([
        baseClient.getCode({ address: plan.adapter }),
        robinClient.getCode({ address: plan.robinToken }),
      ]);
      if (!adapterCode || adapterCode === "0x") {
        setStage("deploy-adapter");
        return;
      }
      if (!oftCode || oftCode === "0x") {
        setStage("deploy-oft");
        return;
      }

      const basePeer = await baseClient.readContract({
        address: plan.adapter,
        abi: oappAdminAbi,
        functionName: "peers",
        args: [ROBINHOOD_EID],
      });
      if (!isMatchingPeer(basePeer, plan.robinToken)) {
        setStage("peer-base");
        return;
      }
      const robinPeer = await robinClient.readContract({
        address: plan.robinToken,
        abi: oappAdminAbi,
        functionName: "peers",
        args: [BASE_EID],
      });
      if (!isMatchingPeer(robinPeer, plan.adapter)) {
        setStage("peer-robinhood");
        return;
      }

      const baseUln = encodeUlnConfig(LAYERZERO.base.dvns);
      const robinUln = encodeUlnConfig(LAYERZERO.robinhood.dvns);
      const expectedConfigs = [
        {
          stage: "config-base-send" as const,
          client: baseClient,
          endpoint: LAYERZERO.base.endpoint,
          oapp: plan.adapter,
          lib: LAYERZERO.base.sendLib,
          eid: ROBINHOOD_EID,
          entries: [
            [1, encodeExecutorConfig(LAYERZERO.base.executor)],
            [2, baseUln],
          ] as const,
        },
        {
          stage: "config-base-receive" as const,
          client: baseClient,
          endpoint: LAYERZERO.base.endpoint,
          oapp: plan.adapter,
          lib: LAYERZERO.base.receiveLib,
          eid: ROBINHOOD_EID,
          entries: [[2, baseUln]] as const,
        },
        {
          stage: "config-robinhood-send" as const,
          client: robinClient,
          endpoint: LAYERZERO.robinhood.endpoint,
          oapp: plan.robinToken,
          lib: LAYERZERO.robinhood.sendLib,
          eid: BASE_EID,
          entries: [
            [1, encodeExecutorConfig(LAYERZERO.robinhood.executor)],
            [2, robinUln],
          ] as const,
        },
        {
          stage: "config-robinhood-receive" as const,
          client: robinClient,
          endpoint: LAYERZERO.robinhood.endpoint,
          oapp: plan.robinToken,
          lib: LAYERZERO.robinhood.receiveLib,
          eid: BASE_EID,
          entries: [[2, robinUln]] as const,
        },
      ];

      for (const config of expectedConfigs) {
        for (const [configType, expected] of config.entries) {
          const actual = await config.client.readContract({
            address: config.endpoint,
            abi: endpointConfigAbi,
            functionName: "getConfig",
            args: [config.oapp, config.lib, config.eid, configType],
          });
          if (actual.toLowerCase() !== expected.toLowerCase()) {
            setStage(config.stage);
            return;
          }
        }
      }

      setStage("verify-route");
      const amount = parseUnits("1", plan.baseDecimals);
      await baseClient.readContract({
        address: plan.adapter,
        abi: quoteAbi,
        functionName: "quoteSend",
        args: [
          {
            dstEid: ROBINHOOD_EID,
            to: padHex(address, { size: 32 }),
            amountLD: amount,
            minAmountLD: amount,
            extraOptions: EXTRA_OPTIONS,
            composeMsg: "0x",
            oftCmd: "0x",
          },
          false,
        ],
      });
      setStage("complete");
    } catch (progressError) {
      setError(cleanSetupError(progressError));
    } finally {
      setChecking(false);
    }
  }, [address, plan]);

  useEffect(() => {
    if (reviewed && plan) void inspectProgress();
  }, [inspectProgress, plan, reviewed]);

  useEffect(() => {
    if (!reviewed || stage === "complete") return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [reviewed, stage]);

  const reviewSetup = () => {
    if (!selectedToken || !address) return;
    saveSetupResumeToken(address, selectedToken.address);
    setReviewed(true);
  };

  const changeToken = () => {
    if (address) clearSetupResumeToken(address);
    resumeTokenRef.current = null;
    setReviewed(false);
    setStage("deploy-adapter");
  };

  const runCurrentStage = async () => {
    if (!plan || !address || stage === "complete") return;
    setBusy(true);
    setError("");
    try {
      if (stage === "verify-route") {
        await inspectProgress();
        return;
      }

      const isBaseStage =
        stage === "deploy-adapter" ||
        stage === "peer-base" ||
        stage.startsWith("config-base");
      const targetChainId = isBaseStage ? BASE_CHAIN_ID : ROBINHOOD_CHAIN_ID;
      await switchChainAsync({ chainId: targetChainId });
      const walletClient = await getWalletClient(wagmiConfig, {
        chainId: targetChainId,
      });
      const publicClient = getPublicClient(targetChainId);
      const chain = isBaseStage ? base : robinhood;
      let hash: Hex;

      if (stage === "deploy-adapter" || stage === "deploy-oft") {
        hash = await walletClient.sendTransaction({
          account: address,
          chain,
          to: CREATE2_FACTORY,
          data:
            stage === "deploy-adapter"
              ? plan.adapterDeployData
              : plan.robinOftDeployData,
        });
      } else if (stage === "peer-base" || stage === "peer-robinhood") {
        const onBase = stage === "peer-base";
        hash = await walletClient.writeContract({
          account: address,
          chain,
          address: onBase ? plan.adapter : plan.robinToken,
          abi: oappAdminAbi,
          functionName: "setPeer",
          args: [
            onBase ? ROBINHOOD_EID : BASE_EID,
            padHex(onBase ? plan.robinToken : plan.adapter, { size: 32 }),
          ],
        });
      } else {
        const onBase = stage.startsWith("config-base");
        const sending = stage.endsWith("send");
        const layerZero = onBase ? LAYERZERO.base : LAYERZERO.robinhood;
        const oapp = onBase ? plan.adapter : plan.robinToken;
        const remoteEid = onBase ? ROBINHOOD_EID : BASE_EID;

        await validateDvns(publicClient, layerZero.dvns, remoteEid, oapp);
        const params = sending
          ? [
              {
                eid: remoteEid,
                configType: 1,
                config: encodeExecutorConfig(layerZero.executor),
              },
              {
                eid: remoteEid,
                configType: 2,
                config: encodeUlnConfig(layerZero.dvns),
              },
            ]
          : [
              {
                eid: remoteEid,
                configType: 2,
                config: encodeUlnConfig(layerZero.dvns),
              },
            ];
        hash = await walletClient.writeContract({
          account: address,
          chain,
          address: layerZero.endpoint,
          abi: endpointConfigAbi,
          functionName: "setConfig",
          args: [
            oapp,
            sending ? layerZero.sendLib : layerZero.receiveLib,
            params,
          ],
        });
      }

      await publicClient.waitForTransactionReceipt({ hash });
      if (stage === "deploy-adapter" || stage === "deploy-oft") {
        await submitSourceVerification({
          chainId: targetChainId,
          address: stage === "deploy-adapter" ? plan.adapter : plan.robinToken,
          transactionHash: hash,
          contract: stage === "deploy-adapter" ? "adapter" : "oft",
        });
      }
      await inspectProgress();
    } catch (setupError) {
      setError(cleanSetupError(setupError));
    } finally {
      setBusy(false);
    }
  };

  const chooseHolding = (token: PortfolioToken) => {
    if (address) clearSetupResumeToken(address);
    resumeTokenRef.current = null;
    setTokenInput(token.contractAddress);
    setSelectedToken(fromPortfolioToken(token));
    setReviewed(false);
    setError("");
  };

  if (!isConnected || !address) {
    return (
      <SetupShell>
        <Box textAlign="center" py={{ base: 12, md: 20 }}>
          <Image
            src="/chainIcons/robinhood.svg"
            alt="Robinhood Chain"
            boxSize="44px"
            mx="auto"
            mb={4}
          />
          <Heading as="h1" fontSize="2xl" color="text.primary">
            Set up a Base token
          </Heading>
          <Text color="text.secondary" mt={2} mb={6} maxW="480px" mx="auto">
            Connect the wallet that will own and configure the LayerZero route.
          </Text>
          <ConnectButton expectedChainId={BASE_CHAIN_ID} />
        </Box>
      </SetupShell>
    );
  }

  return (
    <SetupShell>
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "stretch", md: "flex-start" }}
        gap={5}
        mb={7}
      >
        <Box>
          <Heading
            as="h1"
            fontSize={{ base: "2xl", md: "3xl" }}
            color="text.primary"
          >
            Set up a Base token
          </Heading>
          <Text color="text.secondary" mt={2} maxW="620px">
            Create its canonical LayerZero adapter on Base and mint/burn
            representation on Robinhood Chain.
          </Text>
        </Box>
        <ConnectButton expectedChainId={BASE_CHAIN_ID} />
      </Flex>

      {!reviewed ? (
        <Stack spacing={6}>
          <Box>
            <FormControl
              isInvalid={
                Boolean(tokenInput) &&
                !customToken.isLoading &&
                (!pastedAddress || customToken.isInvalid)
              }
            >
              <FormLabel color="text.secondary" fontSize="sm">
                Base token contract
              </FormLabel>
              <HStack align="stretch" spacing={2}>
                <Box position="relative" flex={1}>
                  <Input
                    value={tokenInput}
                    onChange={(event) => {
                      if (address) clearSetupResumeToken(address);
                      resumeTokenRef.current = null;
                      setTokenInput(event.target.value.trim());
                      setSelectedToken(null);
                      setReviewed(false);
                      setError("");
                    }}
                    placeholder="0x…"
                    fontFamily="mono"
                    pr={customToken.isLoading ? 10 : 4}
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.200"
                    _hover={{ borderColor: "whiteAlpha.400" }}
                  />
                  {customToken.isLoading ? (
                    <Spinner
                      size="sm"
                      position="absolute"
                      right={3}
                      top="12px"
                    />
                  ) : null}
                </Box>
                <BaseTokenHoldingsMenu
                  tokens={baseHoldings}
                  isLoading={portfolio.isLoading}
                  onSelect={chooseHolding}
                />
              </HStack>
              <FormErrorMessage>
                Enter a valid ERC-20 contract on Base.
              </FormErrorMessage>
            </FormControl>
          </Box>

          <Collapse in={Boolean(selectedToken)} animateOpacity>
            {selectedToken ? (
              <Box
                p={5}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
              >
                <Flex justify="space-between" align="center" gap={4}>
                  <TokenIdentity token={selectedToken} large />
                  <Badge colorScheme="blue" variant="subtle">
                    Base
                  </Badge>
                </Flex>
                <Divider my={4} borderColor="whiteAlpha.200" />
                <HStack
                  justify="space-between"
                  color="text.secondary"
                  fontSize="sm"
                >
                  <Text>Contract</Text>
                  <Text fontFamily="mono">
                    {shortAddress(selectedToken.address)}
                  </Text>
                </HStack>
                <HStack
                  justify="space-between"
                  color="text.secondary"
                  fontSize="sm"
                  mt={2}
                >
                  <Text>Decimals</Text>
                  <Text>{selectedToken.decimals}</Text>
                </HStack>
              </Box>
            ) : null}
          </Collapse>

          <Alert
            status="warning"
            bg="rgba(245,158,11,0.08)"
            border="1px solid"
            borderColor="rgba(245,158,11,0.28)"
            borderRadius="lg"
            alignItems="flex-start"
          >
            <AlertIcon mt="2px" />
            <Box>
              <Text fontWeight="600">One adapter per token</Text>
              <Text color="text.secondary" fontSize="sm" mt={1}>
                Deploying another adapter fragments liquidity. Continue only if
                this token does not already have a canonical LayerZero route.
              </Text>
            </Box>
          </Alert>

          <Button
            variant="primary"
            size="lg"
            rightIcon={<ArrowRight size={18} />}
            isDisabled={!selectedToken || selectedToken.decimals < 6}
            onClick={reviewSetup}
          >
            Review setup
          </Button>
          {selectedToken && selectedToken.decimals < 6 ? (
            <Text color="error.text" fontSize="sm">
              LayerZero OFT requires at least 6 local decimals.
            </Text>
          ) : null}
        </Stack>
      ) : plan ? (
        <SetupProgress
          plan={plan}
          stage={stage}
          busy={busy}
          checking={checking}
          error={error}
          onBack={changeToken}
          onContinue={runCurrentStage}
          onRefresh={inspectProgress}
          onOpenBridge={() => onOpenBridge(plan)}
        />
      ) : null}
    </SetupShell>
  );
}

function SetupShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      role="tabpanel"
      id="workflow-panel-setup"
      aria-labelledby="workflow-tab-setup"
      maxW="880px"
      mx="auto"
      bg="bg.subtle"
      border="1px solid"
      borderColor="border.default"
      borderRadius="lg"
      p={{ base: 4, md: 7 }}
    >
      {children}
    </Box>
  );
}

function SetupProgress({
  plan,
  stage,
  busy,
  checking,
  error,
  onBack,
  onContinue,
  onRefresh,
  onOpenBridge,
}: {
  plan: OftDeploymentPlan;
  stage: SetupStage;
  busy: boolean;
  checking: boolean;
  error: string;
  onBack: () => void;
  onContinue: () => void;
  onRefresh: () => void;
  onOpenBridge: () => void;
}) {
  const activeIndex =
    stage === "complete"
      ? stages.length
      : stages.findIndex((item) => item.id === stage);
  const active = stages[activeIndex];

  return (
    <GridLayout>
      <Box>
        <Heading as="h1" fontSize="2xl" color="text.primary">
          Launch {plan.symbol} on Robinhood
        </Heading>
        <Text color="text.secondary" mt={2}>
          Each confirmed action is checked onchain before the next one unlocks.
        </Text>

        <VStack align="stretch" spacing={2} mt={6}>
          {stages.map((item, index) => {
            const isComplete = index < activeIndex;
            const isCurrent = index === activeIndex;
            return (
              <Flex
                key={item.id}
                align="center"
                gap={3}
                p={3}
                borderRadius="md"
                bg={isCurrent ? "whiteAlpha.100" : "transparent"}
                opacity={!isComplete && !isCurrent ? 0.48 : 1}
              >
                <Box
                  boxSize="24px"
                  display="grid"
                  placeItems="center"
                  borderRadius="full"
                  bg={
                    isComplete
                      ? "green.400"
                      : isCurrent
                        ? "primary.500"
                        : "whiteAlpha.100"
                  }
                  color={isComplete ? "black" : "white"}
                  fontSize="xs"
                  fontWeight="700"
                >
                  {isComplete ? <Check size={14} /> : index + 1}
                </Box>
                <Text
                  color="text.primary"
                  fontSize="sm"
                  fontWeight={isCurrent ? "600" : "500"}
                >
                  {item.label}
                </Text>
                {item.chain ? (
                  <Image
                    ml="auto"
                    src={
                      item.chain === "Base"
                        ? "/chainIcons/base.svg"
                        : "/chainIcons/robinhood.svg"
                    }
                    alt={`${item.chain} Chain`}
                    title={item.chain}
                    boxSize="24px"
                    flexShrink={0}
                  />
                ) : null}
              </Flex>
            );
          })}
        </VStack>
      </Box>

      <Box>
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          p={5}
        >
          <Text
            color="text.tertiary"
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            Deterministic deployment
          </Text>
          <AddressRow label="Base token" address={plan.baseToken} />
          <AddressRow label="Base adapter" address={plan.adapter} />
          <AddressRow label="Robinhood token" address={plan.robinToken} />
          <Divider my={3} borderColor="whiteAlpha.200" />
          <HStack color="text.secondary" fontSize="xs" align="flex-start">
            <ShieldCheck size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            <Text>
              2 required DVNs · 20 confirmations · executor configured on both
              send lanes
            </Text>
          </HStack>
        </Box>

        {error ? (
          <Alert
            status="error"
            bg="rgba(239, 68, 68, 0.10)"
            border="1px solid"
            borderColor="rgba(248, 113, 113, 0.34)"
            color="#FECACA"
            borderRadius="lg"
            mt={4}
            alignItems="flex-start"
          >
            <AlertIcon color="#F87171" mt="2px" />
            <Text fontSize="sm" overflowWrap="anywhere">
              {error}
            </Text>
          </Alert>
        ) : null}

        {stage === "complete" ? (
          <Box mt={5}>
            <Alert
              status="success"
              bg="rgba(34, 197, 94, 0.10)"
              border="1px solid"
              borderColor="rgba(74, 222, 128, 0.34)"
              color="text.primary"
              borderRadius="lg"
              mb={4}
            >
              <AlertIcon color="#4ADE80" />
              <Box>
                <Text color="#86EFAC" fontWeight="700">
                  Route ready
                </Text>
                <Text color="text.secondary" fontSize="sm">
                  A live LayerZero quote succeeded for this token pair.
                </Text>
              </Box>
            </Alert>
            <Button
              variant="primary"
              size="lg"
              w="full"
              rightIcon={<ArrowRight size={18} />}
              onClick={onOpenBridge}
            >
              Open bridge
            </Button>
          </Box>
        ) : (
          <Stack mt={5} spacing={3}>
            <Button
              variant="primary"
              size="lg"
              w="full"
              rightIcon={
                busy || checking ? (
                  <Spinner size="sm" />
                ) : (
                  <ArrowRight size={18} />
                )
              }
              isDisabled={busy || checking}
              onClick={onContinue}
            >
              {checking
                ? "Checking onchain state…"
                : busy
                  ? "Waiting for confirmation…"
                  : (active?.label ?? "Continue")}
            </Button>
            <HStack justify="space-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                isDisabled={busy}
              >
                Change token
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                isDisabled={busy || checking}
              >
                Refresh status
              </Button>
            </HStack>
          </Stack>
        )}

        <HStack mt={5} spacing={4} color="primary.400" fontSize="xs">
          <HStack
            as="a"
            href={`https://basescan.org/address/${plan.adapter}`}
            target="_blank"
            rel="noreferrer"
            spacing={1}
          >
            <Text>Base adapter</Text>
            <ExternalLink size={12} />
          </HStack>
          <HStack
            as="a"
            href={`https://robinhoodchain.blockscout.com/address/${plan.robinToken}`}
            target="_blank"
            rel="noreferrer"
            spacing={1}
          >
            <Text>Robinhood token</Text>
            <ExternalLink size={12} />
          </HStack>
        </HStack>
      </Box>
    </GridLayout>
  );
}

function GridLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{
        base: "1fr",
        lg: "minmax(0, 1fr) minmax(320px, 0.9fr)",
      }}
      gap={{ base: 7, lg: 8 }}
    >
      {children}
    </Box>
  );
}

function TokenIdentity({
  token,
  large = false,
}: {
  token: SelectedToken;
  large?: boolean;
}) {
  return (
    <HStack spacing={3} minW={0}>
      {token.logoUrl ? (
        <Image
          src={token.logoUrl}
          alt={token.symbol}
          boxSize={large ? "40px" : "28px"}
          borderRadius="full"
          fallbackSrc="/icon.png"
        />
      ) : (
        <Box
          boxSize={large ? "40px" : "28px"}
          display="grid"
          placeItems="center"
          borderRadius="full"
          bg="primary.500"
          color="white"
          fontWeight="700"
          fontSize={large ? "sm" : "xs"}
        >
          {token.symbol.slice(0, 2).toUpperCase()}
        </Box>
      )}
      <Box minW={0}>
        <Text color="text.primary" fontWeight="700" noOfLines={1}>
          {token.symbol}
        </Text>
        <Text color="text.tertiary" fontSize="xs" noOfLines={1}>
          {token.name}
        </Text>
      </Box>
    </HStack>
  );
}

function AddressRow({ label, address }: { label: string; address: Address }) {
  return (
    <HStack justify="space-between" mt={3} spacing={4}>
      <Text color="text.secondary" fontSize="sm">
        {label}
      </Text>
      <Text color="text.primary" fontFamily="mono" fontSize="xs">
        {shortAddress(address)}
      </Text>
    </HStack>
  );
}

function fromPortfolioToken(token: PortfolioToken): SelectedToken {
  return {
    address: token.contractAddress as Address,
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    logoUrl: token.logoUrl,
    balanceFormatted: token.balanceFormatted,
    valueUsd: token.valueUsd,
  };
}

async function validateDvns(
  client: ReturnType<typeof getPublicClient>,
  dvns: readonly [Address, Address],
  remoteEid: number,
  sender: Address
) {
  await Promise.all(
    dvns.map((dvn) =>
      client.readContract({
        address: dvn,
        abi: dvnAbi,
        functionName: "getFee",
        args: [remoteEid, 20n, sender, "0x"],
      })
    )
  );
}

function cleanSetupError(error: unknown) {
  if (!(error instanceof Error)) return "Setup failed. Please try again.";
  if (error.message.includes("User rejected")) return "Transaction rejected.";
  return error.message
    .split("\n")[0]
    .replace("ContractFunctionExecutionError: ", "");
}

async function submitSourceVerification(input: {
  chainId: number;
  address: Address;
  transactionHash: Hex;
  contract: "adapter" | "oft";
}) {
  const response = await fetch("/api/robin-bridge/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      result?.error ??
        "Contract deployed, but automatic source verification failed. Refresh status to continue after verifying it manually."
    );
  }
}
