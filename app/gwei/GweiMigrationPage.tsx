"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputRightAddon,
  Link,
  Progress,
  SimpleGrid,
  Spinner,
  Text,
  Tooltip,
  VStack,
  useToast,
} from "@chakra-ui/react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  KeyRound,
  Link2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import type { Address, Hex } from "viem";
import { mainnet } from "viem/chains";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { config } from "@/app/providers";
import { ConnectButton } from "@/components/ConnectButton";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { Layout } from "@/components/Layout";
import { getPublicClient } from "@/lib/publicClient";
import {
  ContenthashInfo,
  EnsNameSnapshot,
  GNS_MAINNET_CHAIN_ID,
  GNS_MAX_COMMITMENT_SECONDS,
  GNS_MIN_COMMITMENT_SECONDS,
  GNS_NAME_NFT_ADDRESS,
  GnsNameSnapshot,
  StoredGnsCommitment,
  createGnsCommitmentStorageKey,
  createRandomSecret,
  getEnsGatewayUrl,
  getGnsGatewayUrl,
  gnsNameNftAbi,
  makeGnsCommitment,
  readEnsSnapshot,
  readGnsSnapshot,
  shortenMiddle,
} from "@/lib/gns";

type TxWriter = () => Promise<Hex>;

type RecordStatus = "present" | "empty";

type ComparisonRecord = {
  title: string;
  icon: ElementType;
  ensStatus: RecordStatus;
  gnsStatus: RecordStatus;
  ensValue: ReactNode;
  gnsValue: ReactNode;
};

type EnsNameOption = {
  id: string;
  name: string;
  label: string;
  parentName: string | null;
  expiryDate: number | null;
  relation: {
    owner: boolean;
    registrant: boolean;
    wrappedOwner: boolean;
  };
};

const publicClient = getPublicClient(GNS_MAINNET_CHAIN_ID);
const RECORD_LABEL_COLUMN_WIDTH = "136px";
const COMPARISON_GRID_COLUMNS = `${RECORD_LABEL_COLUMN_WIDTH} minmax(0, 1fr) minmax(0, 1fr)`;
const WORKBENCH_BG = "rgba(255,255,255,0.026)";
const SECTION_BG = "rgba(255,255,255,0.018)";
const VALUE_BG = "rgba(255,255,255,0.024)";
const FIELD_BG = "rgba(0,0,0,0.22)";
const BORDER_SUBTLE = "rgba(255,255,255,0.075)";
const BORDER_FAINT = "rgba(255,255,255,0.05)";
const SECTION_DIVIDER = "rgba(255,255,255,0.055)";

