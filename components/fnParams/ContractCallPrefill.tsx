"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  HStack,
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
import { chainIdToChain } from "@/data/common";
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
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null!);
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
        const abi =
          shared.abiMode === "implementation" ? implementationAbi : contractAbi;
        if (!abi)
          throw new Error(
            "Shared ABI context is unavailable for this contract."
          );
        const call = decode(
          "data" in shared ? shared.data : shared.args,
          abi,
          shared.abiMode,
          shared.value,
          shared.signature
        );
        setError("");
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
    if (!isDecoding) return;
    // Paint the loading state before decoding and rendering the destination form.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        try {
          const call = decode(data, selectedAbi, abiMode);
          pendingPrefill.current = { call, abi: selectedAbi };
          setError("");
          onPrefill(call, () => setIsOpen(false));
        } catch (error) {
          setIsDecoding(false);
          fail(error);
        }
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [isDecoding, data, selectedAbi, abiMode, decode, onPrefill, fail]);

  const close = () => {
    if (isDecoding) return;
    pendingPrefill.current = null;
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
        onClick={() => setIsOpen(true)}
      >
        Fill from calldata
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={close}
        initialFocusRef={inputRef}
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
                Fill from calldata
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton
            top={4}
            right={4}
            size="sm"
            color="text.tertiary"
            isDisabled={isDecoding}
          />
          <ModalBody px={{ base: 4, md: 6 }} py={5}>
            <Text fontSize="sm" color="text.secondary" mb={4}>
              Paste an encoded call to fill its matching function’s parameters.
            </Text>
            <HStack
              justify="space-between"
              spacing={3}
              px={3}
              py={2.5}
              mb={5}
              bg="bg.subtle"
              border="1px solid"
              borderColor="border.subtle"
              borderRadius="md"
              flexWrap="wrap"
            >
              <HStack spacing={2} minW={0}>
                <Text fontSize="xs" color="text.tertiary">
                  Contract
                </Text>
                <Text
                  fontFamily="mono"
                  fontSize="xs"
                  color="text.secondary"
                  title={address}
                >
                  {address.slice(0, 6)}…{address.slice(-4)}
                </Text>
              </HStack>
              <Text fontSize="xs" color="text.secondary">
                {chainIdToChain[chainId]?.name ?? `Chain ${chainId}`}
              </Text>
            </HStack>
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
              isDisabled={isDecoding}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight size={14} />}
              isLoading={isDecoding}
              loadingText="Decoding…"
            >
              Fill parameters
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
