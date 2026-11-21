import { useState, useEffect } from "react";
import { Skeleton, Stack } from "@chakra-ui/react";
import { decodeRecursive } from "@/lib/decoder";
import { startHexWith0x } from "@/utils";
import { renderParams } from "../renderParams";
import { BytesParam } from "./BytesParam";

export const CalldataParam = ({
  value,
  chainId,
  variant = "surface",
}: {
  value: any;
  chainId?: number;
  variant?: "surface" | "plain";
}) => {
  // abi.encode bytes
  const [result, setResult] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setResult(undefined);
    setIsLoading(true);
    if (value) {
      decodeRecursive({ calldata: startHexWith0x(value as string) })
        .then((res) => {
          if (!cancelled) {
            setResult(res);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setIsLoading(false);
        });
    }
    return () => { cancelled = true; };
  }, [value]);

  return result ? (
    <Stack
      mt={2}
      p={variant === "surface" ? 4 : 0}
      spacing={4}
      bg={variant === "surface" ? "whiteAlpha.50" : undefined}
      rounded={variant === "surface" ? "lg" : undefined}
      minW={0}
    >
      {result.args.map((arg: any, i: number) => {
        return renderParams(i, arg, chainId, variant);
      })}
    </Stack>
  ) : !isLoading ? (
    <BytesParam
      arg={
        value === null || value === undefined
          ? value
          : { rawValue: value, value: { decoded: null } }
      }
      chainId={chainId}
    />
  ) : (
    <Skeleton h={"5rem"} rounded={"lg"} />
  );
};
