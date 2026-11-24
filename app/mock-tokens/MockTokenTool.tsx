"use client";

import { useCustomChains } from "@/lib/customChains/store";
import { NetworkSelect } from "@/components/NetworkSelect";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  SimpleGrid,
  Flex,
  HStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Icon,
  IconButton,
  Tooltip,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";
import { formatWithCommas } from "@/utils/formatWithCommas";
import { parseUnits, formatUnits, type Address, type Hex } from "viem";
import {
  buildMockDeployment,
  getMockChains,
  type MockDeployment,
  type MockDraft,
} from "@/lib/mockTokens";

import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Wallet,
  XCircle,
} from "lucide-react";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { MockTokenVerification } from "./MockTokenVerification";
import { MockContractFiles } from "./MockContractFiles";
import { AddressInput } from "@/components/fnParams/inputs/AddressInput";
import { AddressBookButton } from "@/components/AddressBook";
import { IntInput } from "@/components/fnParams/inputs/IntInput";
import { getGroupedNetworkOptions } from "@/data/networks";
import { VERIFICATION_CHAINS } from "@/lib/verification/source";
const standardOptions = ["ERC20", "ERC721", "ERC1155"].map((value) => ({
  value,
  label: value,
}));


export type MockWallet = {
  account?: Address;
  chainId?: number;
  switchChain(chainId: number): Promise<void>;
  submit(deployment: MockDeployment, account: Address): Promise<Hex>;
  receipt(
    chainId: number,
    hash: Hex
  ): Promise<{
    status: "success" | "reverted";
    contractAddress: Address | null;
  }>;
};
type Submission = {
  deployment: MockDeployment;
  chainId: number;
  explorer: string;
  hash?: Hex;
  state: "wallet" | "unknown" | "pending" | "success" | "reverted";
  address?: Address;
};
function isWalletRejection(error: unknown): boolean {
  const seen = new Set<object>();
  let cause = error;
  while (cause && typeof cause === "object" && !seen.has(cause)) {
    seen.add(cause);
    const details = cause as {
      code?: unknown;
      name?: unknown;
      cause?: unknown;
    };
    if (details.code === 4001 || details.name === "UserRejectedRequestError")
      return true;
    cause = details.cause;
  }
  return false;
}

