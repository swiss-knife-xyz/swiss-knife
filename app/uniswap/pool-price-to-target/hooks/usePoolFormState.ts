import { useLocalStorage } from "usehooks-ts";
import { zeroHash } from "viem";
import { PoolConfigLocalStorageKeys } from "../../lib/constants";

export function usePoolFormState() {
  const [currency0, setCurrency0] = useLocalStorage<string>(
    PoolConfigLocalStorageKeys.CURRENCY0,
    ""
  );
  const [currency1, setCurrency1] = useLocalStorage<string>(
    PoolConfigLocalStorageKeys.CURRENCY1,
    ""
  );
  const [tickSpacing, setTickSpacing] = useLocalStorage<number>(
    PoolConfigLocalStorageKeys.TICK_SPACING,
    60
  );
  const [fee, setFee] = useLocalStorage<number>(
    PoolConfigLocalStorageKeys.FEE,
    3000
  );
  const [hookAddress, setHookAddress] = useLocalStorage<string>(
    PoolConfigLocalStorageKeys.HOOK_ADDRESS,
    ""
  );
  const [hookData, setHookData] = useLocalStorage<string>(
    PoolConfigLocalStorageKeys.HOOK_DATA,
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
