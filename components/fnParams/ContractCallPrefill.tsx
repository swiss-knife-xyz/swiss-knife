"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { ClipboardPaste } from "lucide-react";
import type { JsonFragment } from "ethers";
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
  selectedAbi,
  contractAbi,
  implementationAbi,
  abiMode,
  onPrefill,
  restoreFromUrl = true,
}: Props) {
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
        ? restoreSharedFunctionForm(abi, { args: data, signature: signature ?? "", value, abiMode: mode })
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
      if (event instanceof PopStateEvent && event.state?.contractWorkspaceTab) return;
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
        Enter raw calldata
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (isDecoding) return;
          pendingPrefill.current = null;
          setIsOpen(false);
        }}
        initialFocusRef={inputRef}
        returnFocusOnClose={pendingPrefill.current === null}
        onCloseComplete={() => {
          pendingPrefill.current = null;
          setIsDecoding(false);
        }}
        isCentered
        size={{ base: "full", sm: "xl" }}
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" motionProps={fadeMotion} />
        <ModalContent
          motionProps={fadeMotion}
          as="form"
          bg="bg.muted"
          borderWidth={{ base: 0, sm: "1px" }}
          borderColor="border.default"
          borderRadius={{ base: 0, sm: "lg" }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!isDecoding) setIsDecoding(true);
          }}
        >
          <ModalHeader
            fontSize="md"
            fontWeight="semibold"
            pt={5}
            pb={1}
            pr={12}
          >
            Enter raw calldata
          </ModalHeader>
          <ModalCloseButton isDisabled={isDecoding} />
          <ModalBody pt={0}>
            <Text fontSize="sm" color="text.secondary" mb={3}>
              Decode calldata into editable function parameters.
            </Text>
            <Textarea
              isReadOnly={isDecoding}
              ref={inputRef}
              aria-label="Calldata to decode"
              placeholder="0x…"
              value={data}
              rows={5}
              resize="vertical"
              maxLength={2 + MAX_CALLDATA_BYTES * 2}
              fontFamily="mono"
              fontSize="sm"
              bg="bg.subtle"
              spellCheck={false}
              onChange={(event) => {
                setData(event.target.value);
                setError("");
                onPrefill(null);
              }}
            />
            {error && (
              <Text role="alert" color="red.300" fontSize="sm" mt={3}>
                {error}
              </Text>
            )}
          </ModalBody>
          <ModalFooter pt={3} pb={4}>
            <Button type="submit" size="sm" isLoading={isDecoding} loadingText="Decoding…">
              Fill parameters
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
