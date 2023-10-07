"use client";

import React, { useState } from "react";
import { Heading, Table, Tbody, Tr, Td } from "@chakra-ui/react";
import { parseEther, parseGwei, formatEther, formatGwei } from "viem";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";

const ETHUnitConverter = () => {
  const [wei, setWei] = useState<string>();
  const [gwei, setGwei] = useState<string>();
  const [eth, setEth] = useState<string>();

  const handleOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    unit: "wei" | "gwei" | "eth",
    valueToWei: (value: string) => string
  ) => {
    const value = e.target.value;

    // Directly set the value of the unit that is being changed
    // to handle cases like 0.0000 ETH to not be converted to 0 ETH due to parsing
    // setting what was input by user as it is, and excluding it in the setValues function
    if (unit === "wei") setWei(value);
    else if (unit === "gwei") setGwei(value);
    else if (unit === "eth") setEth(value);

    if (value.length > 0) {
      const wei = valueToWei(value);
      setValues(wei, unit);
    } else {
      setWei("");
      setGwei("");
      setEth("");
    }
  };

  const setValues = (inWei: string, exceptUnit: "wei" | "gwei" | "eth") => {
    setWei(inWei);

    if (inWei.length > 0) {
      if (exceptUnit !== "gwei") setGwei(formatGwei(BigInt(inWei)));
      if (exceptUnit !== "eth") setEth(formatEther(BigInt(inWei)));
    } else {
      setGwei("");
      setEth("");
    }
  };

  return (
    <>
      <Heading color={"custom.pale"}>ETH Unit Converter</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Wei</Label>
            <Td>
              <InputField
                type="number"
                placeholder="Wei"
                value={wei}
                onChange={(e) => handleOnChange(e, "wei", (value) => value)}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Gwei</Label>
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
            <Label>Ether</Label>
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
          </Tr>
        </Tbody>
      </Table>
    </>
  );
};

export default ETHUnitConverter;
