"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Code,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";
import { formatUnits, type Address, type Hex } from "viem";
import { MOCK_ARTIFACTS } from "@/lib/mockTokens.generated";
import {
  assertReviewReady,
  buildMockDeployment,
  maximumCost,
  MOCK_CHAINS,
  type MockDeployment,
  type MockDraft,
  type MockEstimate,
} from "@/lib/mockTokens";

export type MockWallet = {
  account?: Address;
  chainId?: number;
  estimate(deployment: MockDeployment, account: Address): Promise<MockEstimate>;
  submit(
    deployment: MockDeployment,
    estimate: MockEstimate,
    account: Address
  ): Promise<Hex>;
  receipt(
    chainId: number,
    hash: Hex
  ): Promise<{
    status: "success" | "reverted";
    contractAddress: Address | null;
  }>;
};
type Review = {
  deployment: MockDeployment;
  estimate: MockEstimate;
  account: Address;
  key: string;
};
type Submission = {
  deployment: MockDeployment;
  chainId: number;
  explorer: string;
  hash?: Hex;
  state: "wallet" | "unknown" | "pending" | "success" | "reverted";
  address?: Address;
};
const initial: MockDraft = {
  standard: "ERC20",
  chainId: "",
  name: "Token",
  symbol: "TKN",
  initialSupply: "0",
  recipient: "",
  uri: "",
};
export function MockTokenTool({ wallet }: { wallet: MockWallet }) {
  const [draft, setDraft] = useState(initial);
  const [review, setReview] = useState<Review>();
  const [consent, setConsent] = useState(false);
  const [mainnetConsent, setMainnetConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState<Submission>();
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const key = JSON.stringify([draft, wallet.account, wallet.chainId]);
  const latest = useRef(key);
  latest.current = key;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setReview(undefined);
    setConsent(false);
    setMainnetConsent(false);
    setError("");
  }, [key]);
  useEffect(() => {
    if (!review) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [review]);
  const current = review?.key === key ? review : undefined;
  const expired = current ? now - current.estimate.createdAt > 60_000 : false;
  const insufficient = current
    ? maximumCost(current.estimate) > current.estimate.balance
    : false;
  const selected = MOCK_CHAINS.find((c) => String(c.id) === draft.chainId);
  function edit(field: keyof MockDraft, value: string) {
    generation.current++;
    setDraft((d) => ({ ...d, [field]: value }));
  }
  async function estimate() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setReview(undefined);
    setConsent(false);
    setMainnetConsent(false);
    const token = ++generation.current;
    try {
      const deployment = buildMockDeployment(draft);
      if (!wallet.account || wallet.chainId !== deployment.chain.id)
        throw new Error(
          "Connect your wallet on the selected network before estimating. Network changes are never automatic."
        );
      const estimate = await wallet.estimate(deployment, wallet.account);
      if (
        mounted.current &&
        token === generation.current &&
        latest.current === key
      ) {
        setNow(Date.now());
        setReview({ deployment, estimate, account: wallet.account, key });
      }
    } catch (e) {
      if (mounted.current && token === generation.current)
        setError(
          e instanceof Error
            ? e.message
            : "Gas estimation failed. Nothing was submitted."
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function submit() {
    if (lock.current || !current || submission) return;
    try {
      assertReviewReady(
        current.deployment,
        current.estimate,
        current.account,
        wallet.account,
        wallet.chainId,
        consent,
        mainnetConsent
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review again.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    const record: Submission = {
      deployment: current.deployment,
      chainId: current.deployment.chain.id,
      explorer: current.deployment.chain.blockExplorers.default.url,
      state: "unknown",
    };
    // Consume review before opening the wallet. Never replay an ambiguous send.
    setReview(undefined);
    setConsent(false);
    setMainnetConsent(false);
    setSubmission({ ...record, state: "wallet" });
    try {
      const hash = await wallet.submit(
        current.deployment,
        current.estimate,
        current.account
      );
      if (mounted.current) setSubmission({ ...record, hash, state: "pending" });
    } catch {
      if (mounted.current) {
        setSubmission(record);
        setError(
          "Wallet request did not return a transaction hash. It may have been rejected, or delivery may be uncertain. Check your wallet and explorer before starting another deployment; do not blindly retry."
        );
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function checkReceipt() {
    if (lock.current || !submission?.hash) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const receipt = await wallet.receipt(submission.chainId, submission.hash);
      if (mounted.current)
        setSubmission({
          ...submission,
          state: receipt.status,
          address: receipt.contractAddress ?? undefined,
        });
    } catch {
      if (mounted.current)
        setError(
          "Receipt not available yet or RPC unavailable. Check again or open the transaction explorer. No transaction was resent."
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Stack spacing={5} maxW="850px" mx="auto" minW={0}>
      <Heading as="h1" size="lg">
        Deploy mock tokens
      </Heading>
      <Alert status="warning" alignItems="start">
        <AlertIcon />
        <Text>
          MOCK ONLY — anyone can mint unlimited tokens to anyone. These tokens
          have no backing or promised value. Contracts and parameters are public
          and permanent, even on mainnet. Never use them as real assets.
        </Text>
      </Alert>
      <Text>
        OpenZeppelin Contracts 5.0.2 with small permissionless-mint wrappers,
        compiled with Solidity 0.8.28 for Paris EVM. No owner, upgrade, fee,
        faucet limit or access control. Not an independent security audit.
      </Text>
      <Box
        as="fieldset"
        disabled={busy || !!submission}
        minW={0}
        border={0}
        p={0}
      >
        <Stack spacing={4}>
          <FormControl>
            <FormLabel htmlFor="mock-standard">Token standard</FormLabel>
            <Select
              id="mock-standard"
              value={draft.standard}
              onChange={(e) => edit("standard", e.target.value)}
            >
              {["ERC20", "ERC721", "ERC1155"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="mock-chain">Deployment network</FormLabel>
            <Select
              id="mock-chain"
              value={draft.chainId}
              onChange={(e) => edit("chainId", e.target.value)}
            >
              <option value="">Choose a network — no default</option>
              {[true, false].map((testnet) => (
                <optgroup
                  key={String(testnet)}
                  label={
                    testnet
                      ? "Testnets — test funds"
                      : "Mainnets — real gas costs"
                  }
                >
                  {MOCK_CHAINS.filter((c) => !!c.testnet === testnet).map(
                    (c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.id} ·{" "}
                        {testnet ? "TESTNET" : "MAINNET / REAL GAS"}
                      </option>
                    )
                  )}
                </optgroup>
              ))}
            </Select>
          </FormControl>
          {selected && !selected.testnet && (
            <Alert status="error">
              <AlertIcon />
              MAINNET: deploying spends real {
                selected.nativeCurrency.symbol
              }{" "}
              and permanently publishes a mock contract.
            </Alert>
          )}
          {draft.standard !== "ERC1155" && (
            <>
              <FormControl>
                <FormLabel htmlFor="mock-name">
                  Name suffix (MOCK prefix enforced onchain)
                </FormLabel>
                <Input
                  id="mock-name"
                  maxLength={64}
                  value={draft.name}
                  onChange={(e) => edit("name", e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="mock-symbol">
                  Symbol suffix (MOCK_ prefix enforced onchain)
                </FormLabel>
                <Input
                  id="mock-symbol"
                  maxLength={16}
                  value={draft.symbol}
                  onChange={(e) => edit("symbol", e.target.value)}
                />
              </FormControl>
            </>
          )}
          {draft.standard === "ERC20" ? (
            <>
              <FormControl>
                <FormLabel htmlFor="mock-supply">
                  Initial supply (whole tokens, 18 decimals)
                </FormLabel>
                <Input
                  id="mock-supply"
                  inputMode="decimal"
                  maxLength={100}
                  value={draft.initialSupply}
                  onChange={(e) => edit("initialSupply", e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="mock-recipient">
                  Initial recipient
                </FormLabel>
                <Input
                  id="mock-recipient"
                  placeholder="0x… (no ENS lookup)"
                  value={draft.recipient}
                  onChange={(e) => edit("recipient", e.target.value)}
                />
                <Button
                  mt={2}
                  size="sm"
                  isDisabled={!wallet.account}
                  onClick={() => edit("recipient", wallet.account ?? "")}
                >
                  Use connected wallet as recipient
                </Button>
              </FormControl>
            </>
          ) : (
            <FormControl>
              <FormLabel htmlFor="mock-uri">
                {draft.standard === "ERC721"
                  ? "Base metadata URI (token ID is appended)"
                  : "Metadata URI template (optional {id} placeholder)"}
              </FormLabel>
              <Input
                id="mock-uri"
                maxLength={512}
                placeholder="Optional ipfs://… or https://…"
                value={draft.uri}
                onChange={(e) => edit("uri", e.target.value)}
              />
              <Text fontSize="sm" mt={1}>
                No initial NFTs are minted. URI is public and immutable;
                external content may change and is not fetched or verified here.
                ERC1155 ID substitution uses 64 lowercase hex digits.
              </Text>
            </FormControl>
          )}
        </Stack>
      </Box>
      {!wallet.account && (
        <Text>
          Connect a wallet using the site wallet button, then select its network
          explicitly.
        </Text>
      )}
      {selected && wallet.account && wallet.chainId !== selected.id && (
        <Alert status="info">
          <AlertIcon />
          Wallet is on chain {wallet.chainId ?? "unknown"}. Switch it to{" "}
          {selected.name} ({selected.id}) yourself; this tool never switches
          networks automatically.
        </Alert>
      )}
      {!submission && (
        <Button
          onClick={estimate}
          isLoading={busy}
          isDisabled={
            !wallet.account || !selected || wallet.chainId !== selected.id
          }
        >
          Estimate &amp; review deployment
        </Button>
      )}
      {error && (
        <Alert status="error" role="alert">
          <AlertIcon />
          <Text overflowWrap="anywhere">{error}</Text>
        </Alert>
      )}
      {current && (
        <Box
          borderWidth="1px"
          borderRadius="lg"
          p={{ base: 3, md: 5 }}
          minW={0}
        >
          <Stack spacing={3}>
            <Heading as="h2" size="md">
              Review mock deployment
            </Heading>
            <Text fontWeight="bold">
              {current.deployment.chain.name} · chain{" "}
              {current.deployment.chain.id} ·{" "}
              {current.deployment.chain.testnet
                ? "TESTNET"
                : "MAINNET — REAL GAS"}
            </Text>
            <Text>
              {current.deployment.standard} ·{" "}
              <strong>{current.deployment.name}</strong> ·{" "}
              {current.deployment.symbol}
            </Text>
            <Text overflowWrap="anywhere">
              Deployer / gas payer: {current.account}
            </Text>
            {current.deployment.standard === "ERC20" ? (
              <>
                <Text>
                  Decimals: 18 · initial supply:{" "}
                  {formatUnits(current.deployment.args[3] as bigint, 18)} tokens
                </Text>
                <Text overflowWrap="anywhere">
                  Initial recipient: {String(current.deployment.args[2])}
                </Text>
              </>
            ) : (
              <Text overflowWrap="anywhere">
                Metadata URI:{" "}
                {String(current.deployment.args.at(-1)) || "(empty)"} · initial
                NFT supply: 0
              </Text>
            )}
            <Text>
              Native value transferred to contract: 0. Gas limit:{" "}
              {current.estimate.gas.toString()} (20% estimate buffer). Max fee:{" "}
              {formatUnits(current.estimate.maxFeePerGas, 9)} gwei; priority
              fee: {formatUnits(current.estimate.maxPriorityFeePerGas, 9)} gwei.
            </Text>
            <Text fontWeight="bold">
              Maximum reviewed execution gas cost:{" "}
              {formatUnits(
                maximumCost(current.estimate),
                current.deployment.chain.nativeCurrency.decimals
              )}{" "}
              {current.deployment.chain.nativeCurrency.symbol}
            </Text>
            <Text fontSize="sm">
              Not a total-fee guarantee: L2 data / L1 publication or other
              network fees may be additional. Fees fluctuate; the wallet shows
              the final total before you approve. Nothing is sponsored. Review
              expires after 60 seconds.
            </Text>
            {expired && (
              <Alert status="warning">
                <AlertIcon />
                Gas review expired. Estimate again.
              </Alert>
            )}
            {insufficient && (
              <Alert status="error">
                <AlertIcon />
                Insufficient native balance for the reviewed execution cost.
              </Alert>
            )}
            <Box as="details">
              <Box as="summary" cursor="pointer">
                Inspect exact deployment bytecode &amp; constructor arguments
              </Box>
              <Code
                display="block"
                whiteSpace="pre-wrap"
                overflowWrap="anywhere"
                maxH="240px"
                overflowY="auto"
                p={2}
              >
                {JSON.stringify(
                  current.deployment.args,
                  (_, v) => (typeof v === "bigint" ? v.toString() : v),
                  2
                )}
                {"\n"}
                {current.deployment.data}
              </Code>
            </Box>
            <Checkbox
              isChecked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            >
              I understand this public, permanent mock can be minted by anyone,
              has no promised value and requires gas.
            </Checkbox>
            {!current.deployment.chain.testnet && (
              <Checkbox
                isChecked={mainnetConsent}
                onChange={(e) => setMainnetConsent(e.target.checked)}
              >
                I explicitly choose MAINNET and accept spending real native
                currency on gas.
              </Checkbox>
            )}
            <Button
              colorScheme="orange"
              onClick={submit}
              isDisabled={
                busy ||
                expired ||
                insufficient ||
                !consent ||
                (!current.deployment.chain.testnet && !mainnetConsent)
              }
            >
              Confirm in wallet
            </Button>
          </Stack>
        </Box>
      )}
      {submission && (
        <Box
          role="status"
          borderWidth="1px"
          borderRadius="lg"
          p={4}
          overflowWrap="anywhere"
        >
          <Stack spacing={3}>
            <Heading as="h2" size="md">
              {submission.state === "wallet"
                ? "Awaiting wallet confirmation"
                : submission.state === "success"
                  ? "Deployment confirmed"
                  : submission.state === "reverted"
                    ? "Deployment reverted — gas may have been spent"
                    : submission.state === "pending"
                      ? "Transaction submitted — not yet confirmed"
                      : "Wallet request outcome uncertain"}
            </Heading>
            <Text>
              Network:{" "}
              {MOCK_CHAINS.find((c) => c.id === submission.chainId)?.name} ·
              chain {submission.chainId}. Keep the transaction hash; progress is
              not stored across refreshes.
            </Text>
            {submission.hash && (
              <>
                <Text>Transaction: {submission.hash}</Text>
                <Link
                  color="blue.300"
                  href={`${submission.explorer}/tx/${submission.hash}`}
                  isExternal
                >
                  Open transaction explorer
                </Link>
                {submission.state === "pending" && (
                  <Button onClick={checkReceipt} isLoading={busy}>
                    Check receipt
                  </Button>
                )}
              </>
            )}
            {submission.state === "success" && submission.address && (
              <>
                <Text>Mock contract: {submission.address}</Text>
                <Link
                  color="blue.300"
                  href={`https://explorer.eth.sh/${submission.chainId}/${submission.address}`}
                  isExternal
                >
                  Open deployed mock in explorer
                </Link>
                <Text fontSize="sm">
                  Automatic source verification is not performed. Download the
                  exact standard JSON and compiler settings below for manual
                  verification. Mint function:{" "}
                  {submission.deployment.standard === "ERC20"
                    ? "mint(to, amount) — amount is in 18-decimal base units"
                    : submission.deployment.standard === "ERC721"
                      ? "mint(to, tokenId) — unused uint256 ID"
                      : "mint(to, id, amount, data) — base-unit integer amount, data can be 0x"}
                  .
                </Text>
              </>
            )}
            <Box as="details">
              <Box as="summary" cursor="pointer">
                Saved deployment parameters (constructor arguments for
                verification)
              </Box>
              <Code
                display="block"
                whiteSpace="pre-wrap"
                overflowWrap="anywhere"
                maxH="220px"
                overflowY="auto"
              >
                {JSON.stringify(
                  submission.deployment.args,
                  (_, v) => (typeof v === "bigint" ? v.toString() : v),
                  2
                )}
                {"\n"}Constructor arguments hex (without 0x):{" "}
                {submission.deployment.data.slice(
                  submission.deployment.artifact.bytecode.length
                )}
              </Code>
            </Box>
            {!busy && (
              <Button
                variant="outline"
                whiteSpace="normal"
                height="auto"
                minH="44px"
                py={2}
                onClick={() => {
                  setSubmission(undefined);
                  setReview(undefined);
                  setError("");
                  generation.current++;
                }}
              >
                Start another deployment (check wallet first)
              </Button>
            )}
          </Stack>
        </Box>
      )}
      <Text fontSize="sm">
        <Link
          href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify((submission?.deployment.artifact ?? MOCK_ARTIFACTS[draft.standard as keyof typeof MOCK_ARTIFACTS]).abi, null, 2))}`}
          download={`Mock${submission?.deployment.standard ?? draft.standard}.abi.json`}
          color="blue.300"
        >
          Download selected token ABI
        </Link>
        {" · "}
        <Link href="/mock-tokens-standard-input.json" download color="blue.300">
          Download exact compiler standard JSON
        </Link>
        {" · "}
        <Link
          href="https://github.com/OpenZeppelin/openzeppelin-contracts/tree/v5.0.2"
          isExternal
          color="blue.300"
        >
          OpenZeppelin v5.0.2 source
        </Link>
        . Compiler: v0.8.28+commit.7893614a; optimizer 200 runs; Paris; IPFS
        metadata hash. Wrappers are included in the download. No automatic
        verification or metadata fetches.
      </Text>
    </Stack>
  );
}
