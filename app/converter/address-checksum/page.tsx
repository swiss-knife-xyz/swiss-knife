"use client";

import { useState } from "react";
import { Heading, Table, Tbody, Tr, Td } from "@chakra-ui/react";
import { checksumAddress, Hex } from "viem";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";

const AddressChecksum = () => {
  const [userInput, setUserInput] = useState<string>();
  const [checksummed, setChecksummed] = useState<string>();
  const [lowercased, setLowercased] = useState<string>();

  return (
    <>
      <Heading color={"custom.pale"}>Address Checksum</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Input</Label>
            <Td>
              <InputField
                autoFocus
                placeholder="address"
                value={userInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setUserInput(value);

                  if (value) {
                    setChecksummed(checksumAddress(value as Hex));
                    setLowercased(value.toLowerCase());
                  } else {
                    setChecksummed("");
                    setLowercased("");
                  }
                }}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Checksum Address</Label>
            <Td>
              <InputField
                placeholder="checksum address"
                value={checksummed}
                onChange={() => {}}
                isReadOnly
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Lowercase Address</Label>
            <Td>
              <InputField
                placeholder="lowercase address"
                value={lowercased}
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

export default AddressChecksum;
