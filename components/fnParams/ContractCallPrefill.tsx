"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Text, Textarea } from "@chakra-ui/react";
import type { JsonFragment } from "ethers";
import {
  contractFunctionSignature,
  decodeContractCall,
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
  onPrefill: (call: PrefilledCall | null) => void;
  hasActivePrefill?: boolean;
};

export function ContractCallPrefill({
  chainId,
  address,
  selectedAbi,
  contractAbi,
  implementationAbi,
  abiMode,
  onPrefill,
  hasActivePrefill = true,
}: Props) {
  const [data, setData] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState<PrefilledCall | null>(null);
  const [reviewAbi, setReviewAbi] = useState<readonly JsonFragment[] | null>(
    null
  );

  const apply = useCallback(
    (
      data: string,
      abi: readonly JsonFragment[] | null,
      mode: CallReview["abiMode"],
      value = "0",
      signature?: string
    ) => {
      if (!abi)
        throw new Error(
          "A verified ABI context is required to decode. Inferred signatures are not trusted."
        );
      const decoded = decodeContractCall(abi, data);
      if (signature && decoded.signature !== signature)
        throw new Error(
          "Shared function signature does not match the loaded ABI and calldata."
        );
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
      )
        throw new Error(
          "Shared value is nonzero but the decoded function is not payable."
        );
      const call = { ...decoded, value, abiMode: mode };
      setError("");
      setReview(call);
      setReviewAbi(abi);
      onPrefill(call);
    },
    [onPrefill]
  );

  const fail = useCallback(
    (error: unknown) => {
      setReview(null);
      onPrefill(null);
      setError(
        error instanceof Error ? error.message : "Unable to decode calldata."
      );
    },
    [onPrefill]
  );

  useEffect(() => {
    const restore = () => {
      try {
        const shared = parseContractCallFragment(window.location.hash);
        if (!shared) {
          setReview(null);
          setError("");
          onPrefill(null);
          return;
        }
        setData(shared.data);
        const abi =
          shared.abiMode === "implementation" ? implementationAbi : contractAbi;
        if (!abi)
          throw new Error(
            "Shared ABI context is unavailable for this contract."
          );
        apply(shared.data, abi, shared.abiMode, shared.value, shared.signature);
      } catch (error) {
        fail(error);
      }
    };
    restore();
    window.addEventListener("hashchange", restore);
    // Next's same-page back/forward can replace the fragment via history state.
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("hashchange", restore);
      window.removeEventListener("popstate", restore);
    };
  }, [contractAbi, implementationAbi, apply, fail, onPrefill]);

  return (
    <Box mb={4} p={4} borderWidth="1px" rounded="lg">
      <Text fontWeight="bold" mb={2}>
        Decode a contract call
      </Text>
      <Text fontSize="sm" mb={2}>
        Uses only the loaded ABI. Decoding fills a form; it never signs or
        sends. Inferred signatures cannot be used for decoding.
      </Text>
      <Textarea
        aria-label="Calldata to decode"
        placeholder="0x…"
        value={data}
        maxLength={2 + MAX_CALLDATA_BYTES * 2}
        fontFamily="mono"
        onChange={(e) => {
          setData(e.target.value);
          setError("");
          setReview(null);
          onPrefill(null);
        }}
      />
      <Button
        mt={2}
        onClick={() => {
          try {
            apply(data, selectedAbi, abiMode);
          } catch (error) {
            fail(error);
          }
        }}
      >
        Decode into form
      </Button>
      {error && (
        <Text role="alert" color="red.300" mt={2}>
          {error}
        </Text>
      )}
      {hasActivePrefill &&
        review &&
        reviewAbi === selectedAbi &&
        review.abiMode === abiMode && (
          <Box role="status" mt={3} overflowWrap="anywhere">
            <Text fontWeight="bold">Review only — untrusted call details</Text>
            <Text>
              Chain: {chainId} · Contract: {address}
            </Text>
            <Text>
              Imported function: {review.signature} · ABI: {review.abiMode} ·
              Imported value (wei): {review.value}
            </Text>
            <Text>
              Verify the destination, ABI, arguments and value independently. No
              sender or simulation result is restored, and no transaction has
              been sent.
            </Text>
          </Box>
        )}
    </Box>
  );
}
