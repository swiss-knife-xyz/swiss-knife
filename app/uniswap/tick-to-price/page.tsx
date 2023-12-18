"use client";

import { useEffect, useState } from "react";
import {
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  FormControl,
  FormLabel,
  Center,
  Input,
  Stack,
  Box,
  Text,
  useUpdateEffect,
} from "@chakra-ui/react";

const TokenInput = ({
  title,
  tokenName,
  tokenAddress,
  tokenDecimals,
  setTokenName,
  setTokenAddress,
  setTokenDecimals,
}: {
  title: string;
  tokenName: string | undefined;
  tokenAddress: string | undefined;
  tokenDecimals: number | undefined;
  setTokenName: (val?: string) => void;
  setTokenAddress: (val?: string) => void;
  setTokenDecimals: (val?: number) => void;
}) => {
  return (
    <>
      <Center>{title}</Center>
      <Stack spacing={4} px={6}>
        <FormControl>
          <FormLabel>Name</FormLabel>
          <Input
            placeholder="USDC"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Address</FormLabel>
          <Input
            placeholder="0x00..."
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Decimals</FormLabel>
          <Input
            type="number"
            placeholder="18"
            value={tokenDecimals}
            onChange={(e) => setTokenDecimals(parseInt(e.target.value))}
          />
        </FormControl>
      </Stack>
    </>
  );
};

const TickToPrice = () => {
  const [tokenAName, setTokenAName] = useState<string | undefined>();
  const [tokenAAddress, setTokenAAddress] = useState<string | undefined>();
  const [tokenADecimals, setTokenADecimals] = useState<number | undefined>();

  const [tokenBName, setTokenBName] = useState<string | undefined>();
  const [tokenBAddress, setTokenBAddress] = useState<string | undefined>();
  const [tokenBDecimals, setTokenBDecimals] = useState<number | undefined>();

  const [tickInput, setTickInput] = useState<string>();

  const [isTokenA0, setIsTokenA0] = useState<boolean>(false);
  const [token1PerToken0InDecimals, setToken1PerToken0InDecimals] =
    useState<number>();

  // localstorage cannot be accessed server side, so using it inside useEffect after page has loaded
  useEffect(() => {
    setTokenAName(localStorage.getItem("tokenAName") ?? undefined);
    setTokenAAddress(localStorage.getItem("tokenAAddress") ?? undefined);
    setTokenADecimals(
      localStorage.getItem("tokenADecimals")
        ? parseInt(localStorage.getItem("tokenADecimals")!)
        : undefined
    );
    setTokenBName(localStorage.getItem("tokenBName") ?? undefined);
    setTokenBAddress(localStorage.getItem("tokenBAddress") ?? undefined);
    setTokenBDecimals(
      localStorage.getItem("tokenBDecimals")
        ? parseInt(localStorage.getItem("tokenBDecimals")!)
        : undefined
    );
  }, []);

  useEffect(() => {
    if (
      !tokenAAddress ||
      !tokenBAddress ||
      !tickInput ||
      !tokenADecimals ||
      !tokenBDecimals
    )
      return;

    const _isTokenA0 = BigInt(tokenAAddress) < BigInt(tokenBAddress);
    setIsTokenA0(_isTokenA0);

    const price = Math.pow(1.0001, parseInt(tickInput));

    const token0Decimals = _isTokenA0 ? tokenADecimals : tokenBDecimals;
    const token1Decimals = _isTokenA0 ? tokenBDecimals : tokenADecimals;

    setToken1PerToken0InDecimals(
      (price * 10 ** token0Decimals) / 10 ** token1Decimals
    );
  }, [tokenAAddress, tokenBAddress, tickInput, tokenADecimals, tokenBDecimals]);

  // keep localstorage in sync with the state
  useUpdateEffect(() => {
    if (tokenAName) {
      localStorage.setItem("tokenAName", tokenAName);
    } else {
      localStorage.removeItem("tokenAName");
    }
  }, [tokenAName]);

  useUpdateEffect(() => {
    if (tokenAAddress) {
      localStorage.setItem("tokenAAddress", tokenAAddress);
    } else {
      localStorage.removeItem("tokenAAddress");
    }
  }, [tokenAAddress]);

  useUpdateEffect(() => {
    if (tokenADecimals) {
      localStorage.setItem("tokenADecimals", tokenADecimals.toString());
    } else {
      localStorage.removeItem("tokenADecimals");
    }
  }, [tokenADecimals]);

  useUpdateEffect(() => {
    if (tokenBName) {
      localStorage.setItem("tokenBName", tokenBName);
    } else {
      localStorage.removeItem("tokenBName");
    }
  }, [tokenBName]);

  useUpdateEffect(() => {
    if (tokenBAddress) {
      localStorage.setItem("tokenBAddress", tokenBAddress);
    } else {
      localStorage.removeItem("tokenBAddress");
    }
  }, [tokenBAddress]);

  useUpdateEffect(() => {
    if (tokenBDecimals) {
      localStorage.setItem("tokenBDecimals", tokenBDecimals.toString());
    } else {
      localStorage.removeItem("tokenBDecimals");
    }
  }, [tokenBDecimals]);

  return (
    <>
      <Heading color={"custom.pale"}>Tick to Price</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Td>
              <TokenInput
                title={"Token A"}
                tokenName={tokenAName}
                tokenAddress={tokenAAddress}
                tokenDecimals={tokenADecimals}
                setTokenName={setTokenAName}
                setTokenAddress={setTokenAAddress}
                setTokenDecimals={setTokenADecimals}
              />
            </Td>
            <Td>
              <TokenInput
                title={"Token B"}
                tokenName={tokenBName}
                tokenAddress={tokenBAddress}
                tokenDecimals={tokenBDecimals}
                setTokenName={setTokenBName}
                setTokenAddress={setTokenBAddress}
                setTokenDecimals={setTokenBDecimals}
              />
            </Td>
          </Tr>
          <Tr>
            <Td colSpan={2}>
              <Center>
                <FormControl maxW="20rem">
                  <FormLabel>Tick</FormLabel>
                  <Input
                    type="number"
                    placeholder="1800"
                    value={tickInput}
                    onChange={(e) => setTickInput(e.target.value)}
                  />
                </FormControl>
              </Center>
            </Td>
          </Tr>
          {token1PerToken0InDecimals && tokenAName && tokenBName ? (
            <>
              <Tr>
                <Td
                  colSpan={2}
                  borderWidth="2px"
                  borderColor={"whiteAlpha.500"}
                >
                  <Center>
                    <Box>
                      <Text>{`${token1PerToken0InDecimals} ${
                        isTokenA0 ? tokenBName : tokenAName
                      } per 1 ${isTokenA0 ? tokenAName : tokenBName}`}</Text>
                      <Text>{`${1 / token1PerToken0InDecimals} ${
                        isTokenA0 ? tokenAName : tokenBName
                      } per 1 ${isTokenA0 ? tokenBName : tokenAName}`}</Text>
                    </Box>
                  </Center>
                </Td>
              </Tr>
              <Tr>
                <Td colSpan={2} color={"whiteAlpha.700"}>
                  <Center>
                    (token0 = {isTokenA0 ? tokenAName : tokenBName})
                  </Center>
                </Td>
              </Tr>
            </>
          ) : null}
        </Tbody>
      </Table>
    </>
  );
};

export default TickToPrice;
