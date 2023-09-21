"use client";

import React, { useState } from "react";
import {
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  Input,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { parseEther, parseGwei, formatEther, formatGwei } from "viem";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const Label = ({ children }: { children: React.ReactNode }) => (
  <Td textAlign={"center"}>{children}</Td>
);

const InputField = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <Td>
    <InputGroup>
      <Input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <InputRightElement pr={1}>
        <CopyToClipboard textToCopy={value ?? ""} />
      </InputRightElement>
    </InputGroup>
  </Td>
);

const ETHUnitConverter = () => {
  const [wei, setWei] = useState<string>();
  const [gwei, setGwei] = useState<string>();
  const [eth, setEth] = useState<string>();

  const handleOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    valueToWei: (value: string) => string
  ) => {
    const value = e.target.value;

    if (value.length > 0) {
      const wei = valueToWei(value);
      setValues(wei);
    } else {
      setWei("");
      setGwei("");
      setEth("");
    }
  };

  const setValues = (inWei: string) => {
    setWei(inWei);

    if (inWei.length > 0) {
      setGwei(formatGwei(BigInt(inWei)));
      setEth(formatEther(BigInt(inWei)));
    } else {
      setGwei("");
      setEth("");
    }
  };

  return (
    <Layout>
      <Heading>ETH Unit Converter</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Wei</Label>
            <InputField
              placeholder="Wei"
              value={wei}
              onChange={(e) => handleOnChange(e, (value) => value)}
            />
          </Tr>
          <Tr>
            <Label>Gwei</Label>
            <InputField
              placeholder="Gwei"
              value={gwei}
              onChange={(e) =>
                handleOnChange(e, (value) => parseGwei(value).toString())
              }
            />
          </Tr>
          <Tr>
            <Label>Ether</Label>
            <InputField
              placeholder="Ether"
              value={eth}
              onChange={(e) =>
                handleOnChange(e, (value) => parseEther(value).toString())
              }
            />
          </Tr>
        </Tbody>
      </Table>
    </Layout>
  );
};

export default ETHUnitConverter;
