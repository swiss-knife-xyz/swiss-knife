"use client";

import { useState } from "react";
import { Heading, Table, Tbody, Tr, Td } from "@chakra-ui/react";
import {
  numberToHex,
  hexToBigInt,
  isHex,
  hexToString,
  stringToHex,
} from "viem";
import bigInt from "big-integer";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { startHexWith0x } from "@/utils";

const Hexadecimal = () => {
  const [hexadecimal, setHexadecimal] = useState<string>();
  const [decimal, setDecimal] = useState<string>();
  const [binary, setBinary] = useState<string>();
  const [text, setText] = useState<string>();

  const [isHexadecimalInvalid, setIsHexadecimalInvalid] =
    useState<boolean>(false);
  const [isBinaryInvalid, setIsBinaryInvalid] = useState<boolean>(false);

  const checkInvalid = (
    unit: "hexadecimal" | "decimal" | "binary" | "text",
    value?: string
  ): boolean => {
    value = value ?? "";

    if (unit === "hexadecimal") {
      return !isHex(startHexWith0x(value));
    } else if (unit === "binary") {
      return /[^01]/.test(value);
    } else {
      // decimal input is of number type, so always valid
      // text input is always valid
      return false;
    }
  };

  const handleOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    unit: "hexadecimal" | "decimal" | "binary" | "text",
    valueToHexadecimal: (value: string) => string
  ) => {
    const value = e.target.value;
    const isInvalid = checkInvalid(unit, value);

    // Directly set the value of the unit that is being changed
    // to handle cases like 0.0000 to not be converted to 0 due to parsing
    // setting what was input by user as it is, and excluding it in the setValues function
    if (unit === "hexadecimal") setHexadecimal(value);
    else if (unit === "decimal") setDecimal(value);
    else if (unit === "binary") setBinary(value);
    else if (unit === "text") setText(value);

    if (isInvalid) {
      if (unit === "hexadecimal") setIsHexadecimalInvalid(true);
      else if (unit === "binary") setIsBinaryInvalid(true);

      return;
    } else {
      if (unit === "hexadecimal") setIsHexadecimalInvalid(false);
      else if (unit === "binary") setIsBinaryInvalid(false);
    }

    if (value.length > 0) {
      const hex = valueToHexadecimal(value);
      setValues(hex, unit);
    } else {
      setHexadecimal("");
      setDecimal("");
      setBinary("");
      setText("");
    }
  };

  const setValues = (
    inHex: string,
    exceptUnit: "hexadecimal" | "decimal" | "binary" | "text"
  ) => {
    setHexadecimal(inHex);

    if (inHex.length > 0) {
      if (exceptUnit !== "decimal")
        setDecimal(hexToBigInt(startHexWith0x(inHex)).toString());
      if (exceptUnit !== "binary")
        setBinary(
          bigInt(inHex.startsWith("0x") ? inHex.slice(2) : inHex, 16).toString(
            2
          )
        );
      if (exceptUnit !== "text") setText(hexToString(startHexWith0x(inHex)));
    } else {
      setDecimal("");
      setBinary("");
      setText("");
    }
  };

  return (
    <>
      <Heading color={"custom.pale"}>Hexadecimal Converter</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Hexadecimal</Label>
            <Td>
              <InputField
                autoFocus
                placeholder="Hexadecimal"
                value={hexadecimal}
                onChange={(e) =>
                  handleOnChange(e, "hexadecimal", (value) => value)
                }
                isInvalid={isHexadecimalInvalid}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Decimal</Label>
            <Td>
              <InputField
                type="number"
                placeholder="decimal"
                value={decimal}
                onChange={(e) =>
                  handleOnChange(e, "decimal", (value) =>
                    numberToHex(BigInt(value))
                  )
                }
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Binary</Label>
            <Td>
              <InputField
                type="number"
                placeholder="binary"
                value={binary}
                onChange={(e) =>
                  handleOnChange(e, "binary", (value) =>
                    bigInt(value, 2).toString(16)
                  )
                }
                isInvalid={isBinaryInvalid}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Text</Label>
            <Td>
              <InputField
                placeholder="text"
                value={text}
                onChange={(e) =>
                  handleOnChange(e, "text", (value) => stringToHex(value))
                }
              />
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </>
  );
};

export default Hexadecimal;