export default function GweiMigrationPage() {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const [isClientMounted, setIsClientMounted] = useState(false);
  const [ensInput, setEnsInput] = useState("");
  const [gweiInput, setGweiInput] = useState("");
  const [gweiManuallyEdited, setGweiManuallyEdited] = useState(false);

  const [ensSnapshot, setEnsSnapshot] = useState<EnsNameSnapshot | null>(null);
  const [gweiSnapshot, setGweiSnapshot] = useState<GnsNameSnapshot | null>(
    null
  );
  const [ensError, setEnsError] = useState("");
  const [gweiError, setGweiError] = useState("");
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [commitment, setCommitment] = useState<StoredGnsCommitment | null>(
    null
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  const requestIdRef = useRef(0);

  const isWalletReady = isClientMounted && isConnected;
  const connectedAddress = isClientMounted
    ? (address as Address | undefined)
    : undefined;
  const gweiCommitLabel = gweiSnapshot?.label;
  const {
    data: ensNameOptions = [],
    isLoading: isLoadingEnsNameOptions,
    isError: isEnsNameOptionsError,
    refetch: refetchEnsNameOptions,
  } = useQuery({
    queryKey: ["gwei", "ens-owned-names", connectedAddress],
    queryFn: () => fetchEnsNameOptions(connectedAddress!),
    enabled: isClientMounted && !!connectedAddress,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const loadSnapshots = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const nextEnsInput = ensInput.trim();
    const nextGweiInput = gweiInput.trim();

    if (!nextEnsInput && !nextGweiInput) {
      setEnsSnapshot(null);
      setGweiSnapshot(null);
      setEnsError("");
      setGweiError("");
      setIsLoadingRecords(false);
      return;
    }

    setIsLoadingRecords(true);

    const [ensResult, gweiResult] = await Promise.allSettled([
      nextEnsInput
        ? readEnsSnapshot(nextEnsInput, connectedAddress)
        : Promise.resolve(null),
      nextGweiInput
        ? readGnsSnapshot(nextGweiInput, connectedAddress)
        : Promise.resolve(null),
    ]);

    if (requestId !== requestIdRef.current) return;

    if (ensResult.status === "fulfilled") {
      setEnsSnapshot(ensResult.value);
      setEnsError("");
    } else {
      setEnsSnapshot(null);
      setEnsError(getErrorMessage(ensResult.reason));
    }

    if (gweiResult.status === "fulfilled") {
      setGweiSnapshot(gweiResult.value);
      setGweiError("");
    } else {
      setGweiSnapshot(null);
      setGweiError(getErrorMessage(gweiResult.reason));
    }

    setIsLoadingRecords(false);
  }, [connectedAddress, ensInput, gweiInput]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSnapshots();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [loadSnapshots]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!connectedAddress || !gweiCommitLabel) {
      setCommitment(null);
      return;
    }

    const key = createGnsCommitmentStorageKey(
      gweiCommitLabel,
      connectedAddress
    );
    if (!key) {
      setCommitment(null);
      return;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) {
      setCommitment(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredGnsCommitment;
      if (
        parsed.label === gweiCommitLabel &&
        parsed.owner.toLowerCase() === connectedAddress.toLowerCase()
      ) {
        setCommitment(parsed);
      } else {
        setCommitment(null);
      }
    } catch {
      window.localStorage.removeItem(key);
      setCommitment(null);
    }
  }, [connectedAddress, gweiCommitLabel]);

  const nowSeconds = Math.floor(nowMs / 1_000);
  const secondsUntilReveal = commitment
    ? Math.max(0, commitment.minRevealAt - nowSeconds)
    : 0;
  const commitmentExpired = commitment
    ? commitment.expiresAt <= nowSeconds
    : false;
  const hasEnsInput = ensInput.trim().length > 0;
  const hasGweiInput = gweiInput.trim().length > 0;
  const selectedEnsOptionName = useMemo(
    () =>
      hasEnsInput
        ? `${stripSuffix(ensInput, "eth").toLowerCase()}.eth`
        : null,
    [ensInput, hasEnsInput]
  );

  const canWriteRecords =
    isWalletReady &&
    !!gweiSnapshot &&
    gweiSnapshot.status === "active" &&
    gweiSnapshot.isOwnerConnected;

  const shouldShowUseEnsControl =
    gweiManuallyEdited &&
    hasEnsInput &&
    stripSuffix(gweiInput, "gwei").toLowerCase() !==
      stripSuffix(ensInput, "eth").toLowerCase();

  const writeBlockReason = getWriteBlockReason({
    isConnected: isWalletReady,
    gweiSnapshot,
  });

  const shouldShowGnsWorkflow =
    gweiSnapshot?.status === "available" ||
    gweiSnapshot?.status === "blocked" ||
    gweiSnapshot?.status === "grace";

  const ensureMainnet = useCallback(async () => {
    if (chainId !== GNS_MAINNET_CHAIN_ID) {
      await switchChainAsync({ chainId: GNS_MAINNET_CHAIN_ID });
    }
  }, [chainId, switchChainAsync]);

  const submitTx = useCallback(
    async (title: string, writer: TxWriter, refreshAfter = true) => {
      if (!isWalletReady || !connectedAddress) {
        toast({
          title: "Connect wallet",
          description: "Connect a wallet before sending a GNS transaction.",
          status: "warning",
        });
        return null;
      }

      setActiveAction(title);

      try {
        await ensureMainnet();
        const hash = await writer();
        const toastId = toast({
          title,
          description: <TxLink hash={hash} label="View transaction" />,
          status: "loading",
          duration: null,
          isClosable: true,
        });

        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId: GNS_MAINNET_CHAIN_ID,
        });

        toast.close(toastId);
        toast({
          title: `${title} confirmed`,
          description: <TxLink hash={hash} label="View on Etherscan" />,
          status: "success",
          duration: 6_000,
          isClosable: true,
        });

        if (refreshAfter) {
          await loadSnapshots();
        }

        return receipt;
      } catch (error) {
        toast({
          title: `${title} failed`,
          description: getErrorMessage(error),
          status: "error",
          duration: 8_000,
          isClosable: true,
        });
        return null;
      } finally {
        setActiveAction(null);
      }
    },
    [connectedAddress, ensureMainnet, isWalletReady, loadSnapshots, toast]
  );

  const handleEnsChange = (value: string) => {
    const nextValue = stripSuffix(value, "eth");
    setEnsInput(nextValue);

    if (!gweiManuallyEdited) {
      setGweiInput(nextValue);
    }
  };

  const handleGweiChange = (value: string) => {
    setGweiManuallyEdited(true);
    setGweiInput(stripSuffix(value, "gwei"));
  };

  const handleEnsNameSelect = useCallback(
    (name: string) => {
      const nextValue = stripSuffix(name, "eth");
      setEnsInput(nextValue);

      if (!gweiManuallyEdited) {
        setGweiInput(nextValue);
      }
    },
    [gweiManuallyEdited]
  );

  const resetGweiFromEns = () => {
    setGweiInput(stripSuffix(ensInput, "eth"));
    setGweiManuallyEdited(false);
  };

  const clearCommitment = () => {
    if (!connectedAddress || !gweiSnapshot) return;
    const key = createGnsCommitmentStorageKey(
      gweiSnapshot.label,
      connectedAddress
    );
    if (key) window.localStorage.removeItem(key);
    setCommitment(null);
  };

  const handleCommit = async () => {
    if (
      !connectedAddress ||
      !gweiSnapshot ||
      gweiSnapshot.status !== "available" ||
      gweiSnapshot.isSubdomain
    ) {
      return;
    }

    const secret = createRandomSecret();
    const commitmentHash = await makeGnsCommitment(
      gweiSnapshot.label,
      connectedAddress,
      secret
    );

    const receipt = await submitTx("Commit registration", () =>
      writeGnsContract({
        functionName: "commit",
        args: [commitmentHash],
      })
    );

    if (!receipt) return;

    const block = await publicClient.getBlock({
      blockNumber: receipt.blockNumber,
    });
    const committedAt = Number(block.timestamp);
    const storedCommitment: StoredGnsCommitment = {
      label: gweiSnapshot.label,
      owner: connectedAddress,
      secret,
      commitment: commitmentHash,
      commitTxHash: receipt.transactionHash,
      committedAt,
      minRevealAt: committedAt + GNS_MIN_COMMITMENT_SECONDS,
      expiresAt: committedAt + GNS_MAX_COMMITMENT_SECONDS,
    };

    const key = createGnsCommitmentStorageKey(
      gweiSnapshot.label,
      connectedAddress
    );
    if (key) {
      window.localStorage.setItem(key, JSON.stringify(storedCommitment));
    }
    setCommitment(storedCommitment);
  };

  const handleReveal = async () => {
    if (
      !commitment ||
      !gweiSnapshot ||
      gweiSnapshot.status !== "available" ||
      gweiSnapshot.isSubdomain ||
      secondsUntilReveal > 0 ||
      commitmentExpired
    ) {
      return;
    }

    const receipt = await submitTx("Reveal registration", () =>
      writeGnsContract({
        functionName: "reveal",
        args: [gweiSnapshot.label, commitment.secret],
        value: gweiSnapshot.totalRegistrationCost,
      })
    );

    if (receipt) {
      clearCommitment();
      await loadSnapshots();
    }
  };

  const handleRegisterSubdomain = async () => {
    if (
      !gweiSnapshot ||
      !gweiSnapshot.isSubdomain ||
      gweiSnapshot.status !== "available" ||
      !gweiSnapshot.parentTokenId
    ) {
      return;
    }

    await submitTx("Register GNS subdomain", () =>
      writeGnsContract({
        functionName: "registerSubdomain",
        args: [gweiSnapshot.registrationLabel, gweiSnapshot.parentTokenId],
      })
    );
  };

  const handleRenew = async () => {
    if (!gweiSnapshot || gweiSnapshot.status !== "grace") return;

    await submitTx("Renew .gwei name", () =>
      writeGnsContract({
        functionName: "renew",
        args: [gweiSnapshot.tokenId],
        value: gweiSnapshot.fee,
      })
    );
  };

  const writeContenthash = useCallback(
    async (refreshAfter = true) => {
      const sourceContenthash = ensSnapshot?.contenthash;
      if (!sourceContenthash || !gweiSnapshot) return null;

      return submitTx(
        "Set GNS contenthash",
        () =>
          writeGnsContract({
            functionName: "setContenthash",
            args: [gweiSnapshot.tokenId, sourceContenthash.raw],
          }),
        refreshAfter
      );
    },
    [ensSnapshot, gweiSnapshot, submitTx]
  );

  const writeAvatar = useCallback(
    async (refreshAfter = true) => {
      const sourceAvatar = ensSnapshot?.avatarText;
      if (!sourceAvatar || !gweiSnapshot) return null;

      return submitTx(
        "Set GNS avatar",
        () =>
          writeGnsContract({
            functionName: "setText",
            args: [gweiSnapshot.tokenId, "avatar", sourceAvatar],
          }),
        refreshAfter
      );
    },
    [ensSnapshot, gweiSnapshot, submitTx]
  );

  const writePrimary = useCallback(
    async (refreshAfter = true) => {
      if (!gweiSnapshot) return null;

      return submitTx(
        "Set GNS primary name",
        () =>
          writeGnsContract({
            functionName: "setPrimaryName",
            args: [gweiSnapshot.tokenId],
          }),
        refreshAfter
      );
    },
    [gweiSnapshot, submitTx]
  );

  const comparisonRecords: ComparisonRecord[] = [
    {
      title: "Website",
      icon: Globe2,
      ensStatus: ensSnapshot?.contenthash ? "present" : "empty",
      gnsStatus: gweiSnapshot?.contenthash ? "present" : "empty",
      ensValue: (
        <ContenthashDisplay
          info={ensSnapshot?.contenthash || null}
          gatewayUrl={
            ensSnapshot?.contenthash ? getEnsGatewayUrl(ensSnapshot.name) : null
          }
        />
      ),
      gnsValue: (
        <RecordValueWithAction
          action={
            !gweiSnapshot?.contenthash && ensSnapshot?.contenthash ? (
              <RecordActionButton
                label="Use ENS contenthash"
                canWrite={canWriteRecords}
                blockReason={writeBlockReason}
                activeAction={activeAction}
                actionName="Set GNS contenthash"
                onClick={() => void writeContenthash()}
              />
            ) : null
          }
        >
          <ContenthashDisplay
            info={gweiSnapshot?.contenthash || null}
            gatewayUrl={
              gweiSnapshot?.contenthash
                ? getGnsGatewayUrl(gweiSnapshot.label)
                : null
            }
          />
        </RecordValueWithAction>
      ),
    },
    {
      title: "Avatar",
      icon: ImageIcon,
      ensStatus: ensSnapshot?.avatarText ? "present" : "empty",
      gnsStatus: gweiSnapshot?.avatarText ? "present" : "empty",
      ensValue: (
        <AvatarDisplay
          imageUrl={ensSnapshot?.avatarImage || null}
          value={ensSnapshot?.avatarText || null}
        />
      ),
      gnsValue: (
        <RecordValueWithAction
          action={
            !gweiSnapshot?.avatarText && ensSnapshot?.avatarText ? (
              <RecordActionButton
                label="Use ENS avatar"
                canWrite={canWriteRecords}
                blockReason={writeBlockReason}
                activeAction={activeAction}
                actionName="Set GNS avatar"
                onClick={() => void writeAvatar()}
              />
            ) : null
          }
        >
          <AvatarDisplay
            imageUrl={gweiSnapshot?.avatarImage || null}
            value={gweiSnapshot?.avatarText || null}
          />
        </RecordValueWithAction>
      ),
    },
    {
      title: "Primary",
      icon: ShieldCheck,
      ensStatus: ensSnapshot?.isPrimaryForConnectedAddress
        ? "present"
        : "empty",
      gnsStatus: gweiSnapshot?.isPrimaryForConnectedAddress
        ? "present"
        : "empty",
      ensValue: (
        <PrimaryDisplay
          name={ensSnapshot?.name || null}
          primaryName={ensSnapshot?.primaryName || null}
          isPrimary={!!ensSnapshot?.isPrimaryForConnectedAddress}
          isConnected={isWalletReady}
        />
      ),
      gnsValue: (
        <RecordValueWithAction
          action={
            !gweiSnapshot?.isPrimaryForConnectedAddress &&
            ensSnapshot?.isPrimaryForConnectedAddress ? (
              <RecordActionButton
                label="Set primary .gwei"
                canWrite={canWriteRecords}
                blockReason={writeBlockReason}
                activeAction={activeAction}
                actionName="Set GNS primary name"
                onClick={() => void writePrimary()}
              />
            ) : null
          }
        >
          <PrimaryDisplay
            name={gweiSnapshot?.name || null}
            primaryName={gweiSnapshot?.primaryName || null}
            isPrimary={!!gweiSnapshot?.isPrimaryForConnectedAddress}
            isConnected={isWalletReady}
          />
        </RecordValueWithAction>
      ),
    },
  ];

  return (
    <Layout allowSticky>
      <Box
        maxW="1180px"
        w="full"
        minW={0}
        mx="auto"
        pb={12}
        overflowX={{ base: "hidden", lg: "visible" }}
      >
        <Flex
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          gap={4}
          direction={{ base: "column", md: "row" }}
          mb={6}
        >
          <Box minW={0}>
            <Heading
              color="text.primary"
              fontSize={{ base: "2xl", md: "4xl", xl: "5xl" }}
              lineHeight="0.98"
              fontWeight="800"
              letterSpacing="0"
              mb={2}
            >
              ENS to{" "}
              <Link
                href="https://gwei.domains/"
                isExternal
                color="inherit"
                textDecoration="none"
                transition="color 120ms ease"
                _hover={{
                  color: "green.200",
                  textDecoration: "none",
                }}
              >
                Gwei Name Service
              </Link>
            </Heading>
            <Text color="text.secondary" fontSize="sm" maxW="720px">
              Register your matching .gwei name, verify ownership, then copy
              website, avatar, and primary identity records from ENS.
            </Text>
          </Box>
          <HStack
            justify={{ base: "flex-start", md: "flex-end" }}
            minW={0}
            flexWrap="wrap"
          >
            <ConnectButton expectedChainId={GNS_MAINNET_CHAIN_ID} />
            <Tooltip label="Refresh records">
              <IconButton
                aria-label="Refresh records"
                icon={<RefreshCw size={16} />}
                variant="outline"
                borderColor={BORDER_SUBTLE}
                color="text.secondary"
                _hover={{
                  bg: "rgba(255,255,255,0.055)",
                  color: "text.primary",
                }}
                onClick={() => void loadSnapshots()}
                isLoading={isLoadingRecords}
              />
            </Tooltip>
          </HStack>
        </Flex>

        <Box
          border="1px solid"
          borderColor={BORDER_SUBTLE}
          bg={WORKBENCH_BG}
          rounded="xl"
          overflow="hidden"
          boxShadow="0 18px 70px rgba(0,0,0,0.24)"
          minW={0}
          w="full"
        >
          <Box ml={{ base: 0, lg: RECORD_LABEL_COLUMN_WIDTH }}>
            <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }}>
              <NamePanel
                tone="ens"
                title="ENS"
                suffix=".eth"
                value={ensInput}
                onChange={handleEnsChange}
                error={ensError}
                isLoading={isLoadingRecords && !!ensInput}
                rightControl={
                  hasEnsInput ? (
                    <OwnerHeaderStatus
                      owner={ensSnapshot?.owner || null}
                      isOwnerConnected={!!ensSnapshot?.isOwnerConnected}
                      isConnected={isWalletReady}
                      isLoading={isLoadingRecords && !!ensInput}
                    />
                  ) : null
                }
                showDivider
              >
                {isWalletReady || hasEnsInput ? (
                  <VStack align="stretch" spacing={2}>
                    <EnsNameOptionRail
                      names={ensNameOptions}
                      selectedName={selectedEnsOptionName}
                      isConnected={isWalletReady}
                      isLoading={isLoadingEnsNameOptions}
                      isError={isEnsNameOptionsError}
                      onSelect={handleEnsNameSelect}
                      onRetry={() => void refetchEnsNameOptions()}
                    />
                  </VStack>
                ) : null}
              </NamePanel>

              <NamePanel
                tone="gns"
                title="GNS"
                suffix=".gwei"
                value={gweiInput}
                onChange={handleGweiChange}
                error={gweiError}
                isLoading={isLoadingRecords && !!gweiInput}
                rightControl={
                  hasGweiInput &&
                  gweiSnapshot?.status !== "available" &&
                  gweiSnapshot?.status !== "blocked" ? (
                    <OwnerHeaderStatus
                      owner={gweiSnapshot?.owner || null}
                      isOwnerConnected={!!gweiSnapshot?.isOwnerConnected}
                      isConnected={isWalletReady}
                      isLoading={isLoadingRecords && !!gweiInput}
                    />
                  ) : null
                }
                inputFooterControl={
                  shouldShowUseEnsControl ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      color="text.secondary"
                      leftIcon={<Link2 size={13} />}
                      onClick={resetGweiFromEns}
                      _hover={{
                        color: "text.primary",
                        bg: "whiteAlpha.100",
                      }}
                    >
                      Use ENS
                    </Button>
                  ) : null
                }
              >
                {hasGweiInput ? (
                  <GnsStatusPanel
                    snapshot={gweiSnapshot}
                    isConnected={isWalletReady}
                    isLoading={isLoadingRecords && !!gweiInput}
                    writeBlockReason={writeBlockReason}
                  />
                ) : null}
              </NamePanel>
            </Grid>
          </Box>

          {shouldShowGnsWorkflow ? (
            <Box borderTop="1px solid" borderColor={BORDER_FAINT}>
              <GnsWorkflowPanel
                snapshot={gweiSnapshot}
                commitment={commitment}
                secondsUntilReveal={secondsUntilReveal}
                commitmentExpired={commitmentExpired}
                activeAction={activeAction}
                isConnected={isWalletReady}
                onCommit={handleCommit}
                onReveal={handleReveal}
                onClearCommitment={clearCommitment}
                onRegisterSubdomain={handleRegisterSubdomain}
                onRenew={handleRenew}
              />
            </Box>
          ) : null}

          <RecordComparisonTable>
            <RecordComparisonBody
              records={comparisonRecords}
              hasEnsInput={hasEnsInput}
              hasGweiInput={hasGweiInput}
            />
          </RecordComparisonTable>
        </Box>
      </Box>
    </Layout>
  );
}