const initial: MockDraft = {
  standard: "ERC20",
  chainId: "11155111",
  name: "Token",
  symbol: "TKN",
  initialSupply: "1000000",
  recipient: "",
  uri: "",
};
export function MockTokenTool({
  wallet,
  walletControl,
}: {
  wallet: MockWallet;
  walletControl?: ReactNode;
}) {
  const [draft, setDraft] = useState(initial);
  const [supplyInvalid, setSupplyInvalid] = useState(false);
  const supplyValue = useMemo(() => {
    try {
      return parseUnits(draft.initialSupply, 18).toString();
    } catch {
      return "";
    }
  }, [draft.initialSupply]);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState<Submission>();
  const receiptRef = useRef(wallet.receipt);
  receiptRef.current = wallet.receipt;
  const lock = useRef(false);
  const mounted = useRef(true);
  const key = JSON.stringify([
    draft,
    wallet.account,
    wallet.chainId,
    supplyInvalid,
  ]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setError("");
  }, [key]);
  useEffect(() => {
    if (submission?.state !== "pending" || !submission.hash) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const { hash, chainId } = submission;
    async function poll() {
      try {
        const receipt = await receiptRef.current(chainId, hash!);
        if (!cancelled) {
          setSubmission((current) =>
            current?.hash === hash && current.state === "pending"
              ? {
                  ...current,
                  state: receipt.status,
                  address: receipt.contractAddress ?? undefined,
                }
              : current
          );
        }
      } catch {
        if (!cancelled) timer = setTimeout(poll, 3000);
      }
    }
    timer = setTimeout(poll, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [submission?.hash, submission?.chainId, submission?.state]);
  const savedChains = useCustomChains();
  const networkOptions = getGroupedNetworkOptions(getMockChains(), true).map((group) => ({
  ...group, options: group.options.map((option) => ({ ...option, value: String(option.value) })),
}));
  const selected = getMockChains().find((c) => String(c.id) === draft.chainId);
  const needsChainSwitch = Boolean(
    selected && wallet.account && wallet.chainId !== selected.id
  );
  async function switchChain() {
    if (lock.current || !selected || !wallet.account) return;
    lock.current = true;
    setSwitching(true);
    setError("");
    try {
      await wallet.switchChain(selected.id);
    } catch {
      if (mounted.current)
        setError("Chain switch failed. Try again in your wallet.");
    } finally {
      lock.current = false;
      if (mounted.current) setSwitching(false);
    }
  }
  function edit(field: keyof MockDraft, value: string) {
    if (field === "standard") setSupplyInvalid(false);
    setDraft((d) => ({ ...d, [field]: value }));
  }
  async function submit() {
    if (
      lock.current ||
      submission ||
      (draft.standard === "ERC20" && supplyInvalid)
    )
      return;
    let deployment: MockDeployment;
    const account = wallet.account;
    try {
      deployment = buildMockDeployment(draft);
      if (!account || wallet.chainId !== deployment.chain.id)
        throw new Error("Connect your wallet on the selected network.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Check the token details."
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    const record: Submission = {
      deployment,
      chainId: deployment.chain.id,
      explorer: deployment.chain.blockExplorers?.default.url ?? "",
      state: "unknown",
    };
    setSubmission({ ...record, state: "wallet" });
    try {
      const hash = await wallet.submit(deployment, account);
      if (mounted.current) setSubmission({ ...record, hash, state: "pending" });
    } catch (error) {
      if (mounted.current) {
        if (isWalletRejection(error)) {
          setSubmission(undefined);
          setError("Transaction rejected.");
        } else {
          setSubmission(record);
          setError(
            "No transaction hash returned. Check your wallet and explorer before trying again."
          );
        }
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const standardIndex = standardOptions.findIndex(
    (option) => option.value === draft.standard
  );
  const tokenName = draft.name.trim() || "…";
  const tokenSymbol = draft.symbol.trim() || "…";
  const formDisabled = busy || switching || Boolean(submission);
  const fields = (
    <Box as="fieldset" disabled={formDisabled} border={0} p={0} minW={0}>
      <Stack spacing={6}>
        <Box>
          {draft.standard !== "ERC1155" && (
            <Text fontSize="sm" color="text.secondary" mb={5}>
              {draft.standard === "ERC20"
                ? "Fungible tokens with 18 decimals."
                : "Unique NFTs with individual token IDs."}
            </Text>
          )}
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            <FormControl minW={0}>
              <FormLabel htmlFor="mock-name" fontSize="sm">
                Name
              </FormLabel>
              <Input
                id="mock-name"
                h={10}
                fontSize="sm"
                minW={0}
                maxLength={64}
                value={draft.name}
                onChange={(event) => edit("name", event.target.value)}
                autoComplete="off"
              />
            </FormControl>
            <FormControl minW={0}>
              <FormLabel htmlFor="mock-symbol" fontSize="sm">
                Symbol
              </FormLabel>
              <Input
                id="mock-symbol"
                h={10}
                fontSize="sm"
                minW={0}
                maxLength={16}
                value={draft.symbol}
                onChange={(event) => edit("symbol", event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </FormControl>
          </SimpleGrid>
        </Box>
        {draft.standard === "ERC20" ? (
          <>
            <FormControl>
              <IntInput
                input={{ name: "Initial supply", type: "uint256" }}
                id="mock-supply"
                aria-label="Initial supply"
                h={10}
                fontSize="sm"
                inputMode="decimal"
                fontFamily="mono"
                maxLength={100}
                defaultEthFormatIndex={1}
                value={supplyValue}
                isDisabled={formDisabled}
                onValidationChange={setSupplyInvalid}
                setFunctionIsDisabled={setSupplyInvalid}
                onChange={(event) => {
                  try {
                    const raw = BigInt(event.target.value);
                    edit("initialSupply", formatUnits(raw, 18));
                  } catch {
                    edit("initialSupply", "");
                  }
                }}
              />
            </FormControl>
            <FormControl>
              <AddressInput
                input={{ name: "Initial recipient", type: "address" }}
                chainId={selected?.id ?? 1}
                id="mock-recipient"
                aria-label="Initial recipient"
                h={10}
                fontSize="sm"
                fontFamily="mono"
                placeholder="0x… or name.eth"
                value={draft.recipient}
                onChange={(event) => edit("recipient", event.target.value)}
                isDisabled={formDisabled}
                hideQuickFillButtons
                autoComplete="off"
                spellCheck={false}
                labelAction={
                  <HStack spacing={1}>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      leftIcon={<Wallet size={13} />}
                      isDisabled={!wallet.account || formDisabled}
                      onClick={() => edit("recipient", wallet.account ?? "")}
                    >
                      Use my wallet
                    </Button>
                    <AddressBookButton
                      isDisabled={formDisabled}
                      onSelect={(address) => {
                        if (!formDisabled) edit("recipient", address);
                      }}
                    />
                  </HStack>
                }
              />
            </FormControl>
          </>
        ) : (
          <FormControl>
            <FormLabel htmlFor="mock-uri" fontSize="sm">
              {draft.standard === "ERC721"
                ? "Base metadata URI"
                : "Metadata URI template"}{" "}
              <Box as="span" color="text.tertiary" fontWeight="normal">
                (optional)
              </Box>
            </FormLabel>
            <Input
              id="mock-uri"
              h={10}
              fontSize="sm"
              maxLength={512}
              placeholder={
                draft.standard === "ERC721"
                  ? "ipfs://collection/"
                  : "ipfs://collection/{id}.json"
              }
              value={draft.uri}
              onChange={(event) => edit("uri", event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <Text fontSize="xs" color="text.tertiary" mt={2}>
              {draft.standard === "ERC721"
                ? "Token IDs are appended to this URI."
                : "Use {id} for the token ID."}
            </Text>
          </FormControl>
        )}
      </Stack>
    </Box>
  );
  return (
    <Box maxW="1100px" mx="auto" minW={0}>
      <Flex
        align={{ base: "flex-start", sm: "center" }}
        justify="space-between"
        gap={4}
        flexWrap="wrap"
        mb={7}
      >
        <Box>
          <Heading
            as="h1"
            fontSize={{ base: "2xl", md: "3xl" }}
            fontWeight="semibold"
            letterSpacing="tight"
          >
            Deploy mock tokens
          </Heading>
          <Text fontSize="sm" color="text.secondary" mt={2}>
            Create permissionless tokens for testing.
          </Text>
        </Box>
        {walletControl}
      </Flex>
      <SimpleGrid
        columns={{ base: 1, lg: 2 }}
        templateColumns={{ lg: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
        gap={6}
        alignItems="start"
      >
        <Stack spacing={5} minW={0}>
          <Box
            bg="bg.subtle"
            borderWidth="1px"
            borderColor="border.default"
            rounded="lg"
            overflow="hidden"
            minW={0}
          >
            <Tabs
              index={standardIndex}
              onChange={(index) =>
                edit("standard", standardOptions[index].value)
              }
              variant="unstyled"
            >
              <TabList
                aria-label="Token standard"
                gap={1}
                p={3}
                borderBottomWidth="1px"
                borderColor="border.default"
              >
                {standardOptions.map((option) => (
                  <Tab
                    key={option.value}
                    isDisabled={formDisabled}
                    flex={1}
                    h={10}
                    px={3}
                    fontSize="sm"
                    fontWeight="medium"
                    rounded="md"
                    color="text.secondary"
                    _selected={{ bg: "bg.muted", color: "text.primary" }}
                    _hover={{ color: "text.primary" }}
                    _focusVisible={{ boxShadow: "outline" }}
                  >
                    {option.label}
                  </Tab>
                ))}
              </TabList>
              <TabPanels>
                {standardOptions.map((option, index) => (
                  <TabPanel key={option.value} p={{ base: 4, md: 6 }}>
                    {index === standardIndex ? fields : null}
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </Box>
        </Stack>
        <Box
          bg="bg.subtle"
          borderWidth="1px"
          borderColor="border.default"
          rounded="lg"
          p={{ base: 4, md: 6 }}
          minW={0}
        >
          <Heading as="h2" fontSize="md" fontWeight="semibold" mb={5}>
            Deployment
          </Heading>
          <FormControl>
            <FormLabel fontSize="sm">Deployment network</FormLabel>
            <NetworkSelect
              ariaLabel="Deployment network"
              options={networkOptions}
              placeholder="Select network"
              selectedOption={
                networkOptions
                  .flatMap((group) => group.options)
                  .find((option) => option.value === draft.chainId) ?? null
              }
              setSelectedOption={(option) => {
                if (option) edit("chainId", String(option.value));
              }}
              isDisabled={formDisabled}
              boxProps={{ w: "full", minW: 0 }}
              controlProps={{ h: 10, minH: 10, fontSize: "sm" }}
            />
          </FormControl>
          <Box
            py={5}
            my={5}
            borderTopWidth="1px"
            borderBottomWidth="1px"
            borderColor="border.default"
          >
            <Text fontSize="lg" fontWeight="semibold" overflowWrap="anywhere">
              {tokenName} ({tokenSymbol})
            </Text>
            <HStack justify="space-between" mt={4} fontSize="sm">
              <Text color="text.secondary">Standard</Text>
              <Text>{draft.standard}</Text>
            </HStack>
            <HStack justify="space-between" mt={2} fontSize="sm" align="start">
              <Text color="text.secondary">
                {draft.standard === "ERC20"
                  ? "Initial supply"
                  : "Initial NFT supply"}
              </Text>
              <Text
                fontFamily="mono"
                textAlign="right"
                minW={0}
                overflowWrap="anywhere"
              >
                {formatWithCommas(
                  draft.standard === "ERC20" ? draft.initialSupply || "0" : "0"
                )}
              </Text>
            </HStack>
            {!submission && (
              <Text
                fontSize="xs"
                color="text.secondary"
                textAlign="center"
                mt={5}
              >
                <Box as="span" mr={2} aria-hidden="true">
                  ⚠️
                </Box>
                Anyone can mint these test tokens.
              </Text>
            )}
          </Box>
          {!submission && (
            <Stack spacing={4}>
              {!wallet.account && (
                <Text fontSize="sm" color="text.secondary">
                  Connect a wallet to deploy.
                </Text>
              )}
              <Button
                onClick={needsChainSwitch ? switchChain : submit}
                isLoading={busy || switching}
                loadingText={switching ? "Switching" : "Deploying"}
                isDisabled={
                  !wallet.account ||
                  !selected ||
                  (!needsChainSwitch &&
                    draft.standard === "ERC20" &&
                    supplyInvalid)
                }
                colorScheme="blue"
                variant="solid"
                h={10}
                w="full"
              >
                {needsChainSwitch ? "Switch Chain" : "Deploy"}
              </Button>
            </Stack>
          )}
          {error && (
            <Alert
              status="error"
              role="alert"
              rounded="md"
              mt={4}
              fontSize="sm"
            >
              <AlertIcon />
              <Text overflowWrap="anywhere">{error}</Text>
            </Alert>
          )}
          {submission && (
            <Stack role="status" spacing={3}>
              <HStack align="center" spacing={2}>
                {submission.state === "wallet" ||
                submission.state === "pending" ? (
                  <Spinner size="sm" color="blue.300" flexShrink={0} />
                ) : (
                  <Icon
                    as={
                      submission.state === "success"
                        ? CheckCircle2
                        : submission.state === "reverted"
                          ? XCircle
                          : Clock3
                    }
                    boxSize={5}
                    color={
                      submission.state === "success"
                        ? "green.300"
                        : submission.state === "reverted"
                          ? "red.300"
                          : "text.secondary"
                    }
                    flexShrink={0}
                  />
                )}
                <Heading as="h3" fontSize="md" lineHeight="short">
                  {submission.state === "wallet"
                    ? "Awaiting wallet confirmation"
                    : submission.state === "success"
                      ? "Deployment confirmed"
                      : submission.state === "reverted"
                        ? "Deployment reverted"
                        : submission.state === "pending"
                          ? "Transaction submitted"
                          : "Check wallet status"}
                </Heading>
                {submission.hash && (
                  <Tooltip label="Open transaction explorer">
                    <IconButton
                      as={Link}
                      href={`${submission.explorer}/tx/${submission.hash}`}
                      isExternal
                      aria-label="Open transaction explorer"
                      icon={<ArrowUpRight size={16} />}
                      size="xs"
                      variant="ghost"
                      color="text.secondary"
                    />
                  </Tooltip>
                )}
              </HStack>
              {submission.state === "pending" && (
                <Text fontSize="xs" color="text.secondary">
                  Waiting for confirmation…
                </Text>
              )}
              {submission.state === "success" && submission.address && (
                <Box
                  py={4}
                  borderTopWidth="1px"
                  borderBottomWidth="1px"
                  borderColor="border.default"
                >
                  <Flex justify="space-between" align="center" gap={2} mb={2}>
                    <Text fontSize="xs" color="text.secondary" flexShrink={0}>
                      Contract address
                    </Text>
                    <Link
                      href={`${getPath(subdomains.CONTRACT.base)}${submission.chainId}/${submission.address}`}
                      isExternal
                      fontSize="xs"
                      color="blue.300"
                      display="inline-flex"
                      alignItems="center"
                      gap={1}
                    >
                      Interact with the contract
                      <ArrowUpRight size={14} />
                    </Link>
                  </Flex>
                  <HStack minW={0}>
                    <Text
                      fontFamily="mono"
                      fontSize="sm"
                      overflowWrap="anywhere"
                      minW={0}
                    >
                      {submission.address}
                    </Text>
                    <CopyToClipboard
                      textToCopy={submission.address}
                      size="xs"
                    />
                    <Tooltip label="Open contract on block explorer">
                      <IconButton
                        as={Link}
                        href={`${submission.explorer}/address/${submission.address}`}
                        isExternal
                        aria-label="Open contract on block explorer"
                        icon={<ArrowUpRight size={16} />}
                        size="xs"
                        variant="ghost"
                        color="text.secondary"
                      />
                    </Tooltip>
                  </HStack>
                </Box>
              )}
              {submission.state === "success" &&
                submission.address &&
                submission.hash && (
                  <Stack spacing={1}>
                    {VERIFICATION_CHAINS[String(submission.chainId)]
                      ?.sourcify && (
                      <MockTokenVerification
                        key={`${submission.chainId}:${submission.address}:${submission.hash}`}
                        deployment={submission.deployment}
                        address={submission.address}
                        hash={submission.hash}
                      />
                    )}
                    {VERIFICATION_CHAINS[String(submission.chainId)]
                      ?.etherscan && (
                      <MockTokenVerification
                        provider="etherscan"
                        key={`etherscan:${submission.chainId}:${submission.address}:${submission.hash}`}
                        deployment={submission.deployment}
                        address={submission.address}
                        hash={submission.hash}
                      />
                    )}
                  </Stack>
                )}
              {!busy &&
                submission.state !== "wallet" &&
                submission.state !== "pending" && (
                  <Button
                    alignSelf="center"
                    size="sm"
                    variant="outline"
                    color="text.primary"
                    bg="whiteAlpha.50"
                    borderColor="border.default"
                    _hover={{
                      bg: "whiteAlpha.100",
                      borderColor: "whiteAlpha.400",
                    }}
                    whiteSpace="normal"
                    height="auto"
                    minH="36px"
                    mt={2}
                    px={3}
                    py={2}
                    onClick={() => {
                      setSubmission(undefined);
                      setError("");
                    }}
                  >
                    Start another deployment
                  </Button>
                )}
            </Stack>
          )}
        </Box>
      </SimpleGrid>
      <MockContractFiles
        standard={submission?.deployment.standard ?? draft.standard}
      />
    </Box>
  );
}
