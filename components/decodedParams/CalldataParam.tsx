import { useState, useEffect } from "react";
import { Skeleton, Stack } from "@chakra-ui/react";
import { decodeRecursive } from "@/lib/decoder";
import { startHexWith0x } from "@/utils";
import { renderParams } from "../renderParams";
import { BytesParam } from "./BytesParam";

export const CalldataParam = ({
  value,
  chainId,
}: {
  value: any;
  chainId?: number;
}) => {
  // abi.encode bytes
  const [result, setResult] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);

  const decode = async () => {
    if (!value) {
      return;
    }

    const res = await decodeRecursive({
      calldata: startHexWith0x(value as string),
    });
    setResult(res);
    setIsLoading(false);
  };

  useEffect(() => {
    decode();
  }, [value]);

  return result ? (
    <Stack mt={2} p={4} spacing={4} bg={"whiteAlpha.50"} rounded={"lg"}>
      {result.args.map((arg: any, i: number) => {
        return renderParams(i, arg, chainId);
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
