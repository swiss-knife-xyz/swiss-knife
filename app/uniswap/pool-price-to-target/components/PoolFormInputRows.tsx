import {
  Input,
  InputGroup,
  InputRightAddon,
  Td,
  Tr,
  Center,
  Box,
} from "@chakra-ui/react";
import { isValidNumericInput } from "../lib/utils"; // Assuming this is where you have it

interface PoolFormInputRowsProps {
  currency0: string;
  setCurrency0: (value: string) => void;
  currency0Symbol?: string;
  currency0Decimals?: number;
  currency1: string;
  setCurrency1: (value: string) => void;
  currency1Symbol?: string;
  currency1Decimals?: number;
  fee: number | ""; // Allow empty string for initial state or clearing
  setFee: (value: number | "") => void;
  tickSpacing: number | ""; // Allow empty string
  setTickSpacing: (value: number | "") => void;
  hookAddress: string;
  setHookAddress: (value: string) => void;
  hookData: string;
  setHookData: (value: string) => void;
}

export const PoolFormInputRows: React.FC<PoolFormInputRowsProps> = ({
  currency0,
  setCurrency0,
  currency0Symbol,
  currency0Decimals,
  currency1,
  setCurrency1,
  currency1Symbol,
  currency1Decimals,
  fee,
  setFee,
  tickSpacing,
  setTickSpacing,
  hookAddress,
  setHookAddress,
  hookData,
  setHookData,
}) => {
  return (
    <>
      <Tr>
        <Td>currency0</Td>
        <Td>
          <InputGroup>
            <Input
              value={currency0}
              onChange={(e) => setCurrency0(e.target.value)}
              placeholder="Enter currency0 address"
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
              placeholder="Enter currency1 address"
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
        <Td>fee</Td>
        <Td>
          <Input
            value={fee === "" ? "" : fee} // Handle empty string for input value
            onChange={(e) => {
              if (isValidNumericInput(e.target.value)) {
                setFee(e.target.value === "" ? "" : Number(e.target.value));
              }
            }}
            placeholder="Enter fee (e.g., 3000)"
            type="number"
          />
        </Td>
      </Tr>
      <Tr>
        <Td>tickSpacing</Td>
        <Td>
          <Input
            value={tickSpacing === "" ? "" : tickSpacing} // Handle empty string
            onChange={(e) => {
              if (isValidNumericInput(e.target.value)) {
                setTickSpacing(
                  e.target.value === "" ? "" : Number(e.target.value)
                );
              }
            }}
            placeholder="Enter tickSpacing (e.g., 60)"
            type="number"
          />
        </Td>
      </Tr>
      <Tr>
        <Td>hookAddress</Td>
        <Td>
          <Input
            value={hookAddress}
            onChange={(e) => setHookAddress(e.target.value)}
            placeholder="Enter hook address (optional)"
          />
        </Td>
      </Tr>
      <Tr>
        <Td>hookData</Td>
        <Td>
          <Input
            value={hookData}
            onChange={(e) => setHookData(e.target.value)}
            placeholder="Enter hook data (optional, hex)"
          />
        </Td>
      </Tr>
    </>
  );
};
