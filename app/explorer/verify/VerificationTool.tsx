"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  VERIFICATION_CHAINS,
  VERIFICATION_MESSAGES,
  verificationInput,
  type VerificationReview,
  type VerificationState,
  type VerificationStatus,
} from "@/lib/verification/source";

const states: Record<VerificationState, string> = {
  ready: "Ready for review",
  submitting: "Submission in progress",
  pending: "Pending verification",
  verified: "Verified by Etherscan",
  already_verified: "Already verified on Etherscan",
  failed: "Verification failed",
  unknown: "Delivery uncertain",
};
export function VerificationTool() {
  const [chainId, setChain] = useState("1");
  const [address, setAddress] = useState("");
  const [review, setReview] = useState<VerificationReview>();
  const [status, setStatus] = useState<VerificationStatus>();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  const active = useRef<AbortController | undefined>(undefined);
  const lock = useRef(false);
  useEffect(
    () => () => {
      version.current++;
      active.current?.abort();
    },
    []
  );
  const invalidate = () => {
    version.current++;
    active.current?.abort();
    lock.current = false;
    setReview(undefined);
    setStatus(undefined);
    setConfirmed(false);
    setError("");
    setBusy(false);
  };
  const perform = async (operation: "preview" | "submit" | "status") => {
    if (lock.current) return;
    let input;
    try {
      input = verificationInput(chainId, address.trim());
    } catch {
      setError(VERIFICATION_MESSAGES.INVALID_INPUT);
      return;
    }
    if (operation !== "preview" && !review) return;
    if (operation === "submit" && (!confirmed || status)) return;
    const current = version.current;
    lock.current = true;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    active.current = controller;
    // Keep a checkable handle even if the browser loses the POST response.
    if (operation === "submit")
      setStatus({
        id: review!.id,
        destinationUrl: review!.destinationUrl,
        state: "submitting",
      });
    try {
      const response = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          ...input,
          ...(operation !== "preview" ? { id: review!.id } : {}),
          ...(operation === "submit" ? { confirmed: true } : {}),
        }),
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(25_000),
        ]),
      });
      const body = await response.json();
      if (current !== version.current) return;
      if (!response.ok) {
        const code = body.error?.code as keyof typeof VERIFICATION_MESSAGES;
        setError(
          VERIFICATION_MESSAGES[code] ?? VERIFICATION_MESSAGES.UNAVAILABLE
        );
        if (operation === "submit") {
          if (
            code === "NOT_CONFIGURED" ||
            code === "CONFIRM_REQUIRED" ||
            code === "RATE_LIMITED"
          )
            setStatus(undefined);
          else
            setStatus({
              id: review!.id,
              destinationUrl: review!.destinationUrl,
              state: "unknown",
            });
        }
        return;
      }
      if (operation === "preview") {
        if (
          body.chainId !== input.chainId ||
          body.address.toLowerCase() !== input.address.toLowerCase()
        )
          throw new Error();
        setReview(body);
        setConfirmed(false);
        setStatus(undefined);
      } else {
        if (body.id !== review!.id || !Object.hasOwn(states, body.state))
          throw new Error();
        // Retain our reviewed fixed explorer URL, not a response-controlled redirect/link.
        setStatus({
          id: review!.id,
          destinationUrl: review!.destinationUrl,
          state: body.state,
        });
      }
    } catch {
      if (current === version.current) {
        setError(
          operation === "submit"
            ? VERIFICATION_MESSAGES.UNKNOWN_DELIVERY
            : VERIFICATION_MESSAGES.UNAVAILABLE
        );
        if (operation === "submit")
          setStatus({
            id: review!.id,
            destinationUrl: review!.destinationUrl,
            state: "unknown",
          });
      }
    } finally {
      if (current === version.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <VStack align="stretch" spacing={5} minW={0}>
      <Box>
        <HStack flexWrap="wrap">
          <Heading as="h1" size="lg">
            Cross-explorer verification
          </Heading>
          <Badge>Blockscout → Etherscan</Badge>
        </HStack>
        <Text mt={2} color="text.secondary">
          Import verified Solidity source and compiler settings, review them,
          then explicitly publish to Etherscan for the same chain and address.
          No wallet or on-chain transaction.
        </Text>
      </Box>
      <Box
        as="form"
        onSubmit={(event: React.FormEvent) => {
          event.preventDefault();
          void perform("preview");
        }}
        p={4}
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
      >
        <VStack align="stretch" spacing={3}>
          <FormControl>
            <FormLabel htmlFor="verification-chain">Chain</FormLabel>
            <Select
              id="verification-chain"
              value={chainId}
              isDisabled={!!status}
              onChange={(e) => {
                invalidate();
                setChain(e.target.value);
              }}
            >
              {Object.entries(VERIFICATION_CHAINS).map(([id, chain]) => (
                <option key={id} value={id}>
                  {chain.name}
                  {id === "10" || id === "8453"
                    ? " · Etherscan paid API plan required"
                    : ""}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="verification-address">
              Contract address
            </FormLabel>
            <Input
              id="verification-address"
              value={address}
              isDisabled={!!status}
              onChange={(e) => {
                invalidate();
                setAddress(e.target.value);
              }}
              placeholder="0x…"
              fontFamily="mono"
              maxLength={42}
              autoComplete="off"
              spellCheck={false}
            />
          </FormControl>
          {!status && (
            <Button type="submit" colorScheme="blue" isLoading={busy}>
              Import from Blockscout
            </Button>
          )}
          <Text fontSize="xs" color="text.secondary">
            Import is read-only. Only these fixed Blockscout instances are
            supported. The source explorer is trusted, not independently
            audited. Implementation/twin addresses are never followed.
          </Text>
        </VStack>
      </Box>
      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text overflowWrap="anywhere">{error}</Text>
        </Alert>
      )}
      {review && (
        <Box
          p={4}
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          minW={0}
        >
          <VStack align="stretch" spacing={3}>
            <Heading size="md">Review verification</Heading>
            <Text overflowWrap="anywhere">
              {VERIFICATION_CHAINS[review.chainId].name} · {review.address}
            </Text>
            <Text fontFamily="mono" overflowWrap="anywhere">
              {review.contractName}
            </Text>
            <Text fontFamily="mono" overflowWrap="anywhere">
              {review.compilerVersion}
            </Text>
            <Text>
              {review.files.length} source files · license type{" "}
              {review.licenseType} · review expires{" "}
              {new Date(review.expiresAt).toLocaleTimeString()}
            </Text>
            <HStack flexWrap="wrap">
              <Link color="blue.300" href={review.sourceUrl} isExternal>
                Source on Blockscout
              </Link>
              <Link color="blue.300" href={review.destinationUrl} isExternal>
                Destination on Etherscan
              </Link>
            </HStack>
            {review.partial && (
              <Alert status="warning">
                <AlertIcon />
                <Text>
                  Blockscout reports a partial match. Etherscan will perform its
                  own verification; success is not guaranteed.
                </Text>
              </Alert>
            )}
            <Box as="details">
              <Box as="summary" cursor="pointer">
                Inspect exact standard JSON, files and compiler settings
              </Box>
              <Box
                as="pre"
                mt={2}
                p={3}
                bg="blackAlpha.300"
                maxH="400px"
                overflow="auto"
                fontSize="xs"
                whiteSpace="pre-wrap"
                overflowWrap="anywhere"
              >
                {JSON.stringify(JSON.parse(review.sourceCode), null, 2)}
              </Box>
            </Box>
            <Box as="details">
              <Box as="summary" cursor="pointer">
                Constructor arguments (hex, without 0x)
              </Box>
              <Text
                mt={2}
                fontFamily="mono"
                fontSize="xs"
                overflowWrap="anywhere"
              >
                {review.constructorArguments || "None reported by Blockscout"}
              </Text>
            </Box>
            {!status && (
              <>
                <Checkbox
                  isChecked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                >
                  I confirm public submission of this source and these settings
                  to Etherscan for the chain and address above.
                </Checkbox>
                <Button
                  colorScheme="blue"
                  isDisabled={!confirmed}
                  isLoading={busy}
                  onClick={() => void perform("submit")}
                >
                  Submit to Etherscan
                </Button>
              </>
            )}
            {status && (
              <Box role="status" aria-live="polite">
                <Heading size="sm">{states[status.state]}</Heading>
                {status.state === "failed" && (
                  <Text mt={2}>
                    Etherscan rejected the verification. Check the destination,
                    source files, compiler settings and constructor arguments.
                    Raw provider errors are withheld to protect server
                    credentials.
                  </Text>
                )}
                {status.state === "unknown" && (
                  <Text mt={2}>{VERIFICATION_MESSAGES.UNKNOWN_DELIVERY}</Text>
                )}
                {["pending", "submitting", "unknown"].includes(
                  status.state
                ) && (
                  <Button
                    mt={3}
                    isLoading={busy}
                    onClick={() => void perform("status")}
                  >
                    Check status
                  </Button>
                )}
                <Text mt={3} fontSize="xs">
                  Status is held temporarily on this server instance (up to 24
                  hours), not in your browser storage. A restart, another
                  instance or refreshing this page may lose tracking. Check the
                  destination explorer before starting another review. Never
                  automatically resubmit.
                </Text>
                <Button
                  mt={3}
                  variant="outline"
                  isDisabled={busy}
                  onClick={invalidate}
                >
                  Start another review
                </Button>
              </Box>
            )}
          </VStack>
        </Box>
      )}
      <Text fontSize="sm" color="text.secondary">
        The Etherscan API key is configured privately on the server; do not
        paste a key here. There are no browser-to-Etherscan calls. No automatic
        submission, retries, background polling, cross-chain migration, proxy
        linking or local recompilation. Limits: 200 files, 1 MB compiler input,
        20-second server deadline, 12 requests/minute and one active request per
        server instance. Optimism and Base currently require an Etherscan paid
        API plan; no plan is purchased by this tool.
      </Text>
    </VStack>
  );
}
