import { useEffect, useState } from "react";
import { Box, Skeleton } from "@chakra-ui/react";
import type { Arg, DecodeRecursiveResult } from "@/types";
import { decodeRecursive } from "@/lib/decoder";
import { startHexWith0x } from "@/utils";
import { CalldataTree } from "./CalldataTree";

interface DecodedOutput {
  source: string;
  chainId?: number;
  args: Arg[];
}

export const CalldataParam = ({
  value,
  chainId,
}: {
  value: string | null | undefined;
  chainId?: number;
}) => {
  const [output, setOutput] = useState<DecodedOutput>();
  const ready =
    value != null && output?.source === value && output.chainId === chainId;

  useEffect(() => {
    if (value == null) return;
    let cancelled = false;
    const finish = (result: DecodeRecursiveResult) => {
      if (cancelled) return;
      setOutput({
        source: value,
        chainId,
        args: [
          {
            name: "data",
            type: "bytes",
            baseType: "bytes",
            rawValue: value || "0x",
            value: { decoded: result },
          },
        ],
      });
    };
    if (value === "" || value === "0x") finish(null);
    else
      decodeRecursive({ calldata: startHexWith0x(value) })
        .then(finish)
        .catch(() => finish(null));
    return () => {
      cancelled = true;
    };
  }, [value, chainId]);

  return (
    <Box minW={0}>
      {!ready && (
        <Skeleton
          h="4rem"
          w="full"
          rounded="4px"
          role="status"
          aria-label="Decoding output"
        />
      )}
      {/* Retain controls during decoding; never show a previous response as the current one. */}
      <Box hidden={!ready}>
        <CalldataTree
          args={output?.args ?? []}
          chainId={output?.chainId}
          showControls={false}
        />
      </Box>
    </Box>
  );
};
