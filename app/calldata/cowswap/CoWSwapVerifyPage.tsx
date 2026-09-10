"use client";

import React, { useState } from "react";
import {
  Box,
  Heading,
  HStack,
  VStack,
  Text,
  Icon,
  Textarea,
  Alert,
  AlertDescription,
  AlertIcon,
  Link,
  Code,
  Badge,
  SimpleGrid,
  Divider,
  useToast,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiCode,
  FiGlobe,
  FiLayers,
  FiHash,
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiUser,
  FiClock,
  FiRepeat,
  FiCpu,
  FiKey,
  FiPackage,
  FiZap,
} from "react-icons/fi";
import { GiCow } from "react-icons/gi";
import {
  decodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toBytes,
  Hex,
  isHex,
} from "viem";
import { DarkButton } from "@/components/DarkButton";
import { DarkSelect } from "@/components/DarkSelect";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { SelectedOptionState } from "@/types";

const COMPOSABLE_COW = "0xfdaFc9d1902f4e0b84f65F49f244b32b31013b74";
const CREATE_WITH_CONTEXT_SELECTOR = "0x0d0d9800";

// Known TWAP handler address (mainnet/gnosis/arbitrum/base/sepolia share the same address)
const TWAP_HANDLER = "0x6cF1e9cA41f7611dEf408122793c358a3d11E5a5";

const CREATE_WITH_CONTEXT_PARAMS = parseAbiParameters([
  "(address handler, bytes32 salt, bytes staticInput) params, address factory, bytes data, bool dispatch",
]);

const TWAP_DATA_PARAMS = parseAbiParameters([
  "(address sellToken, address buyToken, address receiver, uint256 partSellAmount, uint256 minPartLimit, uint256 t0, uint256 n, uint256 t, uint256 span, bytes32 appData) data",
]);

type CowApiNetwork = {
  label: string;
  value: string;
};

const cowApiNetworks: CowApiNetwork[] = [
  { label: "Ethereum", value: "mainnet" },
  { label: "Gnosis Chain", value: "xdai" },
  { label: "Arbitrum One", value: "arbitrum_one" },
  { label: "Base", value: "base" },
  { label: "Sepolia", value: "sepolia" },
];

type Step1Result = {
  handler: `0x${string}`;
  salt: `0x${string}`;
  staticInput: `0x${string}`;
  factory: `0x${string}`;
  data: `0x${string}`;
  dispatch: boolean;
};

type Step2Result = {
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  receiver: `0x${string}`;
  partSellAmount: bigint;
  minPartLimit: bigint;
  t0: bigint;
  n: bigint;
  t: bigint;
  span: bigint;
  appData: `0x${string}`;
};

type Step3Result =
  | {
      status: "match" | "mismatch";
      fullAppData: string;
      canonical: string;
      computedHash: `0x${string}`;
      onchainHash: `0x${string}`;
    }
  | {
      status: "error";
      message: string;
    };

const startWith0x = (s: string): `0x${string}` =>
  (s.startsWith("0x") ? s : `0x${s}`) as `0x${string}`;

const formatTimestamp = (sec: bigint) => {
  if (sec === 0n) return "0 (immediate)";
  const ms = Number(sec) * 1000;
  if (!Number.isFinite(ms)) return sec.toString();
  return `${sec.toString()} (${new Date(ms).toISOString()})`;
};

const formatDuration = (sec: bigint) => {
  if (sec === 0n) return "0";
  const n = Number(sec);
  if (!Number.isFinite(n)) return sec.toString();
  const days = Math.floor(n / 86400);
  const hours = Math.floor((n % 86400) / 3600);
  const mins = Math.floor((n % 3600) / 60);
  const secs = n % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins) parts.push(`${mins}m`);
  if (secs) parts.push(`${secs}s`);
  return `${sec.toString()} (${parts.join(" ") || "0s"})`;
};

type Accent = "blue" | "purple" | "green" | "red" | "orange";

const Section = ({
  title,
  subtitle,
  icon,
  accent,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType;
  accent: Accent;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <Box
      borderRadius="lg"
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      p={5}
    >
      <HStack mb={4} spacing={3} align="center">
        <Box
          w={9}
          h={9}
          borderRadius="md"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={icon} color={`${accent}.400`} boxSize={4} />
        </Box>
        <VStack spacing={0} align="start">
          <Heading size="sm" color="gray.100">
            {title}
          </Heading>
          {subtitle && (
            <Text fontSize="xs" color="gray.500">
              {subtitle}
            </Text>
          )}
        </VStack>
        {badge && <Box ml="auto">{badge}</Box>}
      </HStack>
      {children}
    </Box>
  );
};