function RecordComparisonTable({ children }: { children: ReactNode }) {
  return (
    <Box borderTop="1px solid" borderColor={BORDER_FAINT}>
      <Grid
        display={{ base: "none", lg: "grid" }}
        templateColumns={COMPARISON_GRID_COLUMNS}
        borderBottom="1px solid"
        borderColor={BORDER_FAINT}
        bg="rgba(255,255,255,0.016)"
        alignItems="center"
      >
        <Text
          color="text.tertiary"
          fontSize="2xs"
          fontWeight="700"
          px={4}
          py={3}
        >
          RECORD
        </Text>
        <Text
          color="text.tertiary"
          fontSize="2xs"
          fontWeight="700"
          px={4}
          py={3}
        >
          ENS SOURCE
        </Text>
        <Text
          color="text.tertiary"
          fontSize="2xs"
          fontWeight="700"
          px={4}
          py={3}
          alignSelf="stretch"
          display="flex"
          alignItems="center"
          boxShadow={`inset 1px 0 0 ${SECTION_DIVIDER}`}
        >
          GNS TARGET
        </Text>
      </Grid>
      {children}
    </Box>
  );
}

function RecordComparisonBody({
  records,
  hasEnsInput,
  hasGweiInput,
}: {
  records: ComparisonRecord[];
  hasEnsInput: boolean;
  hasGweiInput: boolean;
}) {
  return (
    <>
      <Grid
        display={{ base: "none", lg: "grid" }}
        templateColumns={COMPARISON_GRID_COLUMNS}
        templateRows={`repeat(${records.length}, minmax(76px, auto))`}
      >
        {records.map((record, index) => (
          <RecordLabelCell
            key={record.title}
            record={record}
            row={index + 1}
            isLast={index === records.length - 1}
          />
        ))}

        {hasEnsInput ? (
          records.map((record, index) => (
            <RecordValueGridCell
              key={`ens-${record.title}`}
              row={index + 1}
              isLast={index === records.length - 1}
            >
              {record.ensValue}
            </RecordValueGridCell>
          ))
        ) : (
          <>
            {records.map((record, index) => (
              <RecordValueGridCell
                key={`ens-empty-${record.title}`}
                row={index + 1}
                isLast={index === records.length - 1}
                isMuted
              />
            ))}
            <MergedRecordPrompt
              column={2}
              rowCount={records.length}
              text="Enter ENS name to view records"
            />
          </>
        )}

        {hasGweiInput ? (
          records.map((record, index) => (
            <RecordValueGridCell
              key={`gns-${record.title}`}
              row={index + 1}
              isLast={index === records.length - 1}
              isTarget
            >
              {record.gnsValue}
            </RecordValueGridCell>
          ))
        ) : (
          <>
            {records.map((record, index) => (
              <RecordValueGridCell
                key={`gns-empty-${record.title}`}
                row={index + 1}
                isLast={index === records.length - 1}
                isTarget
                isMuted
              />
            ))}
            <MergedRecordPrompt
              column={3}
              rowCount={records.length}
              text="Enter GNS name to view records"
              isTarget
            />
          </>
        )}
      </Grid>

      <Box display={{ base: "block", lg: "none" }}>
        {!hasEnsInput && !hasGweiInput ? (
          <MobileEmptyRecords records={records} />
        ) : (
          records.map((record, index) => (
            <RecordComparisonRow
              key={record.title}
              title={record.title}
              icon={record.icon}
              ensStatus={record.ensStatus}
              gnsStatus={record.gnsStatus}
              ensValue={
                hasEnsInput ? (
                  record.ensValue
                ) : index === 1 ? (
                  <RecordInputPrompt text="Enter ENS name to view records" />
                ) : null
              }
              gnsValue={
                hasGweiInput ? (
                  record.gnsValue
                ) : index === 1 ? (
                  <RecordInputPrompt text="Enter GNS name to view records" />
                ) : null
              }
            />
          ))
        )}
      </Box>
    </>
  );
}

