"use client";

import { useState } from "react";
import { Heading, Table, Tbody, Tr, Td } from "@chakra-ui/react";
import { isHex, pad } from "viem";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { startHexWith0x } from "@/utils";

const Padding = () => {
  const [userInput, setUserInput] = useState<string>();
  const [leftPadded, setLeftPadded] = useState<string>();
  const [rightPadded, setRightPadded] = useState<string>();

  const [isHexadecimalInvalid, setIsHexadecimalInvalid] =
    useState<boolean>(false);

  const checkInvalidHex = (value?: string): boolean => {
    value = value ?? "";

    return !isHex(startHexWith0x(value));
  };

  return (
    <>
      <Heading color={"custom.pale"}>Padding</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Input</Label>
            <Td>
              <InputField
                autoFocus
                placeholder="hex value"
                value={userInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setUserInput(value);

                  const isInvalid = checkInvalidHex(value);
                  if (!isInvalid) {
                    const inHex = startHexWith0x(value);

                    setLeftPadded(pad(inHex));
                    setRightPadded(pad(inHex, { dir: "right" }));

                    if (isHexadecimalInvalid) setIsHexadecimalInvalid(false);
                  } else {
                    setIsHexadecimalInvalid(true);
                  }
                }}
                isInvalid={isHexadecimalInvalid}
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
