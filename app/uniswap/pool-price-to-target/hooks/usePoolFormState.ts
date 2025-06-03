import { useLocalStorage } from "usehooks-ts";
import { zeroHash } from "viem";

export function usePoolFormState() {
  const [currency0, setCurrency0] = useLocalStorage<string>(
    "uniswap-currency0",
    ""
  );
  const [currency1, setCurrency1] = useLocalStorage<string>(
    "uniswap-currency1",
    ""
  );
  const [tickSpacing, setTickSpacing] = useLocalStorage<number>(
    "uniswap-tickSpacing",
    60
  );
  const [fee, setFee] = useLocalStorage<number>("uniswap-fee", 3000);
  const [hookAddress, setHookAddress] = useLocalStorage<string>(
    "uniswap-hookAddress",
    ""
  );
  const [hookData, setHookData] = useLocalStorage<string>(
    "uniswap-hookData",
    zeroHash
  );

  return {
    currency0,
    setCurrency0,
    currency1,
    setCurrency1,
    tickSpacing,
    setTickSpacing,
    fee,
    setFee,
    hookAddress,
    setHookAddress,
    hookData,
    setHookData,
  };
}
