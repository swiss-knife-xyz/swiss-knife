"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  HStack,
  VStack,
  Input,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  FormControl,
  FormLabel,
  Button,
  Text,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { ClipboardPaste, ArrowRight } from "lucide-react";
import type { JsonFragment } from "ethers";
import { NetworkSelect } from "@/components/NetworkSelect";
import { getPublicClient } from "@/lib/publicClient";
import { parseTransactionExplorerUrl } from "@/lib/contractExplorerInput";
import {
  contractFunctionSignature,
  decodeContractCall,
  restoreSharedFunctionForm,
  parseContractCallFragment,
  MAX_CALLDATA_BYTES,
  type CallReview,
  type FormCall,
} from "@/lib/contractCall";

export type PrefilledCall = FormCall & Pick<CallReview, "value" | "abiMode">;

type Props = {
  chainId: number;
  address: string;
  selectedAbi: readonly JsonFragment[] | null;
  contractAbi: readonly JsonFragment[] | null;
  implementationAbi: readonly JsonFragment[] | null;
  abiMode: CallReview["abiMode"];
  onPrefill: (call: PrefilledCall | null, onScrollStart?: () => void) => void;
  hasActivePrefill?: boolean;
  restoreFromUrl?: boolean;
};

export function ContractCallPrefill({
  chainId,
  address,
  selectedAbi,
  contractAbi,
  implementationAbi,
  abiMode,
  onPrefill,
  restoreFromUrl = true,
}: Props) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [data, setData] = useState("");
  const [sourceTab, setSourceTab] = useState(0);
  const [txInput, setTxInput] = useState("");
  const [txChainId, setTxChainId] = useState(chainId);
  const txInputRef = useRef<HTMLInputElement>(null!);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null!);
  useEffect(() => { setTxChainId(chainId); }, [chainId]);
  const pendingPrefill = useRef<{
    call: PrefilledCall;
    abi: readonly JsonFragment[] | null;
  } | null>(null);

  const decode = useCallback(
    (
      data: string | unknown[],
      abi: readonly JsonFragment[] | null,
      mode: CallReview["abiMode"],
      value = "0",
      signature?: string
    ): PrefilledCall => {
      if (!abi) throw new Error("Load a contract ABI before decoding.");
      const decoded = Array.isArray(data)
        ? restoreSharedFunctionForm(abi, {
            args: data,
            signature: signature ?? "",
            value,
            abiMode: mode,
          })
        : decodeContractCall(abi, data);
      if (signature && decoded.signature !== signature) {
        throw new Error(
          "Shared function signature does not match the loaded ABI and calldata."
        );
      }
      const func = abi.find((f) => {
        try {
          return (
            f.type === "function" &&
            contractFunctionSignature(f) === decoded.signature
          );
        } catch {
          return false;
        }
      });
      if (
        value !== "0" &&
        func?.stateMutability !== "payable" &&
        !func?.payable
      ) {
        throw new Error(
          "Shared value is nonzero but the decoded function is not payable."
        );
      }
      return { ...decoded, value, abiMode: mode };
    },
    []
  );

  const fail = useCallback(
    (error: unknown) => {
      onPrefill(null);
      setError(
        error instanceof Error ? error.message : "Unable to decode calldata."
      );
    },
    [onPrefill]
  );

  useEffect(() => {
    if (!restoreFromUrl) return;
    const restore = (event?: Event) => {
      // Workspace history restores the mounted form, including its edited params.
      if (event instanceof PopStateEvent && event.state?.contractWorkspaceTab)
        return;
      pendingPrefill.current = null;
      try {
        const shared = parseContractCallFragment(window.location.hash);
        if (!shared) {
          setError("");
          onPrefill(null);
          return;
        }
        setData("data" in shared ? shared.data : "");
        const mode = "abiMode" in shared
          ? shared.abiMode
          : implementationAbi ? "implementation" : "contract";
        const abi = mode === "implementation" ? implementationAbi : contractAbi;
        if (!abi)
          throw new Error(
            "Shared ABI context is unavailable for this contract."
          );
        const call = decode(
          "data" in shared ? shared.data : shared.args,
          abi,
          mode,
          shared.value,
          "signature" in shared ? shared.signature : undefined
        );
        setError("");
        if (!("abiMode" in shared)) setIsOpen(false);
        onPrefill(call);
      } catch (error) {
        fail(error);
        setIsOpen(true);
      }
    };
    restore();
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("hashchange", restore);
      window.removeEventListener("popstate", restore);
    };
  }, [contractAbi, implementationAbi, decode, fail, onPrefill, restoreFromUrl]);

  useEffect(() => {
    if (!isDecoding || pendingPrefill.current) return;
    let cancelled = false;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(async () => {
        try {
          let encoded = data;
          let value = "0";
          if (sourceTab === 1) {
            const input = txInput.trim();
            const explorer = parseTransactionExplorerUrl(input);
            const hash = explorer?.hash ?? input;
            if (!/^0x[\da-f]{64}$/i.test(hash))
              throw new Error("Enter a transaction hash or a supported explorer transaction URL.");
            const transaction = await getPublicClient(explorer?.chainId ?? txChainId).getTransaction({ hash: hash as `0x${string}` });
            if (cancelled) return;
            encoded = transaction.input;
            value = transaction.value.toString();
          }
          const call = decode(encoded, selectedAbi, abiMode, value);
          if (cancelled) return;
          pendingPrefill.current = { call, abi: selectedAbi };
          if (sourceTab === 1) setData(encoded);
          setError("");
          onPrefill(call, () => setIsOpen(false));
        } catch (error) {
          if (cancelled) return;
          setIsDecoding(false);
          fail(error);
        }
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [isDecoding, sourceTab, txInput, txChainId, data, selectedAbi, abiMode, decode, onPrefill, fail]);

  const focusFrame = useRef<number | null>(null);
  const focusInput = useCallback((tab: number) => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      (tab === 1 ? txInputRef.current : inputRef.current)?.focus({ preventScroll: true });
    });
  }, []);
  useEffect(() => {
    if (isOpen) focusInput(sourceTab);
    return () => {
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
      focusFrame.current = null;
    };
  }, [isOpen, sourceTab, focusInput]);

  const close = () => {
    pendingPrefill.current = null;
    setIsDecoding(false);
    setIsOpen(false);
  };
  const trimmedData = data.trim();
  const byteCount = /^0x(?:[a-fA-F0-9]{2})*$/.test(trimmedData)
    ? (trimmedData.length - 2) / 2
    : null;

  const fadeMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0 } },
    transition: { duration: 0.15 },
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        color="text.secondary"
        borderColor="whiteAlpha.300"
        bg="whiteAlpha.50"
        _hover={{
          color: "text.primary",
          bg: "whiteAlpha.100",
          borderColor: "whiteAlpha.400",
        }}
        leftIcon={<ClipboardPaste size={14} aria-hidden="true" />}
        px={3}
        h={{ base: 9, md: 7 }}
        fontSize="xs"
        aria-haspopup="dialog"
        onClick={() => {
          setTxChainId(chainId);
          setTxInput(input => {
            const explorer = parseTransactionExplorerUrl(input);
            return explorer && explorer.chainId !== chainId ? explorer.hash : input;
          });
          setIsOpen(true);
        }}
      >
        Fill from tx or calldata
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={close}
        initialFocusRef={sourceTab === 1 ? txInputRef : inputRef}
        returnFocusOnClose={pendingPrefill.current === null}
        onCloseComplete={() => {
          pendingPrefill.current = null;
          setIsDecoding(false);
        }}
        isCentered
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay
          bg="blackAlpha.600"
          backdropFilter="blur(8px)"
          motionProps={fadeMotion}
        />
        <ModalContent
          motionProps={fadeMotion}
          as="form"
          bg="bg.base"
          mx={{ base: 3, sm: 6 }}
          my={6}
          maxW="640px"
          maxH="calc(100dvh - 3rem)"
          border="1px solid"
          borderColor="border.default"
          borderRadius="lg"
          overflow="hidden"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isDecoding) setIsDecoding(true);
          }}
        >
          <ModalHeader
            px={{ base: 4, md: 6 }}
            py={5}
            pr={12}
            borderBottom="1px solid"
            borderColor="border.subtle"
          >
            <HStack spacing={2.5} color="text.primary">
              <ClipboardPaste size={18} aria-hidden="true" />
              <Text fontSize="lg" fontWeight="semibold">
                Fill from tx or calldata
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton
            top={4}
            right={4}
            size="sm"
            color="text.tertiary"
          />
          <ModalBody px={{ base: 4, md: 6 }} py={5}>
            <Text fontSize="sm" color="text.secondary" mb={4}>
              Fills function parameters from calldata or an existing transaction.
            </Text>
            <Tabs index={sourceTab} onChange={(tab) => {
              pendingPrefill.current = null;
              setSourceTab(tab);
              setError("");
            }} colorScheme="blue" variant="line" size="sm">
              <TabList borderColor="border.default" mb={4}>
                <Tab onClick={() => focusInput(0)} isDisabled={isDecoding} color="text.secondary" _selected={{ color: "blue.300", borderColor: "blue.300" }}>Calldata</Tab>
                <Tab onClick={() => focusInput(1)} isDisabled={isDecoding} color="text.secondary" _selected={{ color: "blue.300", borderColor: "blue.300" }}>From transaction</Tab>
              </TabList>
              <TabPanels minH="220px">
                <TabPanel p={0}>
            <FormControl>
              <HStack mb={2.5} justify="space-between">
                <FormLabel
                  htmlFor={inputId}
                  mb={0}
                  fontSize="sm"
                  fontWeight="medium"
                  color="text.secondary"
                >
                  Calldata
                </FormLabel>
                {byteCount !== null && (
                  <Text fontSize="xs" color="text.tertiary">
                    {byteCount.toLocaleString()} bytes
                  </Text>
                )}
              </HStack>
              <Textarea
                id={inputId}
                isReadOnly={isDecoding}
                ref={inputRef}
                aria-label="Calldata to decode"
                aria-describedby={error ? errorId : undefined}
                isInvalid={Boolean(error)}
                placeholder="Paste hex calldata, starting with 0x"
                value={data}
                rows={5}
                minH="140px"
                maxH="40dvh"
                resize="vertical"
                maxLength={2 + MAX_CALLDATA_BYTES * 2}
                fontFamily="mono"
                fontSize="sm"
                lineHeight="tall"
                bg="bg.subtle"
                borderColor="border.default"
                borderRadius="md"
                _focus={{
                  borderColor: "primary.400",
                  boxShadow: "0 0 0 1px var(--chakra-colors-primary-400)",
                }}
                p={3}
                spellCheck={false}
                onChange={(event) => {
                  setData(event.target.value);
                  setError("");
                  onPrefill(null);
                }}
              />
            </FormControl>
                </TabPanel>
                <TabPanel p={0}>
                  <VStack align="stretch" spacing={5}>
                    <FormControl>
                      <FormLabel htmlFor={`${inputId}-transaction`} fontSize="sm" color="text.secondary">Transaction hash or explorer URL</FormLabel>
                      <Input id={`${inputId}-transaction`} ref={txInputRef}
                        aria-label="Transaction hash or explorer URL"
                        aria-describedby={error ? errorId : undefined}
                        placeholder="0x hash or explorer link"
                        value={txInput} isReadOnly={isDecoding} isInvalid={Boolean(error)}
                        bg="bg.subtle" borderColor="border.default" borderRadius="md"
                        onChange={(event) => {
                          const input = event.target.value;
                          setTxInput(input);
                          const explorer = parseTransactionExplorerUrl(input);
                          if (explorer) setTxChainId(explorer.chainId);
                          setError("");
                          onPrefill(null);
                        }}
                        onPaste={(event) => {
                          const input = event.clipboardData.getData("text").trim();
                          const explorer = parseTransactionExplorerUrl(input);
                          if (!explorer) return;
                          event.preventDefault();
                          pendingPrefill.current = null;
                          setTxInput(input);
                          setTxChainId(explorer.chainId);
                          setError("");
                          onPrefill(null);
                          setIsDecoding(true);
                        }}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm" color="text.secondary">Network</FormLabel>
                      <NetworkSelect ariaLabel="Transaction network" chainId={txChainId}
                        isDisabled={isDecoding} menuAlign="right"
                        onChange={(id) => {
                          setTxChainId(id);
                          // A parsed URL pins its own chain; normalize it to a hash
                          // when the user explicitly chooses another network.
                          const explorer = parseTransactionExplorerUrl(txInput);
                          if (explorer) setTxInput(explorer.hash);
                          setError("");
                          onPrefill(null);
                        }} />
                    </FormControl>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
            {error && (
              <Text
                id={errorId}
                role="alert"
                color="red.300"
                fontSize="sm"
                mt={3}
              >
                {error}
              </Text>
            )}
          </ModalBody>
          <ModalFooter
            px={{ base: 4, md: 6 }}
            py={4}
            gap={2}
            borderTop="1px solid"
            borderColor="border.subtle"
            bg="bg.subtle"
            flexShrink={0}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight size={14} />}
              isLoading={isDecoding}
              loadingText={sourceTab === 1 ? "Loading transaction…" : "Decoding…"}
            >
              Fill parameters
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
