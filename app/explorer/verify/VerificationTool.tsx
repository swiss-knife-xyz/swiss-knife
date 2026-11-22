"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Link,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ExternalLinkIcon, WarningIcon } from "@chakra-ui/icons";
import { BrowserVerification } from "@/lib/verification/browser";
import type { ProviderKeys } from "@/lib/verification/providers";
import { DarkSelect } from "@/components/DarkSelect";
import { chainIdToImage } from "@/data/common";
import {
  VERIFICATION_CHAINS,
  VERIFICATION_MESSAGES,
  PROVIDERS,
  providersFor,
  parseExplorerInput,
  verificationInput,
  type VerificationProvider,
  type VerificationReview,
  type VerificationStatus,
  type VerificationState,
} from "@/lib/verification/source";
const states: Record<VerificationState, string> = {
  ready: "Ready",
  submitting: "Submitting…",
  pending: "Verifying…",
  verified: "Verified",
  already_verified: "Already verified",
  failed: "Verification failed",
  unknown: "Check status",
};
const storageKey = "verification:active:v2";
const licenseNames = [
  "None",
  "Unlicense",
  "MIT",
  "GPL-2.0",
  "GPL-3.0",
  "LGPL-2.1",
  "LGPL-3.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "MPL-2.0",
  "OSL-3.0",
  "Apache-2.0",
  "AGPL-3.0",
  "BSL-1.1",
];
const networkOptions = [false, true].map((testnet) => ({
  label: testnet ? "Testnets" : "Mainnets",
  options: Object.entries(VERIFICATION_CHAINS)
    .filter(([, c]) => c.testnet === testnet)
    .sort((a, b) =>
      a[0] === "1" ? -1 : b[0] === "1" ? 1 : a[1].name.localeCompare(b[1].name)
    )
    .map(([value, c]) => ({
      value,
      label: c.name,
      image: chainIdToImage[Number(value)],
    })),
}));
const flatNetworks = networkOptions.flatMap((g) => g.options);
export function VerificationTool() {
  const [chainId, setChain] = useState("1");
  const [address, setAddress] = useState("");
  const [sourceProvider, setSourceProvider] = useState<
    VerificationProvider | "auto"
  >("auto");
  const [differentDeployment, setDifferentDeployment] = useState(false);
  const [targetChainId, setTargetChain] = useState("1");
  const [targetAddress, setTargetAddress] = useState("");
  const [constructorArguments, setConstructorArguments] = useState("");
  const [review, setReview] = useState<VerificationReview>();
  const [status, setStatus] = useState<VerificationStatus>();
  const [selected, setSelected] = useState<VerificationProvider[]>([]);
  const [confirmed, setConfirmed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [apiKeys, setApiKeys] = useState<
    Partial<Record<VerificationProvider, string>>
  >({});
  const version = useRef(0),
    lock = useRef(false),
    active = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(true);
  const browserFlow = useRef<BrowserVerification | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      version.current++;
      active.current?.abort();
    };
  }, []);
  const invalidate = () => {
    version.current++;
    active.current?.abort();
    lock.current = false;
    browserFlow.current = undefined;
    setReview(undefined);
    setStatus(undefined);
    setConfirmed(true);
    setSelected([]);
    setError("");
    setBusy(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* Optional recovery. */
    }
  };
  const available = providersFor(chainId);
  const sourceOptions = [
    { label: "Auto-detect", value: "auto" },
    ...available.map((p) => ({ label: PROVIDERS[p], value: p })),
  ];
  const targets = status?.targets ?? review?.targets ?? [];
  const canSubmit = targets.some(
    (t) =>
      selected.includes(t.provider) && ["ready", "failed"].includes(t.state)
  );
  const inProgress = targets.some((t) =>
    ["pending", "submitting", "unknown"].includes(t.state)
  );
  const request = async (body: object, controller: AbortController) => {
    // Strip keys before the server branch, even if a future caller passes them.
    const { keys: suppliedKeys, ...payload } = body as Record<string, any>;
    const overrides: ProviderKeys = suppliedKeys ?? {};
    const usingOwnKeys = Object.values(overrides).some((key) => !!key);
    if (payload.operation === "preview")
      browserFlow.current = usingOwnKeys
        ? new BrowserVerification(fetch)
        : undefined;
    else if (usingOwnKeys && !browserFlow.current && review) {
      browserFlow.current = new BrowserVerification(fetch);
      browserFlow.current.adopt(review, status);
    }
    if (browserFlow.current) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* Nothing secret is persisted. */
      }
      return browserFlow.current.handle(
        payload,
        overrides,
        AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)])
      );
    }
    const response = await fetch("/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]),
    });
    const data = await response.json();
    if (!response.ok) {
      const code = data.error?.code as keyof typeof VERIFICATION_MESSAGES;
      throw new Error(
        VERIFICATION_MESSAGES[code] ?? VERIFICATION_MESSAGES.UNAVAILABLE
      );
    }
    return data;
  };
  useEffect(() => {
    // Store only the opaque handle and public deployment identity, never keys or
    // source contents. Redis-backed jobs can be resumed on another worker.
    let saved: { id: string; chainId: string; address: string };
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (!saved || !/^[a-f0-9]{64}$/.test(saved.id)) return;
      verificationInput(saved.chainId, saved.address);
    } catch {
      return;
    }
    const controller = new AbortController(),
      current = version.current;
    active.current = controller;
    lock.current = true;
    setBusy(true);
    void request({ operation: "resume", ...saved }, controller)
      .then((data) => {
        if (current !== version.current || !mounted.current) return;
        if (
          data.review?.id !== saved.id ||
          data.review?.chainId !== saved.chainId ||
          data.review?.address.toLowerCase() !== saved.address.toLowerCase()
        )
          throw new Error();
        setChain(saved.chainId);
        setAddress(saved.address);
        setSourceProvider(data.review.sourceProvider);
        setDifferentDeployment(
          (data.review.targetChainId ?? saved.chainId) !== saved.chainId ||
            (data.review.targetAddress ?? saved.address).toLowerCase() !==
              saved.address.toLowerCase()
        );
        setTargetChain(data.review.targetChainId ?? saved.chainId);
        setTargetAddress(data.review.targetAddress ?? saved.address);
        setConstructorArguments(data.review.constructorArguments);
        setReview(data.review);
        setStatus(data.status);
        setSelected(
          (data.status.targets ?? [])
            .filter((t: any) => ["ready", "failed"].includes(t.state))
            .map((t: any) => t.provider)
        );
      })
      .catch(() => {
        if (current === version.current) {
          try {
            localStorage.removeItem(storageKey);
          } catch {}
          setError(
            "Previous verification is unavailable. Import the contract again."
          );
        }
      })
      .finally(() => {
        if (current === version.current) {
          lock.current = false;
          setBusy(false);
        }
      });
    return () => controller.abort();
    // Restore once. Subsequent input changes explicitly discard the handle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    if (operation === "submit" && (!confirmed || !canSubmit)) return;
    const current = version.current,
      controller = new AbortController();
    active.current = controller;
    lock.current = true;
    setBusy(true);
    setError("");
    const credentials = Object.fromEntries(
      Object.entries(apiKeys)
        .filter(([, key]) => !!key?.trim())
        .map(([p, key]) => [p, key!.trim()])
    );
    if (operation === "submit")
      setStatus({
        id: review!.id,
        destinationUrl: review!.destinationUrl,
        state: "submitting",
        targets: targets.map((t) =>
          selected.includes(t.provider) && ["ready", "failed"].includes(t.state)
            ? { ...t, state: "submitting", error: undefined }
            : t
        ),
      });
    try {
      const data = await request(
        {
          operation,
          ...input,
          ...(Object.keys(credentials).length ? { keys: credentials } : {}),
          ...(operation === "preview"
            ? {
                sourceProvider,
                destinations: providersFor(
                  differentDeployment ? targetChainId : chainId
                ),
                ...(differentDeployment
                  ? {
                      targetChainId,
                      targetAddress: targetAddress.trim() || input.address,
                      constructorArguments: constructorArguments.trim(),
                    }
                  : {}),
              }
            : { id: review!.id }),
          ...(operation === "submit"
            ? {
                confirmed: true,
                providers: selected.filter((p) =>
                  targets.some(
                    (t) =>
                      t.provider === p && ["ready", "failed"].includes(t.state)
                  )
                ),
                retry: true,
              }
            : {}),
        },
        controller
      );
      if (current !== version.current) return;
      if (operation === "preview") {
        if (
          data.chainId !== input.chainId ||
          data.address?.toLowerCase() !== input.address.toLowerCase() ||
          !Array.isArray(data.targets)
        )
          throw new Error();
        setReview(data);
        setStatus(undefined);
        setConfirmed(true);
        setSelected(
          data.targets
            .filter((t: any) => t.state === "ready")
            .map((t: any) => t.provider)
        );
        try {
          if (!browserFlow.current)
            localStorage.setItem(
              storageKey,
              JSON.stringify({ id: data.id, ...input })
            );
        } catch {}
      } else {
        if (
          data.id !== review!.id ||
          !Object.hasOwn(states, data.state) ||
          !Array.isArray(data.targets)
        )
          throw new Error();
        setStatus(data);
      }
    } catch (e) {
      if (current !== version.current) return;
      setError(
        e instanceof Error &&
          Object.values(VERIFICATION_MESSAGES).some(
            (message) => message === e.message
          )
          ? e.message
          : operation === "submit"
            ? VERIFICATION_MESSAGES.UNKNOWN_DELIVERY
            : VERIFICATION_MESSAGES.UNAVAILABLE
      );
      if (operation === "submit")
        setStatus({
          id: review!.id,
          destinationUrl: review!.destinationUrl,
          state: "unknown",
          targets: targets.map((t) =>
            selected.includes(t.provider) &&
            ["ready", "failed"].includes(t.state)
              ? { ...t, state: "unknown" }
              : t
          ),
        });
    } finally {
      if (current === version.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  };
  const editable = !status;
  return (
    <VStack align="stretch" spacing={6} minW={0}>
      <Box>
        <Heading
          as="h1"
          fontSize={{ base: "xl", md: "2xl" }}
          fontWeight="semibold"
        >
          Cross-explorer verification
        </Heading>
        <Text mt={2} color="text.secondary" fontSize="sm">
          Bring verified contract source to other explorers.
        </Text>
      </Box>
      <Box
        as="form"
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          void perform("preview");
        }}
        p={{ base: 4, md: 5 }}
        bg="bg.subtle"
        border="1px solid"
        borderColor="border.default"
        rounded="lg"
      >
        <Grid
          templateColumns={{
            base: "minmax(0,1fr)",
            sm: "repeat(2,minmax(0,1fr))",
          }}
          gap={4}
        >
          <FormControl minW={0} gridColumn="1 / -1">
            <FormLabel
              htmlFor="verification-address"
              fontSize="sm"
              color="text.secondary"
            >
              Contract address or explorer URL
            </FormLabel>
            <Input
              id="verification-address"
              name="verification-contract"
              value={address}
              isDisabled={!editable}
              onChange={(e) => {
                invalidate();
                const parsed = parseExplorerInput(e.target.value);
                if (parsed) {
                  setAddress(parsed.address);
                  setChain(parsed.chainId);
                  setSourceProvider(parsed.provider);
                } else setAddress(e.target.value);
              }}
              placeholder="0x… or https://…"
              fontFamily="mono"
              fontSize="sm"
              h={10}
              bg="bg.muted"
              borderColor="border.default"
              rounded="lg"
              maxLength={2048}
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </FormControl>
          <FormControl minW={0}>
            <FormLabel fontSize="sm" color="text.secondary">
              Network
            </FormLabel>
            <DarkSelect
              ariaLabel="Network"
              options={networkOptions}
              selectedOption={
                flatNetworks.find((o) => o.value === chainId) ?? null
              }
              isDisabled={!editable}
              controlProps={{ h: 10, minH: 10, fontSize: "sm" }}
              setSelectedOption={(o) => {
                if (o && o.value !== chainId) {
                  invalidate();
                  setChain(String(o.value));
                  setSourceProvider("auto");
                }
              }}
            />
          </FormControl>
          <FormControl minW={0}>
            <FormLabel fontSize="sm" color="text.secondary">
              Source explorer
            </FormLabel>
            <DarkSelect
              ariaLabel="Source explorer"
              options={sourceOptions}
              selectedOption={
                sourceOptions.find((o) => o.value === sourceProvider) ??
                sourceOptions[0]
              }
              isDisabled={!editable}
              controlProps={{ h: 10, minH: 10, fontSize: "sm" }}
              setSelectedOption={(o) => {
                if (o && o.value !== sourceProvider) {
                  invalidate();
                  setSourceProvider(o.value as VerificationProvider | "auto");
                }
              }}
            />
          </FormControl>
        </Grid>
        <Box mt={3}>
          <Checkbox
            size="sm"
            isChecked={differentDeployment}
            sx={{
              ".chakra-checkbox__control": {
                borderColor: "border.strong",
                "&[data-checked]": {
                  bg: "primary.500",
                  borderColor: "primary.500",
                },
              },
            }}
            isDisabled={!editable}
            onChange={(e) => {
              invalidate();
              setDifferentDeployment(e.target.checked);
              setTargetChain(chainId);
              setTargetAddress("");
              setConstructorArguments("");
            }}
          >
            Different deployment
          </Checkbox>
          {differentDeployment && (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={3}>
              <FormControl minW={0}>
                <FormLabel fontSize="xs">Destination network</FormLabel>
                <DarkSelect
                  ariaLabel="Destination network"
                  options={networkOptions}
                  selectedOption={
                    flatNetworks.find((o) => o.value === targetChainId) ?? null
                  }
                  isDisabled={!editable}
                  controlProps={{ h: 10, minH: 10, fontSize: "sm" }}
                  setSelectedOption={(o) => {
                    if (o) {
                      invalidate();
                      setTargetChain(String(o.value));
                    }
                  }}
                />
              </FormControl>
              <FormControl minW={0}>
                <FormLabel htmlFor="verification-target-address" fontSize="xs">
                  Destination address
                </FormLabel>
                <Input
                  id="verification-target-address"
                  value={targetAddress}
                  onChange={(e) => {
                    invalidate();
                    setTargetAddress(e.target.value);
                  }}
                  isDisabled={!editable}
                  placeholder="Same address"
                  fontFamily="mono"
                  fontSize="sm"
                  maxLength={42}
                  h={10}
                  rounded="lg"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                />
              </FormControl>
              <FormControl minW={0} gridColumn="1 / -1">
                <FormLabel htmlFor="verification-constructor" fontSize="xs">
                  Destination constructor arguments
                </FormLabel>
                <Input
                  id="verification-constructor"
                  value={constructorArguments}
                  onChange={(e) => {
                    invalidate();
                    setConstructorArguments(e.target.value);
                  }}
                  isDisabled={!editable}
                  placeholder="0x (none)"
                  fontFamily="mono"
                  fontSize="sm"
                  maxLength={1024}
                  h={10}
                  rounded="lg"
                  autoComplete="off"
                />
              </FormControl>
            </SimpleGrid>
          )}
        </Box>
        <Box as="details" mt={3}>
          <Box
            as="summary"
            cursor="pointer"
            fontSize="sm"
            color="text.secondary"
          >
            API keys
          </Box>
          <Text fontSize="xs" color="text.secondary" mt={2}>
            Your keys are used to make client-side calls to API endpoints. They
            are not sent to our server.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mt={3}>
            {(
              ["etherscan", "blockscout", "routescan"] as VerificationProvider[]
            ).map((p) => (
              <FormControl key={p}>
                <FormLabel fontSize="xs" htmlFor={`verification-key-${p}`}>
                  {PROVIDERS[p]}
                </FormLabel>
                <Input
                  id={`verification-key-${p}`}
                  aria-label={`${PROVIDERS[p]} API key`}
                  type="password"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  value={apiKeys[p] ?? ""}
                  onChange={(e) =>
                    setApiKeys((k) => ({ ...k, [p]: e.target.value }))
                  }
                  isDisabled={busy}
                  placeholder="Optional API key"
                  maxLength={128}
                  size="sm"
                  rounded="md"
                  bg="bg.muted"
                />
              </FormControl>
            ))}
          </SimpleGrid>
        </Box>
        <Box
          display="flex"
          justifyContent="center"
          mt={4}
          pt={4}
          borderTop="1px solid"
          borderColor="border.default"
        >
          {editable ? (
            <Button
              type="submit"
              size="sm"
              isLoading={busy}
              loadingText="Finding source…"
            >
              Find verified source
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              bg="bg.muted"
              borderColor="border.strong"
              _hover={{ bg: "bg.emphasis" }}
              isDisabled={busy}
              onClick={invalidate}
            >
              Start new verification
            </Button>
          )}
        </Box>
      </Box>
      {error && (
        <Alert
          status="error"
          rounded="md"
          bg="rgba(239,68,68,0.12)"
          color="text.primary"
          fontSize="sm"
        >
          <AlertIcon color="red.300" />
          <Text overflowWrap="anywhere">{error}</Text>
        </Alert>
      )}
      {review && (
        <Box
          p={{ base: 4, md: 5 }}
          border="1px solid"
          borderColor="border.default"
          rounded="lg"
          minW={0}
        >
          <VStack align="stretch" spacing={5}>
            <Box>
              <Heading
                as="h2"
                fontSize="lg"
                fontWeight="semibold"
                overflowWrap="anywhere"
              >
                {review.contractName.split(":").at(-1)}
              </Heading>
              <HStack
                mt={1}
                spacing={2}
                flexWrap="wrap"
                fontSize="sm"
                color="text.secondary"
              >
                <Text>Source:</Text>
                <Link href={review.sourceUrl} isExternal>
                  {review.sourceProvider
                    ? PROVIDERS[review.sourceProvider]
                    : "Blockscout"}{" "}
                  <ExternalLinkIcon mx={1} />
                </Link>
              </HStack>
            </Box>
            {review.implementationAddress && (
              <Box>
                <Text fontSize="xs" color="text.secondary" mb={1}>
                  Proxy implementation
                </Text>
                <HStack gap={3} flexWrap="wrap">
                  <Text
                    fontFamily="mono"
                    fontSize="xs"
                    overflowWrap="anywhere"
                    minW={0}
                  >
                    {review.implementationAddress}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      const nextAddress = review.implementationAddress!;
                      invalidate();
                      setAddress(nextAddress);
                      setSourceProvider("auto");
                      setDifferentDeployment(false);
                      window.scrollTo({
                        top: 0,
                        behavior: window.matchMedia(
                          "(prefers-reduced-motion: reduce)"
                        ).matches
                          ? "auto"
                          : "smooth",
                      });
                    }}
                  >
                    Verify implementation
                  </Button>
                </HStack>
              </Box>
            )}
            <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
              <Box gridColumn={{ base: "1 / -1", md: "auto" }}>
                <Text fontSize="xs" color="text.secondary" mb={1}>
                  Compiler
                </Text>
                <Text fontSize="sm" fontFamily="mono" overflowWrap="anywhere">
                  {review.compilerVersion}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="text.secondary" mb={1}>
                  License
                </Text>
                <Text fontSize="sm">
                  {licenseNames[Number(review.licenseType) - 1] ?? "Unknown"}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="text.secondary" mb={1}>
                  Source files
                </Text>
                <Text fontSize="sm">{review.files.length}</Text>
              </Box>
            </SimpleGrid>
            {review.partial && (
              <Text fontSize="sm" color="text.secondary">
                The source explorer reports a partial match.
              </Text>
            )}
            <Box as="details">
              <Box
                as="summary"
                cursor="pointer"
                fontSize="sm"
                color="text.secondary"
              >
                Source &amp; compiler settings
              </Box>
              <Text
                fontSize="xs"
                fontFamily="mono"
                mt={3}
                overflowWrap="anywhere"
              >
                {review.contractName}
              </Text>
              <Box
                as="pre"
                mt={2}
                p={3}
                bg="bg.subtle"
                rounded="md"
                maxH="360px"
                overflow="auto"
                fontSize="xs"
                whiteSpace="pre-wrap"
                overflowWrap="anywhere"
              >
                {JSON.stringify(JSON.parse(review.sourceCode), null, 2)}
              </Box>
              <Text fontSize="xs" color="text.secondary" mt={3}>
                Constructor arguments
              </Text>
              <Text
                fontSize="xs"
                fontFamily="mono"
                mt={1}
                overflowWrap="anywhere"
              >
                {review.constructorArguments || "None"}
              </Text>
            </Box>
            <Box borderTop="1px solid" borderColor="border.default" pt={4}>
              <Heading as="h3" fontSize="md" mb={3}>
                Destination explorers
              </Heading>
              <VStack
                align="stretch"
                spacing={0}
                role="status"
                aria-live="polite"
              >
                {targets.map((t) => {
                  const selectable = ["ready", "failed"].includes(t.state),
                    success = ["verified", "already_verified"].includes(
                      t.state
                    );
                  const hasError = !!t.error || t.state === "failed";
                  const statusLabel =
                    t.error && t.state !== "failed"
                      ? ["pending", "submitting", "unknown"].includes(t.state)
                        ? "Status unavailable"
                        : "Request failed"
                      : states[t.state];
                  return (
                    <Box
                      key={t.provider}
                      py={3}
                      borderBottom="1px solid"
                      borderColor="border.default"
                    >
                      <HStack justify="space-between" align="center" gap={3}>
                        {success ? (
                          <HStack spacing={2} minW={0}>
                            <Box
                              w={3}
                              flexShrink={0}
                              display="flex"
                              justifyContent="center"
                              aria-hidden="true"
                            >
                              <Box
                                boxSize="5px"
                                rounded="full"
                                bg="text.secondary"
                              />
                            </Box>
                            <Text fontSize="sm">{PROVIDERS[t.provider]}</Text>
                          </HStack>
                        ) : (
                          <Checkbox
                            size="sm"
                            isChecked={selected.includes(t.provider)}
                            isDisabled={!selectable || busy}
                            onChange={(e) =>
                              setSelected((list) =>
                                e.target.checked
                                  ? [
                                      ...list.filter((p) => p !== t.provider),
                                      t.provider,
                                    ]
                                  : list.filter((p) => p !== t.provider)
                              )
                            }
                            sx={{
                              ".chakra-checkbox__label": {
                                color: "text.primary",
                                "&[data-disabled]": { opacity: 1 },
                              },
                              ".chakra-checkbox__control": {
                                borderColor: "border.strong",
                                "&[data-checked]": {
                                  bg: "primary.500",
                                  borderColor: "primary.500",
                                },
                              },
                            }}
                          >
                            {PROVIDERS[t.provider]}
                          </Checkbox>
                        )}
                        <HStack spacing={2} flexShrink={0}>
                          {hasError && (
                            <WarningIcon
                              boxSize={3}
                              color="red.300"
                              aria-hidden="true"
                            />
                          )}
                          <Text
                            fontSize="xs"
                            color={
                              hasError
                                ? "red.300"
                                : success
                                  ? "green.300"
                                  : t.state === "ready"
                                    ? "yellow.300"
                                    : "text.secondary"
                            }
                            fontWeight={hasError ? "medium" : "normal"}
                          >
                            {statusLabel}
                          </Text>
                          {!hasError &&
                            ["pending", "submitting"].includes(t.state) && (
                              <Spinner size="xs" />
                            )}
                          <Link
                            href={t.destinationUrl}
                            isExternal
                            aria-label={`Open ${PROVIDERS[t.provider]}`}
                            color="text.secondary"
                            p={1}
                          >
                            <ExternalLinkIcon />
                          </Link>
                        </HStack>
                      </HStack>
                      {t.error && (
                        <Text
                          mt={2}
                          fontSize="xs"
                          color="red.300"
                          overflowWrap="anywhere"
                        >
                          {VERIFICATION_MESSAGES[t.error]}
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </VStack>
            </Box>
            {canSubmit && (
              <VStack align="stretch" spacing={4}>
                <Checkbox
                  size="sm"
                  isChecked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                >
                  Publish this source and settings to the selected explorers.
                </Checkbox>
                <Box display="flex" justifyContent="center">
                  <Button
                    size="sm"
                    isDisabled={!confirmed}
                    isLoading={busy}
                    loadingText="Submitting…"
                    onClick={() => void perform("submit")}
                  >
                    Verify selected
                  </Button>
                </Box>
              </VStack>
            )}
            {inProgress && (
              <Box display="flex" justifyContent="center">
                <Button
                  size="sm"
                  isLoading={busy}
                  loadingText="Checking…"
                  onClick={() => void perform("status")}
                >
                  Check status
                </Button>
              </Box>
            )}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}