function MobileEmptyRecords({ records }: { records: ComparisonRecord[] }) {
  return (
    <Box position="relative" overflow="hidden">
      <Box opacity={0.54}>
        {records.map((record, index) => (
          <Flex
            key={record.title}
            align="center"
            minH="86px"
            px={4}
            borderBottom={index === records.length - 1 ? "0" : "1px solid"}
            borderColor={BORDER_FAINT}
          >
            <HStack spacing={2.5} minW={0}>
              <Icon
                as={record.icon}
                boxSize={4}
                color="text.secondary"
                flexShrink={0}
              />
              <Text
                color="text.primary"
                fontWeight="700"
                fontSize="sm"
                noOfLines={1}
              >
                {record.title}
              </Text>
            </HStack>
          </Flex>
        ))}
      </Box>

      <Grid
        position="absolute"
        inset={0}
        alignContent="center"
        justifyItems="center"
        gap={3}
        px={5}
        pointerEvents="none"
        color="text.primary"
        _before={{
          content: '""',
          position: "absolute",
          inset: "-14%",
          bg: "rgba(13,13,15,0.5)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          maskImage:
            "radial-gradient(ellipse 76% 44% at 50% 50%, #000 0%, rgba(0,0,0,0.82) 42%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 76% 44% at 50% 50%, #000 0%, rgba(0,0,0,0.82) 42%, transparent 78%)",
        }}
      >
        <MobileRecordPrompt text="Enter ENS name to view records" />
        <MobileRecordPrompt text="Enter GNS name to view records" />
      </Grid>
    </Box>
  );
}

function MobileRecordPrompt({ text }: { text: string }) {
  return (
    <HStack
      position="relative"
      zIndex={1}
      spacing={2}
      color="text.primary"
      textShadow="0 1px 16px rgba(0,0,0,0.5)"
      maxW="100%"
    >
      <ArrowRight size={15} color="var(--chakra-colors-text-secondary)" />
      <Text fontSize="xs" fontWeight="700" noOfLines={1}>
        {text}
      </Text>
    </HStack>
  );
}

function RecordLabelCell({
  record,
  row,
  isLast,
}: {
  record: ComparisonRecord;
  row: number;
  isLast: boolean;
}) {
  return (
    <Flex
      gridColumn={1}
      gridRow={row}
      align="flex-start"
      gap={2.5}
      px={4}
      py={4}
      borderBottom={isLast ? "0" : "1px solid"}
      borderColor={BORDER_FAINT}
    >
      <Icon
        as={record.icon}
        boxSize={4}
        color="text.secondary"
        flexShrink={0}
        mt="2px"
      />
      <Text color="text.primary" fontWeight="700" fontSize="sm" noOfLines={1}>
        {record.title}
      </Text>
    </Flex>
  );
}

function RecordValueGridCell({
  row,
  isLast,
  isTarget,
  isMuted,
  children,
}: {
  row: number;
  isLast: boolean;
  isTarget?: boolean;
  isMuted?: boolean;
  children?: ReactNode;
}) {
  return (
    <VStack
      gridColumn={isTarget ? 3 : 2}
      gridRow={row}
      align="stretch"
      justify="center"
      spacing={2}
      px={4}
      py={4}
      borderBottom={isLast ? "0" : "1px solid"}
      borderColor={BORDER_FAINT}
      opacity={isMuted ? 0.36 : 1}
      bg={
        isMuted
          ? "rgba(255,255,255,0.012)"
          : isTarget
            ? "rgba(125, 211, 252, 0.008)"
            : "transparent"
      }
      boxShadow={isTarget ? `inset 1px 0 0 ${SECTION_DIVIDER}` : undefined}
    >
      {children}
    </VStack>
  );
}

function MergedRecordPrompt({
  column,
  rowCount,
  text,
  isTarget,
}: {
  column: 2 | 3;
  rowCount: number;
  text: string;
  isTarget?: boolean;
}) {
  const maskPosition = isTarget ? "48% 50%" : "52% 50%";

  return (
    <Flex
      gridColumn={column}
      gridRow={`1 / span ${rowCount}`}
      align="center"
      justify="center"
      px={6}
      py={4}
      position="relative"
      overflow="hidden"
      bg="transparent"
      color="text.primary"
      zIndex={2}
      pointerEvents="none"
      boxShadow={isTarget ? `inset 1px 0 0 ${SECTION_DIVIDER}` : undefined}
      _before={{
        content: '""',
        position: "absolute",
        inset: "-18%",
        bg: "rgba(13,13,15,0.48)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        maskImage: `radial-gradient(ellipse 50% 44% at ${maskPosition}, #000 0%, rgba(0,0,0,0.72) 38%, transparent 74%)`,
        WebkitMaskImage: `radial-gradient(ellipse 50% 44% at ${maskPosition}, #000 0%, rgba(0,0,0,0.72) 38%, transparent 74%)`,
      }}
    >
      <HStack
        position="relative"
        zIndex={1}
        spacing={2}
        color="text.primary"
        textShadow="0 1px 16px rgba(0,0,0,0.45)"
      >
        <ArrowRight size={15} color="var(--chakra-colors-text-secondary)" />
        <Text fontSize="xs" fontWeight="700" noOfLines={1}>
          {text}
        </Text>
      </HStack>
    </Flex>
  );
}

function RecordComparisonRow({
  title,
  icon,
  ensStatus,
  gnsStatus,
  ensValue,
  gnsValue,
}: {
  title: string;
  icon: ElementType;
  ensStatus: "present" | "empty";
  gnsStatus: "present" | "empty";
  ensValue: ReactNode;
  gnsValue: ReactNode;
}) {
  return (
    <Grid
      templateColumns={{
        base: "1fr",
        lg: COMPARISON_GRID_COLUMNS,
      }}
      minW={0}
      borderBottom="1px solid"
      borderColor={BORDER_FAINT}
      transition="background-color 120ms ease"
      _hover={{ bg: "rgba(255,255,255,0.014)" }}
      _last={{ borderBottom: "0" }}
    >
      <Flex
        align={{ base: "center", lg: "flex-start" }}
        justify="space-between"
        gap={3}
        px={4}
        py={{ base: 3, lg: 4 }}
        bg={{ base: SECTION_BG, lg: "transparent" }}
      >
        <HStack spacing={2.5} minW={0}>
          <Icon as={icon} boxSize={4} color="text.secondary" flexShrink={0} />
          <Text
            color="text.primary"
            fontWeight="700"
            fontSize="sm"
            noOfLines={1}
          >
            {title}
          </Text>
        </HStack>
        <HStack display={{ base: "flex", lg: "none" }} spacing={2}>
          <StatusDot status={ensStatus} label="ENS" />
          <StatusDot status={gnsStatus} label="GNS" />
        </HStack>
      </Flex>

      <RecordComparisonCell>{ensValue}</RecordComparisonCell>

      <RecordComparisonCell isTarget>{gnsValue}</RecordComparisonCell>
    </Grid>
  );
}

