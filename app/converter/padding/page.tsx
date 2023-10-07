"use client";

import { useState } from "react";
import { Heading, Table, Tbody, Tr, Td } from "@chakra-ui/react";
import { pad } from "viem";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { startHexWith0x } from "@/utils";

const Padding = () => {
  const [userInput, setUserInput] = useState<string>();
  const [leftPadded, setLeftPadded] = useState<string>();
  const [rightPadded, setRightPadded] = useState<string>();

  return (
    <>
      <Heading color={"custom.pale"}>Padding</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Input</Label>
            <Td>
              <InputField
                placeholder="hex value"
                value={userInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setUserInput(value);

                  const inHex = startHexWith0x(value);

                  setLeftPadded(pad(inHex));
                  setRightPadded(pad(inHex, { dir: "right" }));
                }}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Left Padded (32 bytes)</Label>
            <Td>
              <InputField
                placeholder="left padded"
                minW="18rem"
                value={leftPadded}
                onChange={() => {}}
                isReadOnly
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Right Padded (32 bytes)</Label>
            <Td>
              <InputField
                placeholder="right padded"
                minW="18rem"
                value={rightPadded}
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

export default Padding;
