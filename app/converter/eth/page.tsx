"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import {
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  Text,
  Input,
  Box,
} from "@chakra-ui/react";
import { parseAsString, useQueryState } from "next-usequerystate";
import {
  parseEther,
  parseGwei,
  parseUnits,
  formatEther,
  formatGwei,
  formatUnits,
} from "viem";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { useLocalStorage } from "usehooks-ts";

function ETHUnitConverterContent() {
  const searchParams = useSearchParams();
  const weiFromUrl = searchParams.get("wei");

  const [wei, setWei] = useQueryState<string>(
    "wei",
    parseAsString.withDefault(weiFromUrl ?? "")
  );
  const [gwei, setGwei] = useState<string>();
  const [eth, setEth] = useState<string>();
  const [szabo, setSzabo] = useState<string>();
  const [unit, setUnit] = useState<string>();
  const [usd, setUsd] = useState<string>();
  const [exponent, setExponent] = useState<number>(6);

  const [ethPrice, setEthPrice] = useLocalStorage("ethPrice", 0);

  const handleOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    unit: "wei" | "gwei" | "szabo" | "eth" | "unit" | "usd",
    valueToWei: (value: string) => string
  ) => {
    const value = e.target.value;

    // Directly set the value of the unit that is being changed
    // to handle cases like 0.0000 ETH to not be converted to 0 ETH due to parsing
    // setting what was input by user as it is, and excluding it in the setValues function
    if (unit === "wei") setWei(value);
    else if (unit === "gwei") setGwei(value);
    else if (unit === "eth") setEth(value);
    else if (unit === "szabo") setSzabo(value);
    else if (unit === "unit") setUnit(value);
    else if (unit === "usd") setUsd(value);

    if (value.length > 0) {
      const wei = valueToWei(value);
      setValues(wei, unit);
    } else {
      setWei("");
      setGwei("");
      setEth("");
      setUnit("");
      setUsd("");
    }
  };

  const setValues = (
    inWei: string,
    exceptUnit: "wei" | "gwei" | "szabo" | "eth" | "unit" | "usd"
  ) => {
    setWei(inWei);

    if (inWei.length > 0) {
      if (exceptUnit !== "gwei") setGwei(formatGwei(BigInt(inWei)));
      if (exceptUnit !== "eth") setEth(formatEther(BigInt(inWei)));
      if (exceptUnit !== "szabo") setSzabo(formatUnits(BigInt(inWei), 12));
      if (exceptUnit !== "unit") {
        const unitValue = formatUnits(BigInt(inWei), exponent);
        setUnit(unitValue);
      }
      if (exceptUnit !== "usd") {
        const eth = formatEther(BigInt(inWei));
        setUsd((parseFloat(eth) * ethPrice).toString());
      }
    } else {
      setGwei("");
      setEth("");
      setSzabo("");
      setUnit("");
      setUsd("");
    }
  };

  const setPrices = async () => {
    const token = "ethereum";
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      setEthPrice(data[token].usd);
    } catch (error) {}
  };

  const recalculateUnit = () => {
    if (wei) {
      const unitValue = formatUnits(BigInt(wei), exponent);
      setUnit(unitValue);
    }
  };

  useEffect(() => {
    setPrices();
  }, []);

  useEffect(() => {
    if (weiFromUrl) {
      handleOnChange(
        {
          target: { value: weiFromUrl },
        } as React.ChangeEvent<HTMLInputElement>,
        "wei",
        (value) => value
      );
    }
  }, []);

  useEffect(() => {
    recalculateUnit();
  }, [exponent]);

  return (
    <>
      <Heading color={"custom.pale"}>ETH Unit Converter</Heading>
      <Table
        mt={"3rem"}
        variant="unstyled"
        style={{ borderCollapse: "separate", borderSpacing: "0 0.75em" }}
      >
        <Tbody>
          <Tr>
            <Label>
              <Text>Wei</Text>
              <Text opacity={0.6}>(10^18)</Text>
            </Label>
            <Td>
              <InputField
                autoFocus
                type="number"
                placeholder="Wei"
                value={wei}
                onChange={(e) => handleOnChange(e, "wei", (value) => value)}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>
              <Text>Gwei</Text>
              <Text opacity={0.6}>(10^9)</Text>
            </Label>
            <Td>
              <InputField
                type="number"
                placeholder="Gwei"
                value={gwei}
                onChange={(e) =>
                  handleOnChange(e, "gwei", (value) =>
                    parseGwei(value).toString()
                  )
                }
              />
            </Td>
          </Tr>
          <Tr>
            <Label>
              <Text>Szabo</Text>
              <Text opacity={0.6}>(10^12)</Text>
            </Label>
            <Td>
              <InputField
                type="number"
                placeholder="Szabo"
                value={szabo}
                onChange={(e) =>
                  handleOnChange(e, "szabo", (value) =>
                    parseUnits(value, 12).toString()
                  )
                }
              />
            </Td>
          </Tr>
          <Tr>
            <Label>
              <Box display="inline-flex" alignItems="center">
                <Text>10^</Text>
                <Input
                  type="number"
                  placeholder="Enter custom exponent"
                  value={exponent.toString()}
                  onChange={(e) => {
                    const newExponent = Number(e.target.value);
                    if (!isNaN(newExponent) && newExponent >= 0) {
                      setExponent(newExponent);
                    }
                  }}
                  width="55px"
                />
              </Box>
            </Label>
            <Td>
              <InputField
                type="number"
                placeholder={`10^${exponent}`}
                value={unit}
                onChange={(e) =>
                  handleOnChange(e, "unit", (value) =>
                    parseUnits(value, exponent).toString()
                  )
                }
              />
            </Td>
          </Tr>

          <Tr bg="whiteAlpha.100">
            <Label roundedTopLeft={"md"} roundedBottomLeft={"md"}>
              <Text>Ether</Text>
              <Text opacity={0.6}>(1)</Text>
            </Label>
            <Td roundedTopRight={"md"} roundedBottomRight={"md"}>
              <InputField
                type="number"
                placeholder="Ether"
                value={eth}
                onChange={(e) =>
                  handleOnChange(e, "eth", (value) =>
                    parseEther(value).toString()
                  )
                }
              />
            </Td>
          </Tr>
          <Tr>
            <Label>
              <Text>USD</Text>
              <Text opacity={0.6}>
                (1 ETH ={" "}
                {ethPrice.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
                )
              </Text>
            </Label>
            <Td>
              <InputField
                type="number"
                placeholder="USD"
                value={usd}
                onChange={(e) =>
                  handleOnChange(e, "usd", (value) => {
                    const eth = parseFloat(value) / ethPrice;
                    return parseEther(eth.toString()).toString();
                  })
                }
              />
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </>
  );
}

export default function ETHUnitConverter() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ETHUnitConverterContent />
    </Suspense>
  );
}