const KV = ({
  label,
  value,
  mono = true,
  copyable,
  icon,
  accent = "blue",
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: string;
  icon?: React.ComponentType;
  accent?: Accent;
}) => {
  return (
    <Box
      p={3}
      borderRadius="md"
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
      _hover={{ borderColor: "whiteAlpha.300" }}
      transition="border-color 0.15s"
    >
      <HStack mb={1.5} spacing={1.5}>
        {icon && <Icon as={icon} color={`${accent}.400`} boxSize={3} />}
        <Text
          fontSize="2xs"
          color="gray.400"
          textTransform="uppercase"
          letterSpacing="wider"
          fontWeight="semibold"
        >
          {label}
        </Text>
      </HStack>
      <HStack align="start" spacing={2}>
        <Box
          flex={1}
          fontFamily={mono ? "mono" : undefined}
          fontSize="sm"
          color="gray.100"
          wordBreak="break-all"
        >
          {value}
        </Box>
        {copyable !== undefined && <CopyToClipboard textToCopy={copyable} />}
      </HStack>
    </Box>
  );
};

export const CoWSwapVerifyPage = () => {
  const toast = useToast();
  const [calldata, setCalldata] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<SelectedOptionState>({
    label: cowApiNetworks[0].label,
    value: cowApiNetworks[0].value,
  });

  const [error, setError] = useState("");
  const [step1, setStep1] = useState<Step1Result | null>(null);
  const [step2, setStep2] = useState<Step2Result | null>(null);
  const [step3, setStep3] = useState<Step3Result | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [justMatched, setJustMatched] = useState(false);

  const reset = () => {
    setError("");
    setStep1(null);
    setStep2(null);
    setStep3(null);
  };

  const verify = async () => {
    reset();
    setIsVerifying(true);
    try {
      const raw = calldata.trim();
      if (!raw) throw new Error("Paste createWithContext calldata first.");

      const hex = startWith0x(raw);
      if (!isHex(hex)) throw new Error("Calldata is not a valid hex string.");
      if (hex.length < 10) throw new Error("Calldata is too short.");

      const selector = hex.slice(0, 10).toLowerCase();
      if (selector !== CREATE_WITH_CONTEXT_SELECTOR) {
        throw new Error(
          `Function selector ${selector} does not match createWithContext (${CREATE_WITH_CONTEXT_SELECTOR}). Make sure this is calldata for ComposableCoW.createWithContext.`
        );
      }

      const body = `0x${hex.slice(10)}` as Hex;
      let decoded1;
      try {
        decoded1 = decodeAbiParameters(CREATE_WITH_CONTEXT_PARAMS, body);
      } catch (e: any) {
        throw new Error(`Failed to decode createWithContext: ${e.message ?? e}`);
      }
      const [params, factory, data, dispatch] = decoded1 as unknown as [
        { handler: `0x${string}`; salt: `0x${string}`; staticInput: `0x${string}` },
        `0x${string}`,
        `0x${string}`,
        boolean,
      ];

      const s1: Step1Result = {
        handler: params.handler,
        salt: params.salt,
        staticInput: params.staticInput,
        factory,
        data,
        dispatch,
      };
      setStep1(s1);

      let decoded2;
      try {
        decoded2 = decodeAbiParameters(TWAP_DATA_PARAMS, s1.staticInput);
      } catch (e: any) {
        throw new Error(
          `Failed to decode Data struct as TWAP. The handler may not be a TWAP handler. (${e.message ?? e})`
        );
      }
      const [dataStruct] = decoded2 as unknown as [Step2Result];
      const s2: Step2Result = {
        sellToken: dataStruct.sellToken,
        buyToken: dataStruct.buyToken,
        receiver: dataStruct.receiver,
        partSellAmount: dataStruct.partSellAmount,
        minPartLimit: dataStruct.minPartLimit,
        t0: dataStruct.t0,
        n: dataStruct.n,
        t: dataStruct.t,
        span: dataStruct.span,
        appData: dataStruct.appData,
      };
      setStep2(s2);

      const networkPath = selectedNetwork!.value as string;
      const appDataHash = s2.appData;
      try {
        const resp = await fetch(
          `https://api.cow.fi/${networkPath}/api/v1/app_data/${appDataHash}`
        );
        if (!resp.ok) {
          throw new Error(
            `CoW API returned ${resp.status} ${resp.statusText} for app data hash ${appDataHash} on ${networkPath}.`
          );
        }
        const json = await resp.json();
        const fullAppData: string | undefined = json.fullAppData;
        if (typeof fullAppData !== "string") {
          throw new Error("CoW API response is missing fullAppData string.");
        }

        const canonical = JSON.stringify(JSON.parse(fullAppData));
        const computedHash = keccak256(toBytes(canonical));

        const matches = computedHash.toLowerCase() === appDataHash.toLowerCase();
        setStep3({
          status: matches ? "match" : "mismatch",
          fullAppData,
          canonical,
          computedHash,
          onchainHash: appDataHash,
        });

        if (matches) {
          toast({
            title: "App data hash verified",
            description: "keccak256(fullAppData) matches the on-chain hash.",
            status: "success",
            duration: 3500,
            isClosable: true,
            position: "top-right",
            icon: <Icon as={FiCheckCircle} boxSize={5} />,
          });
          setJustMatched(true);
          window.setTimeout(() => setJustMatched(false), 2000);
        } else {
          toast({
            title: "App data hash mismatch",
            description:
              "Computed hash does not match. The fullAppData may have been tampered with.",
            status: "warning",
            duration: 4500,
            isClosable: true,
            position: "top-right",
          });
        }
      } catch (e: any) {
        setStep3({ status: "error", message: e.message ?? String(e) });
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setIsVerifying(false);
    }
  };

  const isTwapHandler =
    step1?.handler?.toLowerCase() === TWAP_HANDLER.toLowerCase();

  return (
    <Box
      p={6}
      bg="rgba(0, 0, 0, 0.05)"
      backdropFilter="blur(5px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.50"
      w="full"
      maxW="1200px"
      mx="auto"
    >
      {/* Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={GiCow} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            CoW Protocol TWAP Verifier
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="md" maxW="700px" mx="auto">
          Decode a ComposableCoW TWAP order and verify its{" "}
          <Code fontSize="sm">appData</Code> hash against the CoW API.
        </Text>
        <Text fontSize="sm" mt={2}>
          <Link
            href="https://gist.github.com/pcaversaccio/e18a0400174b143b662dd36ea2555495"
            color="blue.300"
            isExternal
          >
            Based on guide by pcaversaccio <ExternalLinkIcon mx="2px" />
          </Link>
        </Text>
        <Text color="gray.500" fontSize="xs" mt={2}>
          ComposableCoW: <Code fontSize="xs">{COMPOSABLE_COW}</Code>
        </Text>
      </Box>

      {/* Input area */}
      <VStack spacing={4} align="stretch" maxW="900px" mx="auto" mb={6}>
        <Box
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <HStack spacing={2} mb={3}>
            <Icon as={FiCode} color="blue.400" boxSize={4} />
            <Text color="gray.300" fontWeight="medium">
              createWithContext calldata
            </Text>
          </HStack>
          <Textarea
            w="100%"
            height="160px"
            value={calldata}
            onChange={(e) => setCalldata(e.target.value)}
            placeholder="0x0d0d9800..."
            resize="vertical"
            data-gramm="false"
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            _hover={{ borderColor: "whiteAlpha.300" }}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
            color="gray.100"
            _placeholder={{ color: "gray.500" }}
            fontSize="sm"
            fontFamily="mono"
          />
        </Box>

        <HStack
          spacing={4}
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Box minW="180px">
            <HStack spacing={2}>
              <Icon as={FiGlobe} color="blue.400" boxSize={4} />
              <Text color="gray.300" fontWeight="medium">
                CoW API network
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              (for app data lookup)
            </Text>
          </Box>
          <Box flex={1}>
            <DarkSelect
              boxProps={{ w: "100%" }}
              selectedOption={selectedNetwork}
              setSelectedOption={setSelectedNetwork}
              options={cowApiNetworks}
            />
          </Box>
        </HStack>

        <Box textAlign="center" pt={2}>
          <DarkButton
            onClick={verify}
            isLoading={isVerifying}
            loadingText="Verifying..."
            size="lg"
            px={10}
            bg={justMatched ? "green.500" : undefined}
            borderColor={justMatched ? "green.400" : undefined}
            color={justMatched ? "white" : undefined}
            _hover={
              justMatched
                ? { bg: "green.500", borderColor: "green.400" }
                : undefined
            }
            leftIcon={
              justMatched ? (
                <Icon as={FiCheckCircle} boxSize={5} />
              ) : (
                <Icon as={FiZap} boxSize={4} />
              )
            }
            transition="all 0.2s ease"
          >
            {justMatched ? "Verified" : "Verify"}
          </DarkButton>
        </Box>

        {error && (
          <Alert
            status="error"
            variant="subtle"
            borderRadius="lg"
            bg="red.900"
            border="1px solid"
            borderColor="red.600"
          >
            <AlertIcon />
            <AlertDescription color="red.200">{error}</AlertDescription>
          </Alert>
        )}
      </VStack>

      {(step1 || step2 || step3) && (
        <VStack spacing={5} align="stretch" maxW="900px" mx="auto">
          {step1 && (
            <Section
              title="Step 1 · createWithContext"
              subtitle="Decoded conditional order context"
              icon={FiLayers}
              accent="blue"
              badge={
                <Badge
                  colorScheme="blue"
                  fontSize="xs"
                  px={2}
                  py={1}
                  borderRadius="md"
                >
                  selector {CREATE_WITH_CONTEXT_SELECTOR}
                </Badge>
              }
            >
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                <KV
                  icon={FiCpu}
                  accent="blue"
                  label="handler"
                  value={
                    <HStack spacing={2}>
                      <Text>{step1.handler}</Text>
                      {isTwapHandler && (
                        <Badge
                          colorScheme="green"
                          fontSize="2xs"
                          px={1.5}
                          borderRadius="sm"
                        >
                          TWAP
                        </Badge>
                      )}
                    </HStack>
                  }
                  copyable={step1.handler}
                />
                <KV
                  icon={FiKey}
                  accent="purple"
                  label="salt"
                  value={step1.salt}
                  copyable={step1.salt}
                />
                <KV
                  icon={FiPackage}
                  accent="orange"
                  label="factory"
                  value={step1.factory}
                  copyable={step1.factory}
                />
                <KV
                  icon={FiZap}
                  accent={step1.dispatch ? "green" : "red"}
                  label="dispatch"
                  mono={false}
                  value={
                    <HStack spacing={2}>
                      <Box
                        w={2}
                        h={2}
                        borderRadius="full"
                        bg={step1.dispatch ? "green.400" : "red.400"}
                      />
                      <Text fontWeight="semibold">
                        {step1.dispatch ? "true" : "false"}
                      </Text>
                    </HStack>
                  }
                />
                <Box gridColumn={{ md: "span 2" }}>
                  <KV
                    icon={FiCode}
                    accent="blue"
                    label="staticInput (bytes)"
                    value={step1.staticInput}
                    copyable={step1.staticInput}
                  />
                </Box>
                <Box gridColumn={{ md: "span 2" }}>
                  <KV
                    icon={FiCode}
                    accent="blue"
                    label="data (bytes — emitted by ComposableCoW)"
                    value={step1.data || "0x"}
                    copyable={step1.data || "0x"}
                  />
                </Box>
              </SimpleGrid>
              {!isTwapHandler && (
                <Alert
                  status="warning"
                  mt={4}
                  borderRadius="md"
                  bg="orange.900"
                  border="1px solid"
                  borderColor="orange.600"
                >
                  <AlertIcon />
                  <AlertDescription color="orange.100" fontSize="sm">
                    Handler does not match the known TWAP handler ({TWAP_HANDLER}
                    ). The staticInput decoding below assumes the TWAP layout and
                    may not be correct for other handlers.
                  </AlertDescription>
                </Alert>
              )}
            </Section>
          )}

          {step2 && (
            <Section
              title="Step 2 · TWAP Data"
              subtitle="Decoded staticInput payload"
              icon={FiRepeat}
              accent="purple"
              badge={
                <Badge
                  colorScheme="purple"
                  fontSize="xs"
                  px={2}
                  py={1}
                  borderRadius="md"
                >
                  Data struct
                </Badge>
              }
            >
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                <KV
                  icon={FiArrowUpCircle}
                  accent="red"
                  label="sellToken"
                  value={step2.sellToken}
                  copyable={step2.sellToken}
                />
                <KV
                  icon={FiArrowDownCircle}
                  accent="green"
                  label="buyToken"
                  value={step2.buyToken}
                  copyable={step2.buyToken}
                />
                <KV
                  icon={FiUser}
                  accent="orange"
                  label="receiver"
                  value={step2.receiver}
                  copyable={step2.receiver}
                />
                <KV
                  icon={FiHash}
                  accent="green"
                  label="appData (bytes32)"
                  value={step2.appData}
                  copyable={step2.appData}
                />
                <KV
                  icon={FiArrowUpCircle}
                  accent="red"
                  label="partSellAmount (raw)"
                  value={step2.partSellAmount.toString()}
                  copyable={step2.partSellAmount.toString()}
                />
                <KV
                  icon={FiArrowDownCircle}
                  accent="green"
                  label="minPartLimit (raw)"
                  value={step2.minPartLimit.toString()}
                  copyable={step2.minPartLimit.toString()}
                />
                <KV
                  icon={FiLayers}
                  accent="purple"
                  label="n (number of parts)"
                  value={step2.n.toString()}
                />
                <KV
                  icon={FiClock}
                  accent="blue"
                  label="t (per-part interval, seconds)"
                  value={formatDuration(step2.t)}
                />
                <KV
                  icon={FiClock}
                  accent="blue"
                  label="t0 (start time, unix)"
                  value={formatTimestamp(step2.t0)}
                />
                <KV
                  icon={FiClock}
                  accent="blue"
                  label="span (per-part window, seconds)"
                  value={
                    step2.span === 0n
                      ? "0 (full interval)"
                      : formatDuration(step2.span)
                  }
                />
              </SimpleGrid>
              <Divider my={4} borderColor="whiteAlpha.200" />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                <KV
                  icon={FiArrowUpCircle}
                  accent="red"
                  label="Total sell (partSellAmount × n)"
                  value={(step2.partSellAmount * step2.n).toString()}
                />
                <KV
                  icon={FiArrowDownCircle}
                  accent="green"
                  label="Total min buy (minPartLimit × n)"
                  value={(step2.minPartLimit * step2.n).toString()}
                />
              </SimpleGrid>
            </Section>
          )}

          {step3 && (
            <Section
              title="Step 3 · App Data Hash"
              subtitle="keccak256(fullAppData) vs on-chain hash"
              icon={FiHash}
              accent={
                step3.status === "match"
                  ? "green"
                  : step3.status === "mismatch"
                    ? "red"
                    : "orange"
              }
              badge={
                step3.status === "match" ? (
                  <Badge
                    colorScheme="green"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    <HStack spacing={1}>
                      <Icon as={FiCheckCircle} />
                      <Text>Matches</Text>
                    </HStack>
                  </Badge>
                ) : step3.status === "mismatch" ? (
                  <Badge
                    colorScheme="red"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    <HStack spacing={1}>
                      <Icon as={FiAlertTriangle} />
                      <Text>Mismatch</Text>
                    </HStack>
                  </Badge>
                ) : (
                  <Badge
                    colorScheme="orange"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    Lookup failed
                  </Badge>
                )
              }
            >
              {step3.status === "error" ? (
                <Alert
                  status="warning"
                  borderRadius="md"
                  bg="orange.900"
                  border="1px solid"
                  borderColor="orange.600"
                >
                  <AlertIcon />
                  <AlertDescription color="orange.100" fontSize="sm">
                    {step3.message}
                  </AlertDescription>
                </Alert>
              ) : (
                <VStack spacing={4} align="stretch">
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <KV
                      icon={FiHash}
                      accent={step3.status === "match" ? "green" : "red"}
                      label="on-chain appData"
                      value={step3.onchainHash}
                      copyable={step3.onchainHash}
                    />
                    <KV
                      icon={FiHash}
                      accent={step3.status === "match" ? "green" : "red"}
                      label="keccak256(canonical fullAppData)"
                      value={step3.computedHash}
                      copyable={step3.computedHash}
                    />
                  </SimpleGrid>
                  <Box>
                    <HStack mb={2} spacing={1.5}>
                      <Icon as={FiCode} color="green.300" boxSize={3} />
                      <Text
                        fontSize="2xs"
                        color="green.200"
                        textTransform="uppercase"
                        letterSpacing="wider"
                        fontWeight="semibold"
                      >
                        fullAppData (canonical JSON)
                      </Text>
                    </HStack>
                    <Box
                      as="pre"
                      p={3}
                      bg="blackAlpha.600"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      fontFamily="mono"
                      fontSize="xs"
                      color="green.100"
                      overflowX="auto"
                      whiteSpace="pre"
                    >
                      {(() => {
                        try {
                          return JSON.stringify(
                            JSON.parse(step3.fullAppData),
                            null,
                            2
                          );
                        } catch {
                          return step3.fullAppData;
                        }
                      })()}
                    </Box>
                    <HStack mt={2} justify="flex-end">
                      <CopyToClipboard
                        textToCopy={step3.canonical}
                        labelText="Copy canonical"
                      />
                    </HStack>
                  </Box>
                  <Link
                    href={`https://explorer.cow.fi/appdata?tab=decode&appDataHash=${step3.onchainHash}`}
                    color="blue.300"
                    isExternal
                    fontSize="sm"
                  >
                    Open in CoW Explorer <ExternalLinkIcon mx="2px" />
                  </Link>
                </VStack>
              )}
            </Section>
          )}
        </VStack>
      )}
    </Box>
  );
};
