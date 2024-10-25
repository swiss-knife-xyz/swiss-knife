"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputRightAddon,
  Spacer,
  Table,
  Tbody,
  Td,
  Tr,
} from "@chakra-ui/react";
import { Address, parseUnits, zeroHash, erc20Abi } from "viem";
import {
  useAccount,
  useWalletClient,
  useSwitchChain,
  useReadContracts,
  useSimulateContract,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { baseSepolia } from "viem/chains";
import { chainIdToChain } from "@/data/common";

const quoterAbi = [
  {
    inputs: [
      {
        internalType: "contract IPoolManager",
        name: "_poolManager",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [], name: "InsufficientAmountOut", type: "error" },
  { inputs: [], name: "InvalidLockCaller", type: "error" },
  { inputs: [], name: "InvalidQuoteBatchParams", type: "error" },
  { inputs: [], name: "LockFailure", type: "error" },
  { inputs: [], name: "NotPoolManager", type: "error" },
  { inputs: [], name: "NotSelf", type: "error" },
  {
    inputs: [{ internalType: "bytes", name: "revertData", type: "bytes" }],
    name: "UnexpectedRevertBytes",
    type: "error",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "exactCurrency", type: "address" },
          {
            components: [
              {
                internalType: "Currency",
                name: "intermediateCurrency",
                type: "address",
              },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
              { internalType: "bytes", name: "hookData", type: "bytes" },
            ],
            internalType: "struct PathKey[]",
            name: "path",
            type: "tuple[]",
          },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
        ],
        internalType: "struct IQuoter.QuoteExactParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "_quoteExactInput",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IQuoter.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "_quoteExactInputSingle",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "exactCurrency", type: "address" },
          {
            components: [
              {
                internalType: "Currency",
                name: "intermediateCurrency",
                type: "address",
              },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
              { internalType: "bytes", name: "hookData", type: "bytes" },
            ],
            internalType: "struct PathKey[]",
            name: "path",
            type: "tuple[]",
          },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
        ],
        internalType: "struct IQuoter.QuoteExactParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "_quoteExactOutput",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IQuoter.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "_quoteExactOutputSingle",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "poolManager",
    outputs: [
      { internalType: "contract IPoolManager", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "exactCurrency", type: "address" },
          {
            components: [
              {
                internalType: "Currency",
                name: "intermediateCurrency",
                type: "address",
              },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
              { internalType: "bytes", name: "hookData", type: "bytes" },
            ],
            internalType: "struct PathKey[]",
            name: "path",
            type: "tuple[]",
          },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
        ],
        internalType: "struct IQuoter.QuoteExactParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInput",
    outputs: [
      { internalType: "int128[]", name: "deltaAmounts", type: "int128[]" },
      {
        internalType: "uint160[]",
        name: "sqrtPriceX96AfterList",
        type: "uint160[]",
      },
      {
        internalType: "uint32[]",
        name: "initializedTicksLoadedList",
        type: "uint32[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IQuoter.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { internalType: "int128[]", name: "deltaAmounts", type: "int128[]" },
      { internalType: "uint160", name: "sqrtPriceX96After", type: "uint160" },
      {
        internalType: "uint32",
        name: "initializedTicksLoaded",
        type: "uint32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "exactCurrency", type: "address" },
          {
            components: [
              {
                internalType: "Currency",
                name: "intermediateCurrency",
                type: "address",
              },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
              { internalType: "bytes", name: "hookData", type: "bytes" },
            ],
            internalType: "struct PathKey[]",
            name: "path",
            type: "tuple[]",
          },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
        ],
        internalType: "struct IQuoter.QuoteExactParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactOutput",
    outputs: [
      { internalType: "int128[]", name: "deltaAmounts", type: "int128[]" },
      {
        internalType: "uint160[]",
        name: "sqrtPriceX96AfterList",
        type: "uint160[]",
      },
      {
        internalType: "uint32[]",
        name: "initializedTicksLoadedList",
        type: "uint32[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IQuoter.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactOutputSingle",
    outputs: [
      { internalType: "int128[]", name: "deltaAmounts", type: "int128[]" },
      { internalType: "uint160", name: "sqrtPriceX96After", type: "uint160" },
      {
        internalType: "uint32",
        name: "initializedTicksLoaded",
        type: "uint32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
    name: "unlockCallback",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const quoterAddress: Record<number, Address> = {
  [baseSepolia.id]: "0xf3A39C86dbd13C45365E57FB90fe413371F65AF8",
};

const PoolPriceToTarget = () => {
  const { data: walletClient } = useWalletClient();
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  const chainNotSupported = chain && !quoterAddress[chain.id];

  const [currency0, setCurrency0] = useState<string | undefined>();
  const [currency1, setCurrency1] = useState<string | undefined>();
  const [tickSpacing, setTickSpacing] = useState<number | undefined>();
  const [fee, setFee] = useState<number | undefined>();
  const [hookAddress, setHookAddress] = useState<string | undefined>();
  const [hookData, setHookData] = useState<string | undefined>(zeroHash);

  const [currency0Symbol, setCurrency0Symbol] = useState<string | undefined>();
  const [currency0Decimals, setCurrency0Decimals] = useState<
    number | undefined
  >();
  const [currency1Symbol, setCurrency1Symbol] = useState<string | undefined>();
  const [currency1Decimals, setCurrency1Decimals] = useState<
    number | undefined
  >();

  const [currentZeroForOnePrice, setCurrentZeroForOnePrice] = useState<
    string | undefined
  >();
  const [currentOneForZeroPrice, setCurrentOneForZeroPrice] = useState<
    string | undefined
  >();
  const [targetPrice, setTargetPrice] = useState<string | undefined>();

  const [fetchingCurrentPrice, setFetchingCurrentPrice] = useState(false);

  const { data: currencyInfo } = useReadContracts({
    contracts: [
      {
        address: currency0 as Address,
        abi: erc20Abi,
        functionName: "symbol",
      },
      {
        address: currency0 as Address,
        abi: erc20Abi,
        functionName: "decimals",
      },
      {
        address: currency1 as Address,
        abi: erc20Abi,
        functionName: "symbol",
      },
      {
        address: currency1 as Address,
        abi: erc20Abi,
        functionName: "decimals",
      },
    ],
    query: {
      enabled: !!currency0 && !!currency1,
    },
  });

  const result = useSimulateContract({
    address: quoterAddress[chain!.id],
    abi: quoterAbi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        poolKey: {
          currency0: currency0 as Address,
          currency1: currency1 as Address,
          tickSpacing: tickSpacing!,
          fee: fee!,
          hooks: hookAddress as Address,
        },
        exactAmount: parseUnits(amount, decimals),
        hookData: hookData,
        sqrtPriceLimitX96: 0n,
        zeroForOne,
      },
    ],
    query: {
      enabled:
        !!currency0 &&
        !!currency1 &&
        !hookAddress &&
        tickSpacing !== undefined &&
        fee !== undefined,
    },
  });

  useEffect(() => {
    if (currencyInfo) {
      setCurrency0Symbol(currencyInfo[0].result);
      setCurrency0Decimals(currencyInfo[1].result);
      setCurrency1Symbol(currencyInfo[2].result);
      setCurrency1Decimals(currencyInfo[3].result);
    }
  }, [currencyInfo]);

  return (
    <>
      <Heading color={"custom.pale"}>UniV4 Pool Price to Target</Heading>
      <Flex w="100%" mt={4}>
        <Spacer />
        <ConnectButton />
      </Flex>
      <Table variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Td>currency0</Td>
            <Td>
              <InputGroup>
                <Input
                  value={currency0}
                  onChange={(e) => setCurrency0(e.target.value)}
                />
                {currency0Symbol && (
                  <InputRightAddon>
                    <Center flexDir={"column"}>
                      <Box>{currency0Symbol}</Box>
                      <Box fontSize={"xs"}>({currency0Decimals} decimals)</Box>
                    </Center>
                  </InputRightAddon>
                )}
              </InputGroup>
            </Td>
          </Tr>
          <Tr>
            <Td>currency1</Td>
            <Td>
              <InputGroup>
                <Input
                  value={currency1}
                  onChange={(e) => setCurrency1(e.target.value)}
                />
                {currency1Symbol && (
                  <InputRightAddon>
                    <Center flexDir={"column"}>
                      <Box>{currency1Symbol}</Box>
                      <Box fontSize={"xs"}>({currency1Decimals} decimals)</Box>
                    </Center>
                  </InputRightAddon>
                )}
              </InputGroup>
            </Td>
          </Tr>
          <Tr>
            <Td>tickSpacing</Td>
            <Td>
              <Input
                value={tickSpacing}
                onChange={(e) => setTickSpacing(Number(e.target.value))}
              />
            </Td>
          </Tr>
          <Tr>
            <Td>fee</Td>
            <Td>
              <Input
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
              />
            </Td>
          </Tr>
          <Tr>
            <Td>hookAddress</Td>
            <Td>
              <Input
                value={hookAddress}
                onChange={(e) => setHookAddress(e.target.value)}
              />
            </Td>
          </Tr>
          <Tr>
            <Td>hookData</Td>
            <Td>
              <Input
                value={hookData}
                onChange={(e) => setHookData(e.target.value)}
              />
            </Td>
          </Tr>
          <Tr>
            <Td colSpan={2}>
              <Divider />
            </Td>
          </Tr>
          <Tr>
            <Td colSpan={2}>
              <Center flexDir={"column"}>
                <Button
                  isDisabled={!walletClient || chainNotSupported}
                  onClick={() => getCurrentPrice()}
                  isLoading={fetchingCurrentPrice}
                >
                  {!walletClient
                    ? "Connect Wallet first"
                    : chainNotSupported
                    ? "Chain Not Supported"
                    : "Get Current Price"}
                </Button>
                {chainNotSupported && (
                  <Box mt={4}>
                    <Box>Supported Chains:</Box>
                    <Box mt={2}>
                      {Object.keys(quoterAddress)
                        .map((chainId) => parseInt(chainId))
                        .map((chainId) => (
                          <Button
                            key={chainId}
                            onClick={() => switchChain?.({ chainId })}
                          >
                            {chainIdToChain[chainId].name}
                          </Button>
                        ))}
                    </Box>
                  </Box>
                )}
              </Center>
            </Td>
          </Tr>
          {currentZeroForOnePrice && (
            <Tr>
              <Td colSpan={2}>
                <Heading size={"md"}>
                  zeroForOne: {currentZeroForOnePrice}
                </Heading>
              </Td>
            </Tr>
          )}
          {currentOneForZeroPrice && (
            <Tr>
              <Td colSpan={2}>
                <Heading size={"md"}>
                  oneForZero: {currentOneForZeroPrice}
                </Heading>
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </>
  );
};

export default PoolPriceToTarget;
