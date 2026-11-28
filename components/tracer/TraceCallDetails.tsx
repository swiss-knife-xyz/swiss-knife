"use client";
import { useRef, useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Text,
  Flex,
  IconButton,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverCloseButton,
  Portal,
  Textarea,
  Spinner,
} from "@chakra-ui/react";
import { SettingsIcon } from "@chakra-ui/icons";
import type { InterfaceAbi } from "ethers";
import { TraceBadge, callColors } from "./TraceBadge";
import { TraceData as Raw } from "./TraceData";
import { formatTraceValue } from "@/lib/tracer/format";
import { CalldataTree } from "@/components/decodedParams/CalldataTree";
import { TraceDecodedValues } from "./TraceDecodedValues";
import type { TraceCall } from "@/lib/tracer/model";
import type { TraceDecodeEntry } from "@/lib/tracer/decodingStore";
import { traceCodeAddress } from "@/lib/tracer/codeAddress";

export default function TraceCallDetails({
  call,
  chainId,
  rolledBack,
  entry,
  onAbi,
}: {
  call: TraceCall;
  chainId?: number;
  rolledBack: boolean;
  entry?: TraceDecodeEntry;
  onAbi: (address: string, abi: InterfaceAbi) => Promise<void>;
}) {
  const decoded = entry?.data;
  const abiInput = useRef<HTMLTextAreaElement>(null!);
  const [raw, setRaw] = useState(false);
  const [showAbi, setShowAbi] = useState(false);
  const [abiText, setAbiText] = useState("");
  const [abiError, setAbiError] = useState("");
  const [applying, setApplying] = useState(false);
  const [logLimit, setLogLimit] = useState(50);
  const codeAddress = decoded?.codeAddress ?? traceCodeAddress(call);
  const pending =
    !entry || entry.status === "queued" || entry.status === "loading";
  async function applyAbi() {
    if (!codeAddress) return;
    setApplying(true);
    setAbiError("");
    try {
      const { parseContractAbi } = await import("@/lib/contractAbi");
      await onAbi(codeAddress, parseContractAbi(abiText));
      setShowAbi(false);
    } catch (error) {
      setAbiError(error instanceof Error ? error.message : "Invalid ABI");
    } finally {
      setApplying(false);
    }
  }
  return (
    <Box
      border="1px solid"
      borderColor="border.default"
      borderRadius="md"
      px={4}
      pb={4}
      minW={0}
      bg="bg.subtle"
      maxH={{ xl: "calc(100dvh - 32px)" }}
      overflowY={{ xl: "auto" }}
      isolation="isolate"
      data-trace-details
    >
      <HStack justify="space-between" mb={3} pt={4} wrap="wrap">
        <Heading as="h2" fontSize="md">
          Call{" "}
          <Text as="span" fontFamily="mono" color="text.secondary">
            {call.id}
          </Text>
        </Heading>
        <TraceBadge
          color={
            call.error ? "red.300" : rolledBack ? "orange.300" : "green.300"
          }
        >
          {call.error ? "Reverted" : rolledBack ? "Rolled back" : "Success"}
        </TraceBadge>
      </HStack>
      <Box display="grid" gap={3}>
        <HStack spacing={2}>
          <TraceBadge color={callColors[call.type]}>{call.type}</TraceBadge>
          <Text fontSize="xs" color="text.secondary">
            {call.gasUsed ? `${BigInt(call.gasUsed).toLocaleString()} gas` : ""}
          </Text>
          {call.value !== undefined && (
            <Text fontSize="xs" color="green.300" ml="auto">
              {formatTraceValue(call.value, chainId)}
            </Text>
          )}
        </HStack>
        {decoded?.contractName && (
          <Text fontSize="sm" color="white">
            {decoded.contractName}
          </Text>
        )}
        <Raw label="From" value={call.from} address chainId={chainId} />
        <Raw label="To" value={call.to ?? "—"} address chainId={chainId} />
        {codeAddress &&
          codeAddress.toLowerCase() !== call.to?.toLowerCase() && (
            <Raw
              label="Executed implementation"
              value={codeAddress}
              address
              chainId={chainId}
            />
          )}
        {rolledBack && (
          <Text fontSize="sm" color={call.error ? "red.300" : "orange.300"}>
            {call.revertReason || call.error || "Rolled back by parent call."}
          </Text>
        )}
        <Tabs
          size="sm"
          isLazy
          lazyBehavior="keepMounted"
          index={raw ? 1 : 0}
          onChange={(index) => setRaw(index === 1)}
          minW={0}
        >
          <Flex
            align="center"
            borderBottom="1px solid"
            borderColor="border.default"
          >
            <TabList flex="1" borderBottom={0} aria-label="Call data format">
              <Tab fontSize="xs" px={3}>
                Decoded
              </Tab>
              <Tab fontSize="xs" px={3}>
                Raw
              </Tab>
            </TabList>
            {codeAddress && (
              <Popover
                isOpen={showAbi}
                onOpen={() => setShowAbi(true)}
                onClose={() => setShowAbi(false)}
                placement="bottom-end"
                initialFocusRef={abiInput}
                isLazy
              >
                <PopoverTrigger>
                  <IconButton
                    aria-label="Call settings"
                    icon={<SettingsIcon boxSize={3.5} />}
                    variant="ghost"
                    size="xs"
                    color="text.secondary"
                  />
                </PopoverTrigger>
                <Portal>
                  <PopoverContent
                    bg="bg.subtle"
                    borderColor="border.default"
                    w="min(360px, calc(100vw - 32px))"
                    borderRadius="md"
                    boxShadow="none"
                  >
                    <PopoverHeader
                      fontSize="sm"
                      fontWeight="medium"
                      borderColor="border.default"
                      px={3}
                      py={2}
                    >
                      ABI
                    </PopoverHeader>
                    <PopoverCloseButton />
                    <PopoverBody p={3}>
                      <Textarea
                        ref={abiInput}
                        aria-label="ABI"
                        value={abiText}
                        onChange={(event) => setAbiText(event.target.value)}
                        placeholder="Paste ABI or function signature"
                        rows={4}
                        minH={28}
                        maxH={64}
                        resize="vertical"
                        borderRadius="sm"
                        bg="bg.base"
                        fontFamily="mono"
                        fontSize="xs"
                        lineHeight="tall"
                        spellCheck={false}
                        isDisabled={applying}
                      />
                      {abiError && (
                        <Text fontSize="xs" color="red.300" role="alert" mt={2}>
                          {abiError}
                        </Text>
                      )}
                      <Flex justify="flex-end" mt={2}>
                        <Button
                          size="sm"
                          bg="primary.500"
                          color="white"
                          _hover={{ bg: "primary.600" }}
                          isLoading={applying}
                          isDisabled={!abiText.trim()}
                          onClick={applyAbi}
                        >
                          Apply
                        </Button>
                      </Flex>
                    </PopoverBody>
                  </PopoverContent>
                </Portal>
              </Popover>
            )}
          </Flex>
          <TabPanels>
            <TabPanel p={0} pt={3}>
              <Box display="grid" gap={3}>
                {decoded ? (
                  <TraceDecodedValues
                    call={call}
                    decoded={decoded}
                    chainId={chainId}
                  />
                ) : pending ? (
                  <HStack color="text.secondary">
                    <Spinner size="xs" />
                    <Text fontSize="xs">Decoding…</Text>
                  </HStack>
                ) : (
                  <>
                    <Text fontSize="xs" color="text.secondary">
                      {entry?.error ?? "No matching ABI"}
                    </Text>
                    <Raw label="Input" value={call.input} />
                    <Raw label="Output" value={call.output} />
                  </>
                )}
              </Box>
            </TabPanel>
            <TabPanel p={0} pt={3}>
              <Box display="grid" gap={3}>
                <Raw
                  label={call.type.startsWith("CREATE") ? "Initcode" : "Input"}
                  value={call.input}
                />
                <Raw
                  label={
                    call.error
                      ? "Revert data"
                      : call.type.startsWith("CREATE")
                        ? "Deployed bytecode"
                        : "Output"
                  }
                  value={call.output}
                />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
        <Heading as="h3" fontSize="sm">
          Logs ({call.logs.length})
        </Heading>
        {call.logs.slice(0, logLimit).map((log, index) => (
          <Box key={index}>
            <Text
              fontSize="xs"
              color={rolledBack ? "orange.300" : "text.secondary"}
              mb={1}
            >
              Log {index}
              {rolledBack ? " · rolled back" : ""}
            </Text>
            {!raw && decoded?.logs[index] ? (
              <CalldataTree
                rawUnitLabel="Raw"
                args={decoded.logs[index].args}
                functionName={decoded.logs[index].eventName}
                chainId={chainId}
                showControls={false}
              />
            ) : (
              <Raw
                label={`Log ${index} data`}
                value={JSON.stringify(log, null, 2)}
                language="json"
              />
            )}
          </Box>
        ))}
        {call.logs.length > 200 && (
          <Text fontSize="xs" color="text.secondary">
            First 200 logs decoded
          </Text>
        )}
        {logLimit < call.logs.length && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setLogLimit((value) => value + 50)}
          >
            Show more logs
          </Button>
        )}
      </Box>
    </Box>
  );
}