function RecordComparisonCell({
  isTarget,
  children,
}: {
  isTarget?: boolean;
  children: ReactNode;
}) {
  return (
    <VStack
      align="stretch"
      spacing={2}
      px={4}
      py={{ base: 3, lg: 4 }}
      bg={isTarget ? "rgba(125, 211, 252, 0.008)" : "transparent"}
      minW={0}
      overflow="hidden"
    >
      <HStack spacing={2} display={{ base: "flex", lg: "none" }}>
        <Text color="text.tertiary" fontSize="2xs" fontWeight="700">
          {isTarget ? "GNS TARGET" : "ENS SOURCE"}
        </Text>
      </HStack>
      {children}
    </VStack>
  );
}

function RecordValueWithAction({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  if (!action) return <>{children}</>;

  return (
    <Flex
      align={{ base: "stretch", sm: "center" }}
      justify="space-between"
      gap={3}
      w="full"
      minW={0}
      flexDirection={{ base: "column", sm: "row" }}
    >
      <Box flex={1} minW={0}>
        {children}
      </Box>
      <Box flexShrink={0} maxW="full">
        {action}
      </Box>
    </Flex>
  );
}

function StatusDot({
  status,
  label,
}: {
  status: "present" | "empty";
  label: string;
}) {
  return (
    <HStack spacing={1}>
      <Box
        boxSize="6px"
        rounded="full"
        bg={status === "present" ? "green.300" : "text.tertiary"}
      />
      <Text color="text.tertiary" fontSize="2xs" fontWeight="700">
        {label}
      </Text>
    </HStack>
  );
}

function NamePanel({
  tone,
  title,
  suffix,
  value,
  onChange,
  error,
  isLoading,
  rightControl,
  inputFooterControl,
  children,
  showDivider,
}: {
  tone: "ens" | "gns";
  title: string;
  suffix: ".eth" | ".gwei";
  value: string;
  onChange: (value: string) => void;
  error: string;
  isLoading: boolean;
  rightControl?: ReactNode;
  inputFooterControl?: ReactNode;
  children?: ReactNode;
  showDivider?: boolean;
}) {
  const accent = tone === "ens" ? "blue.300" : "green.300";

  return (
    <Box
      borderBottom={{ base: showDivider ? "1px solid" : "0", lg: "0" }}
      borderColor={BORDER_FAINT}
      p={{ base: 4, md: 4 }}
      minH="116px"
      h="full"
      minW={0}
      boxShadow={{
        base: "none",
        lg: tone === "gns" ? `inset 1px 0 0 ${SECTION_DIVIDER}` : "none",
      }}
    >
      <Flex
        justify="space-between"
        align="center"
        gap={3}
        mb={3}
        minW={0}
        flexWrap={{ base: "wrap", md: "nowrap" }}
      >
        <HStack spacing={2} flexShrink={0}>
          <Box boxSize="8px" rounded="full" bg={accent} />
          <Text
            color="text.primary"
            fontWeight="700"
            fontSize="sm"
            letterSpacing="0"
          >
            {title}
          </Text>
        </HStack>
        {rightControl ? (
          <Box minW={0} maxW="full" overflow="hidden">
            {rightControl}
          </Box>
        ) : null}
      </Flex>

      <Box
        rounded="md"
        border="1px solid"
        borderColor={error ? "red.400" : BORDER_SUBTLE}
        bg={FIELD_BG}
        overflow="hidden"
        w="full"
        minW={0}
        transition="border-color 120ms ease, box-shadow 120ms ease"
        _hover={{ borderColor: error ? "red.400" : "rgba(255,255,255,0.13)" }}
        _focusWithin={{
          borderColor: error ? "red.400" : accent,
          boxShadow: `0 0 0 1px var(--chakra-colors-${error ? "red" : tone === "ens" ? "blue" : "green"}-300)`,
        }}
      >
        <InputGroup size="md" minW={0}>
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="name"
            bg="transparent"
            border="0"
            rounded="0"
            color="text.primary"
            fontFamily="mono"
            fontSize={{ base: "md", md: "lg" }}
            h="52px"
            minW={0}
            _placeholder={{ color: "text.tertiary" }}
            _focus={{ boxShadow: "none" }}
            _focusVisible={{ boxShadow: "none" }}
          />
          <InputRightAddon
            bg="rgba(255,255,255,0.055)"
            border="0"
            borderLeft="1px solid"
            borderColor={BORDER_SUBTLE}
            rounded="0"
            color="text.secondary"
            fontFamily="mono"
            fontWeight="700"
            px={4}
            h="52px"
            flexShrink={0}
          >
            {suffix}
          </InputRightAddon>
        </InputGroup>
      </Box>

      {inputFooterControl ? (
        <Flex justify="flex-end" mt={2}>
          {inputFooterControl}
        </Flex>
      ) : null}

      {error || isLoading ? (
        <Flex align="center" justify="space-between" gap={3} mt={3}>
          <Box minH="20px">
            {error ? (
              <Text color="red.300" fontSize="xs">
                {error}
              </Text>
            ) : null}
          </Box>
          {isLoading ? <Spinner size="xs" color={accent} /> : null}
        </Flex>
      ) : null}

      {children ? <Box mt={3}>{children}</Box> : null}
    </Box>
  );
}

function EnsNameOptionRail({
  names,
  selectedName,
  isConnected,
  isLoading,
  isError,
  onSelect,
  onRetry,
}: {
  names: EnsNameOption[];
  selectedName: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isError: boolean;
  onSelect: (name: string) => void;
  onRetry: () => void;
}) {
  if (!isConnected) return null;

  const visibleNames = names.slice(0, 2);
  const hiddenNames = names.slice(2);

  if (isLoading) {
    return (
      <HStack spacing={2} color="text.tertiary" minH="28px" px={1}>
        <Spinner size="xs" color="blue.300" />
        <Text fontSize="xs">Loading held ENS names</Text>
      </HStack>
    );
  }

  if (isError) {
    return (
      <Flex align="center" justify="space-between" gap={2} minH="28px" px={1}>
        <Text color="text.tertiary" fontSize="xs">
          Could not load held ENS names.
        </Text>
        <Button
          size="xs"
          variant="ghost"
          color="text.secondary"
          leftIcon={<RefreshCw size={12} />}
          onClick={onRetry}
          _hover={{ color: "text.primary", bg: "whiteAlpha.100" }}
        >
          Retry
        </Button>
      </Flex>
    );
  }

  if (names.length === 0) {
    return (
      <Text color="text.tertiary" fontSize="xs" minH="28px" px={1}>
        No ENS names held by this wallet.
      </Text>
    );
  }

  return (
    <Flex
      align="center"
      gap={2}
      minW={0}
      maxW="full"
      overflow={{ base: "hidden", md: "visible" }}
    >
      <Text
        color="text.tertiary"
        fontSize="2xs"
        fontWeight="700"
        flexShrink={0}
      >
        YOUR ENS
      </Text>
      <HStack
        spacing={1.5}
        minW={0}
        maxW="full"
        flex={1}
        overflow={{ base: "hidden", md: "visible" }}
      >
        {visibleNames.map((name) => {
          const isSelected = selectedName === name.name.toLowerCase();

          return (
            <EnsNameOptionChip
              key={name.id}
              name={name}
              isSelected={isSelected}
              onSelect={onSelect}
            />
          );
        })}
        {hiddenNames.length > 0 ? (
          <EnsNameMoreMenu
            names={hiddenNames}
            selectedName={selectedName}
            onSelect={onSelect}
          />
        ) : null}
      </HStack>
    </Flex>
  );
}

function EnsNameMoreMenu({
  names,
  selectedName,
  onSelect,
}: {
  names: EnsNameOption[];
  selectedName: string | null;
  onSelect: (name: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setIsOpen(true);
  }, [clearCloseTimer]);

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setIsOpen(false);
  }, [clearCloseTimer]);

  const scheduleCloseMenu = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 90);
  }, [clearCloseTimer]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return (
    <Box
      flexShrink={0}
      position="relative"
      zIndex={40}
      onPointerEnter={openMenu}
      onPointerLeave={scheduleCloseMenu}
      onFocus={openMenu}
      onBlur={scheduleCloseMenu}
    >
      <Button
        size="xs"
        variant="outline"
        h="26px"
        px={2.5}
        rounded="full"
        borderColor={BORDER_FAINT}
        bg="transparent"
        color="text.secondary"
        fontFamily="mono"
        fontWeight="700"
        _hover={{
          borderColor: BORDER_SUBTLE,
          bg: "rgba(255,255,255,0.04)",
          color: "text.primary",
        }}
        _active={{
          bg: "rgba(255,255,255,0.055)",
        }}
      >
        +{names.length} more
      </Button>

      {isOpen ? (
        <Box
          position="absolute"
          top="calc(100% + 6px)"
          left={{ base: "auto", md: 0 }}
          right={{ base: 0, md: "auto" }}
          bg="#111113"
          border="1px solid"
          borderColor={BORDER_SUBTLE}
          rounded="md"
          boxShadow="0 18px 50px rgba(0,0,0,0.42)"
          maxH="280px"
          overflowY="auto"
          minW={{ base: "min(280px, calc(100vw - 32px))", md: "280px" }}
          maxW={{ base: "calc(100vw - 32px)", md: "360px" }}
          p={1}
          zIndex={30}
          onPointerEnter={openMenu}
          onPointerLeave={scheduleCloseMenu}
        >
          {names.map((name) => {
            const isSelected = selectedName === name.name.toLowerCase();

            return (
              <Button
                key={name.id}
                variant="ghost"
                justifyContent="flex-start"
                w="full"
                bg={isSelected ? "rgba(96,165,250,0.12)" : "transparent"}
                color={isSelected ? "blue.100" : "text.secondary"}
                fontFamily="mono"
                fontSize="xs"
                fontWeight="700"
                rounded="md"
                h="32px"
                px={2.5}
                onClick={() => {
                  onSelect(name.name);
                  closeMenu();
                }}
                _hover={{
                  bg: isSelected
                    ? "rgba(96,165,250,0.16)"
                    : "rgba(255,255,255,0.055)",
                  color: "text.primary",
                }}
                _focus={{
                  bg: isSelected
                    ? "rgba(96,165,250,0.16)"
                    : "rgba(255,255,255,0.055)",
                  color: "text.primary",
                }}
              >
                <Text
                  minW={0}
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {name.name}
                </Text>
              </Button>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}

function EnsNameOptionChip({
  name,
  isSelected,
  onSelect,
}: {
  name: EnsNameOption;
  isSelected: boolean;
  onSelect: (name: string) => void;
}) {
  return (
    <Tooltip label={name.name} openDelay={250}>
      <Button
        size="xs"
        variant="outline"
        aria-pressed={isSelected}
        minW={0}
        flexShrink={1}
        h="26px"
        px={2.5}
        rounded="full"
        borderColor={isSelected ? "blue.300" : BORDER_FAINT}
        bg={isSelected ? "rgba(96,165,250,0.13)" : "transparent"}
        color={isSelected ? "blue.100" : "text.secondary"}
        fontFamily="mono"
        fontWeight="700"
        title={name.name}
        onClick={() => onSelect(name.name)}
        _hover={{
          borderColor: isSelected ? "blue.300" : BORDER_SUBTLE,
          bg: isSelected ? "rgba(96,165,250,0.16)" : "rgba(255,255,255,0.04)",
          color: "text.primary",
        }}
      >
        <Text
          as="span"
          maxW={{ base: "86px", sm: "120px", md: "160px", xl: "190px" }}
          minW={0}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {name.name}
        </Text>
      </Button>
    </Tooltip>
  );
}

function OwnerHeaderStatus({
  owner,
  isOwnerConnected,
  isConnected,
  isLoading,
}: {
  owner: Address | null;
  isOwnerConnected: boolean;
  isConnected: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <HStack spacing={2} justify="flex-end" color="text.tertiary" minW={0}>
        <Spinner size="xs" />
        <Text fontSize="2xs" fontWeight="700" textTransform="uppercase">
          Resolving
        </Text>
      </HStack>
    );
  }

  if (!owner) return null;

  return (
    <HStack spacing={2.5} justify="flex-end" minW={0}>
      <Icon
        as={isOwnerConnected ? CheckCircle2 : Wallet}
        color={isOwnerConnected ? "green.300" : "blue.300"}
        boxSize={4}
        flexShrink={0}
      />
      <Text color="text.secondary" fontSize="xs" flexShrink={0}>
        Owner
      </Text>
      <Code
        color="text.primary"
        bg="transparent"
        fontSize="xs"
        minW={0}
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {shortenMiddle(owner, 8, 6)}
      </Code>
      {isConnected ? (
        <Text
          color={isOwnerConnected ? "green.300" : "orange.300"}
          fontSize="2xs"
          fontWeight="700"
          textTransform="uppercase"
          flexShrink={0}
        >
          {isOwnerConnected ? "Connected" : "Read-only"}
        </Text>
      ) : null}
    </HStack>
  );
}

function GnsStatusPanel({
  snapshot,
  isConnected,
  isLoading,
  writeBlockReason,
}: {
  snapshot: GnsNameSnapshot | null;
  isConnected: boolean;
  isLoading: boolean;
  writeBlockReason: string | null;
}) {
  if (isLoading) {
    return null;
  }

  if (!snapshot) {
    return null;
  }

  if (snapshot.status === "available") {
    return (
      <StatusLine
        icon={KeyRound}
        color="green.300"
        text={
          snapshot.isSubdomain
            ? `Available. ${snapshot.parentName} owner can mint it.`
            : snapshot.wasFullyExpired
              ? "Available again. Register it before setting records."
              : "Not minted. Complete commit and reveal to register it."
        }
      />
    );
  }

  if (snapshot.status === "blocked") {
    return (
      <StatusLine
        icon={XCircle}
        color="orange.300"
        text={
          snapshot.blockedReason ||
          "This .gwei name cannot be registered right now."
        }
      />
    );
  }

  if (!writeBlockReason || !isConnected) return null;

  return (
    <Text color="orange.200" fontSize="xs" px={1}>
      {writeBlockReason}
    </Text>
  );
}

function GnsWorkflowPanel({
  snapshot,
  commitment,
  secondsUntilReveal,
  commitmentExpired,
  activeAction,
  isConnected,
  onCommit,
  onReveal,
  onClearCommitment,
  onRegisterSubdomain,
  onRenew,
}: {
  snapshot: GnsNameSnapshot | null;
  commitment: StoredGnsCommitment | null;
  secondsUntilReveal: number;
  commitmentExpired: boolean;
  activeAction: string | null;
  isConnected: boolean;
  onCommit: () => void;
  onReveal: () => void;
  onClearCommitment: () => void;
  onRegisterSubdomain: () => void;
  onRenew: () => void;
}) {
  if (snapshot?.status === "available") {
    return (
      <RegistrationPanel
        snapshot={snapshot}
        commitment={commitment}
        secondsUntilReveal={secondsUntilReveal}
        commitmentExpired={commitmentExpired}
        activeAction={activeAction}
        isConnected={isConnected}
        onCommit={onCommit}
        onReveal={onReveal}
        onClearCommitment={onClearCommitment}
        onRegisterSubdomain={onRegisterSubdomain}
      />
    );
  }

  if (snapshot?.status === "blocked") {
    return <BlockedGnsPanel snapshot={snapshot} />;
  }

  if (snapshot?.status === "grace") {
    return (
      <RenewalPanel
        snapshot={snapshot}
        activeAction={activeAction}
        isConnected={isConnected}
        onRenew={onRenew}
      />
    );
  }

  return null;
}

function RegistrationPanel({
  snapshot,
  commitment,
  secondsUntilReveal,
  commitmentExpired,
  activeAction,
  isConnected,
  onCommit,
  onReveal,
  onClearCommitment,
  onRegisterSubdomain,
}: {
  snapshot: GnsNameSnapshot;
  commitment: StoredGnsCommitment | null;
  secondsUntilReveal: number;
  commitmentExpired: boolean;
  activeAction: string | null;
  isConnected: boolean;
  onCommit: () => void;
  onReveal: () => void;
  onClearCommitment: () => void;
  onRegisterSubdomain: () => void;
}) {
  if (snapshot.isSubdomain) {
    return (
      <SubdomainRegistrationPanel
        snapshot={snapshot}
        activeAction={activeAction}
        isConnected={isConnected}
        onRegisterSubdomain={onRegisterSubdomain}
      />
    );
  }

  const waitProgress = commitment
    ? Math.min(
        100,
        Math.max(
          0,
          ((GNS_MIN_COMMITMENT_SECONDS - secondsUntilReveal) /
            GNS_MIN_COMMITMENT_SECONDS) *
            100
        )
      )
    : 0;

  return (
    <Box bg="rgba(34,197,94,0.07)" p={4} h="full">
      <Flex justify="space-between" align="flex-start" gap={3} mb={4}>
        <Box>
          <HStack spacing={2} mb={1}>
            <KeyRound size={16} color="var(--chakra-colors-green-300)" />
            <Text color="text.primary" fontWeight="700" fontSize="sm">
              Register {snapshot.name}
            </Text>
          </HStack>
          <Text color="text.secondary" fontSize="xs">
            GNS uses commit and reveal. The reveal unlocks record migration.
          </Text>
        </Box>
        <StatusBadge status="present" label="Available" />
      </Flex>

      <SimpleGrid columns={3} spacing={3} mb={4}>
        <CostStat label="Fee" value={snapshot.fee} />
        <CostStat label="Premium" value={snapshot.premium} />
        <CostStat label="Total" value={snapshot.totalRegistrationCost} strong />
      </SimpleGrid>

      {!isConnected ? (
        <ConnectButton expectedChainId={GNS_MAINNET_CHAIN_ID} />
      ) : !commitment ? (
        <Button
          leftIcon={<KeyRound size={16} />}
          colorScheme="green"
          onClick={onCommit}
          isLoading={activeAction === "Commit registration"}
          isDisabled={!!activeAction}
          w="full"
        >
          Commit registration
        </Button>
      ) : commitmentExpired ? (
        <VStack align="stretch" spacing={3}>
          <Alert
            status="warning"
            rounded="md"
            bg="orange.900"
            color="orange.50"
          >
            <AlertIcon />
            Commitment expired. Start a new commit before revealing.
          </Alert>
          <Button variant="outline" onClick={onClearCommitment}>
            Clear expired commitment
          </Button>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={3}>
          <Box>
            <Flex justify="space-between" mb={2}>
              <Text color="text.secondary" fontSize="xs">
                Reveal wait
              </Text>
              <Text color="text.primary" fontSize="xs" fontFamily="mono">
                {secondsUntilReveal > 0 ? `${secondsUntilReveal}s` : "Ready"}
              </Text>
            </Flex>
            <Progress
              value={waitProgress}
              size="sm"
              colorScheme="green"
              rounded="full"
              bg={FIELD_BG}
            />
          </Box>
          <Button
            leftIcon={<ArrowRight size={16} />}
            colorScheme="green"
            onClick={onReveal}
            isLoading={activeAction === "Reveal registration"}
            isDisabled={!!activeAction || secondsUntilReveal > 0}
            w="full"
          >
            Reveal and mint .gwei
          </Button>
        </VStack>
      )}
    </Box>
  );
}

function SubdomainRegistrationPanel({
  snapshot,
  activeAction,
  isConnected,
  onRegisterSubdomain,
}: {
  snapshot: GnsNameSnapshot;
  activeAction: string | null;
  isConnected: boolean;
  onRegisterSubdomain: () => void;
}) {
  const blockReason = !isConnected
    ? "Connect the parent owner wallet to register this subdomain."
    : !snapshot.isParentOwnerConnected
      ? `Connected wallet must own ${snapshot.parentName}.`
      : null;

  return (
    <Box bg="rgba(34,197,94,0.07)" p={4} h="full">
      <Flex justify="space-between" align="flex-start" gap={3} mb={4}>
        <Box>
          <HStack spacing={2} mb={1}>
            <KeyRound size={16} color="var(--chakra-colors-green-300)" />
            <Text color="text.primary" fontWeight="700" fontSize="sm">
              Register {snapshot.name}
            </Text>
          </HStack>
          <Text color="text.secondary" fontSize="xs">
            Parent owner can mint this subdomain for free, then migration
            unlocks.
          </Text>
        </Box>
        <StatusBadge status="present" label="Available" />
      </Flex>

      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} mb={4}>
        <CostStat label="Fee" value={0n} />
        <Box
          rounded="md"
          border="1px solid"
          borderColor={BORDER_FAINT}
          bg={VALUE_BG}
          px={3}
          py={2}
          minW={0}
        >
          <Text color="text.tertiary" fontSize="2xs" mb={1}>
            Parent
          </Text>
          <Text
            color="text.primary"
            fontSize="xs"
            fontWeight="700"
            noOfLines={1}
          >
            {snapshot.parentName || "-"}
          </Text>
        </Box>
      </SimpleGrid>

      {!isConnected ? (
        <ConnectButton expectedChainId={GNS_MAINNET_CHAIN_ID} />
      ) : (
        <Tooltip label={blockReason || ""}>
          <Button
            leftIcon={<KeyRound size={16} />}
            colorScheme="green"
            onClick={onRegisterSubdomain}
            isLoading={activeAction === "Register GNS subdomain"}
            isDisabled={!!blockReason || !!activeAction}
            w="full"
          >
            Register subdomain
          </Button>
        </Tooltip>
      )}
      {blockReason && isConnected ? (
        <Text color="orange.200" fontSize="xs" mt={2}>
          {blockReason}
        </Text>
      ) : null}
    </Box>
  );
}

function BlockedGnsPanel({ snapshot }: { snapshot: GnsNameSnapshot }) {
  return (
    <Box bg="rgba(251,146,60,0.08)" p={4} h="full">
      <HStack spacing={2} mb={2}>
        <XCircle size={16} color="var(--chakra-colors-orange-300)" />
        <Text color="text.primary" fontWeight="700" fontSize="sm">
          Subdomain unavailable
        </Text>
      </HStack>
      <Text color="text.secondary" fontSize="xs">
        {snapshot.blockedReason ||
          "This .gwei name cannot be registered or updated right now."}
      </Text>
    </Box>
  );
}

function RenewalPanel({
  snapshot,
  activeAction,
  isConnected,
  onRenew,
}: {
  snapshot: GnsNameSnapshot;
  activeAction: string | null;
  isConnected: boolean;
  onRenew: () => void;
}) {
  return (
    <Box bg="rgba(251,146,60,0.08)" p={4} h="full">
      <HStack spacing={2} mb={2}>
        <Clock3 size={16} color="var(--chakra-colors-orange-300)" />
        <Text color="text.primary" fontWeight="700" fontSize="sm">
          Name is in grace period
        </Text>
      </HStack>
      <Text color="text.secondary" fontSize="xs" mb={4}>
        Resolver writes are locked until the name is renewed.
      </Text>
      <SimpleGrid columns={2} spacing={3} mb={4}>
        <DateStat label="Expired" seconds={snapshot.expiresAt} />
        <DateStat label="Grace ends" seconds={snapshot.graceEndsAt} />
      </SimpleGrid>
      {!isConnected ? (
        <ConnectButton expectedChainId={GNS_MAINNET_CHAIN_ID} />
      ) : (
        <Button
          leftIcon={<RefreshCw size={16} />}
          colorScheme="orange"
          onClick={onRenew}
          isLoading={activeAction === "Renew .gwei name"}
          isDisabled={!snapshot.isOwnerConnected || !!activeAction}
          w="full"
        >
          Renew for {formatEth(snapshot.fee)} ETH
        </Button>
      )}
      {!snapshot.isOwnerConnected && isConnected ? (
        <Text color="orange.200" fontSize="xs" mt={2}>
          Connected wallet is not the current owner.
        </Text>
      ) : null}
    </Box>
  );
}

function ContenthashDisplay({
  info,
  gatewayUrl,
}: {
  info: ContenthashInfo | null;
  gatewayUrl?: string | null;
}) {
  if (!info) {
    return <EmptyValue text="No website contenthash set." />;
  }

  return (
    <Flex
      align="center"
      gap={2}
      rounded="md"
      border="1px solid"
      borderColor={BORDER_FAINT}
      bg={VALUE_BG}
      px={3}
      py={2}
      w="full"
      maxW="full"
      minW={0}
      overflow="hidden"
    >
      <Code
        display="block"
        bg="transparent"
        color="text.primary"
        fontSize="xs"
        fontFamily="mono"
        w="full"
        maxW="full"
        minW={0}
        flex={1}
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {info.uri}
      </Code>
      <CopyToClipboard
        textToCopy={info.uri}
        px={2}
        minW="36px"
        flexShrink={0}
        color="text.secondary"
        _hover={{ color: "text.primary", bg: "rgba(255,255,255,0.055)" }}
      />
      {gatewayUrl ? (
        <Tooltip label="Open website gateway">
          <IconButton
            as={Link}
            href={gatewayUrl}
            isExternal
            aria-label="Open website gateway"
            icon={<ExternalLink size={15} />}
            size="sm"
            variant="ghost"
            flexShrink={0}
            color="text.secondary"
            _hover={{ color: "text.primary", bg: "rgba(255,255,255,0.055)" }}
          />
        </Tooltip>
      ) : null}
    </Flex>
  );
}

function AvatarDisplay({
  imageUrl,
  value,
}: {
  imageUrl: string | null;
  value: string | null;
}) {
  if (!value) {
    return <EmptyValue text="No avatar text record set." />;
  }

  return (
    <Flex
      align="center"
      gap={3}
      border="1px solid"
      borderColor={BORDER_FAINT}
      bg={VALUE_BG}
      rounded="md"
      px={3}
      py={2}
      minW={0}
    >
      <Box
        boxSize="36px"
        rounded="md"
        bg="rgba(255,255,255,0.055)"
        overflow="hidden"
        flexShrink={0}
        display="grid"
        placeItems="center"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Avatar"
            boxSize="36px"
            objectFit="cover"
            fallback={
              <ImageIcon size={18} color="var(--chakra-colors-text-tertiary)" />
            }
          />
        ) : (
          <ImageIcon size={18} color="var(--chakra-colors-text-tertiary)" />
        )}
      </Box>
      <Code
        bg="transparent"
        color="text.primary"
        fontSize="xs"
        fontFamily="mono"
        minW={0}
        flex={1}
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {value}
      </Code>
      <CopyToClipboard
        textToCopy={value}
        px={2}
        color="text.secondary"
        _hover={{ color: "text.primary", bg: "rgba(255,255,255,0.055)" }}
      />
    </Flex>
  );
}

function PrimaryDisplay({
  name,
  primaryName,
  isPrimary,
  isConnected,
}: {
  name: string | null;
  primaryName: string | null;
  isPrimary: boolean;
  isConnected: boolean;
}) {
  if (!isConnected) {
    return <EmptyValue text="Connect wallet to check primary name." />;
  }

  return (
    <Flex
      align="center"
      gap={3}
      border="1px solid"
      borderColor={BORDER_FAINT}
      bg={VALUE_BG}
      rounded="md"
      px={3}
      py={2}
      minW={0}
    >
      <Icon
        as={isPrimary ? CheckCircle2 : XCircle}
        boxSize={5}
        color={isPrimary ? "green.300" : "text.tertiary"}
        flexShrink={0}
      />
      <Box minW={0}>
        <Text color="text.primary" fontSize="sm" fontWeight="600" noOfLines={1}>
          {isPrimary ? name : "Not the connected wallet primary name"}
        </Text>
        <Text color="text.tertiary" fontSize="xs" noOfLines={1}>
          Current primary: {primaryName || "none"}
        </Text>
      </Box>
    </Flex>
  );
}

function RecordActionButton({
  label,
  canWrite,
  blockReason,
  activeAction,
  actionName,
  onClick,
}: {
  label: string;
  canWrite: boolean;
  blockReason: string | null;
  activeAction: string | null;
  actionName: string;
  onClick: () => void;
}) {
  return (
    <Tooltip label={!canWrite ? blockReason || "" : ""}>
      <Button
        size="sm"
        variant="outline"
        w={{ base: "full", sm: "auto" }}
        maxW="full"
        borderColor="rgba(74,222,128,0.38)"
        bg="rgba(34,197,94,0.11)"
        color="green.100"
        leftIcon={<ArrowRight size={15} />}
        onClick={onClick}
        isDisabled={!canWrite || !!activeAction}
        isLoading={activeAction === actionName}
        boxShadow="inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(34,197,94,0.04)"
        _hover={{
          bg: "rgba(34,197,94,0.18)",
          borderColor: "rgba(134,239,172,0.62)",
          color: "white",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 22px rgba(34,197,94,0.12)",
        }}
        _active={{ bg: "rgba(34,197,94,0.24)" }}
        _disabled={{
          borderColor: BORDER_SUBTLE,
          bg: "rgba(255,255,255,0.028)",
          color: "text.tertiary",
          boxShadow: "none",
          opacity: 0.72,
          cursor: "not-allowed",
        }}
      >
        <Text as="span" noOfLines={1}>
          {label}
        </Text>
      </Button>
    </Tooltip>
  );
}

function EmptyValue({ text }: { text: string }) {
  return (
    <Flex
      align="center"
      gap={2}
      color="text.tertiary"
      px={1}
      py={1}
      minH="36px"
    >
      <XCircle size={14} />
      <Text fontSize="xs">{text}</Text>
    </Flex>
  );
}

function RecordInputPrompt({ text }: { text: string }) {
  return (
    <Flex
      align="center"
      justify="center"
      gap={2}
      minH="72px"
      px={4}
      py={3}
      rounded="md"
      bg="rgba(13,13,15,0.48)"
      color="text.primary"
      backdropFilter="blur(14px)"
      boxShadow="inset 0 1px 0 rgba(255,255,255,0.035), inset 0 -1px 0 rgba(255,255,255,0.025)"
    >
      <ArrowRight size={15} color="var(--chakra-colors-text-secondary)" />
      <Text fontSize="xs" fontWeight="700" noOfLines={1}>
        {text}
      </Text>
    </Flex>
  );
}

function StatusLine({
  icon,
  color,
  text,
}: {
  icon: ElementType;
  color: string;
  text: string;
}) {
  return (
    <Flex align="center" gap={2} color={color} minH="28px" px={1}>
      <Icon as={icon} boxSize={4} />
      <Text fontSize="xs">{text}</Text>
    </Flex>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: "present" | "empty";
  label: string;
}) {
  return (
    <Badge
      colorScheme={status === "present" ? "green" : "gray"}
      variant={status === "present" ? "subtle" : "outline"}
      flexShrink={0}
    >
      {label}
    </Badge>
  );
}

function CostStat({
  label,
  value,
  strong,
}: {
  label: string;
  value: bigint;
  strong?: boolean;
}) {
  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor={BORDER_FAINT}
      bg={strong ? "rgba(34,197,94,0.06)" : VALUE_BG}
      px={3}
      py={2}
    >
      <Text color="text.tertiary" fontSize="2xs" mb={1}>
        {label}
      </Text>
      <Text
        color="text.primary"
        fontSize="xs"
        fontWeight="700"
        fontFamily="mono"
      >
        {formatEth(value)}
      </Text>
    </Box>
  );
}

function DateStat({
  label,
  seconds,
}: {
  label: string;
  seconds: bigint | null;
}) {
  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor={BORDER_FAINT}
      bg={VALUE_BG}
      px={3}
      py={2}
    >
      <Text color="text.tertiary" fontSize="2xs" mb={1}>
        {label}
      </Text>
      <Text color="text.primary" fontSize="xs" fontWeight="700">
        {seconds ? new Date(Number(seconds) * 1_000).toLocaleDateString() : "-"}
      </Text>
    </Box>
  );
}

