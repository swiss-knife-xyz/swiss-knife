"use client";

import { useState } from "react";
import { Heading, Table, Tbody, Tr, Td } from "@chakra-ui/react";
import { Hex, toHex, keccak256 as toKeccak256 } from "viem";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";

const Keccak256 = () => {
  const [userInput, setUserInput] = useState<string>();
  const [keccak256, setKeccak256] = useState<string>();

  return (
    <>
      <Heading color={"custom.pale"}>Keccak256 Converter</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Input</Label>
            <Td>
              <InputField
                autoFocus
                placeholder="string or hex (starting with 0x)"
                value={userInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setUserInput(value);

                  const inHex = value.startsWith("0x")
                    ? (value as Hex)
                    : toHex(value);
                  setKeccak256(toKeccak256(inHex));
                }}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Keccak256</Label>
            <Td>
              <InputField
                placeholder="Keccak256"
                value={keccak256}
                onChange={() => {}}
                isReadOnly
              />
            </Td>
          </Tr>
          <Tr>
            <Label>4 Bytes</Label>
            <Td>
              <InputField
                placeholder="first 4 bytes after Keccak256"
                value={keccak256 ? keccak256.slice(0, 10) : ""}
                onChange={() => {}}
                isReadOnly
              />
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </>
  );
};

export default Keccak256;