function TxLink({ hash, label }: { hash: Hex; label: string }) {
  return (
    <Link href={`${mainnet.blockExplorers.default.url}/tx/${hash}`} isExternal>
      <HStack spacing={1}>
        <Text>{label}</Text>
        <ExternalLink size={14} />
      </HStack>
    </Link>
  );
}

function writeGnsContract({
  functionName,
  args,
  value,
}: {
  functionName:
    | "commit"
    | "reveal"
    | "registerSubdomain"
    | "renew"
    | "setContenthash"
    | "setText"
    | "setPrimaryName";
  args?: readonly unknown[];
  value?: bigint;
}) {
  return writeContract(config, {
    address: GNS_NAME_NFT_ADDRESS,
    abi: gnsNameNftAbi,
    functionName,
    args,
    value,
    chainId: GNS_MAINNET_CHAIN_ID,
  } as any) as Promise<Hex>;
}

async function fetchEnsNameOptions(address: Address): Promise<EnsNameOption[]> {
  const response = await fetch(
    `/api/ens/names?address=${encodeURIComponent(address)}&limit=18`,
    { cache: "no-store" }
  );

  const data = (await response.json()) as {
    names?: EnsNameOption[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Failed to load ENS names");
  }

  return data.names ?? [];
}

function getWriteBlockReason({
  isConnected,
  gweiSnapshot,
}: {
  isConnected: boolean;
  gweiSnapshot: GnsNameSnapshot | null;
}) {
  if (!isConnected) return "Connect wallet to write GNS records.";
  if (!gweiSnapshot) return "Enter a .gwei name first.";
  if (gweiSnapshot.status === "blocked") {
    return (
      gweiSnapshot.blockedReason ||
      "This .gwei name is not active, so it cannot set records."
    );
  }
  if (gweiSnapshot.status === "available") {
    return gweiSnapshot.isSubdomain
      ? "Register this .gwei subdomain before setting records."
      : "Register this .gwei name before setting records.";
  }
  if (gweiSnapshot.status === "grace") {
    return "Renew this .gwei name before setting records.";
  }
  if (!gweiSnapshot.isOwnerConnected) {
    return "Connected wallet is not the .gwei owner, so it cannot set records.";
  }
  return null;
}

function stripSuffix(value: string, suffix: "eth" | "gwei") {
  return value.trim().replace(new RegExp(`\\.${suffix}$`, "i"), "");
}

function formatEth(value: bigint) {
  const formatted = formatEther(value);
  if (!formatted.includes(".")) return formatted;
  return formatted.replace(/\.?0+$/, "");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  ) {
    return error.shortMessage;
  }
  return "Something went wrong";
}
