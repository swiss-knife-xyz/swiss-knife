import {
  Box,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  Td,
  Text,
} from "@chakra-ui/react";
import { formatBalance, isValidNumericInput } from "../lib/utils"; // Adjust path

interface LiquidityAmountInputProps {
  labelSymbol?: string;
  value: string;
  onAmountChange: (value: string) => void;
  balance?: bigint;
  decimals?: number;
  isCalculatingField: boolean;
  placeholder: string;
}

export const LiquidityAmountInput: React.FC<LiquidityAmountInputProps> = ({
  labelSymbol,
  value,
  onAmountChange,
  balance,
  decimals,
  isCalculatingField,
  placeholder,
}) => {
  return (
    <Td>
      <Box position="relative">
        <InputGroup>
          <Input
            value={value}
            onChange={(e) => {
              if (isValidNumericInput(e.target.value)) {
                onAmountChange(e.target.value);
              }
            }}
            placeholder={placeholder}
            pr={isCalculatingField ? "40px" : "16px"}
          />
          {isCalculatingField && (
            <InputRightElement>
              <Spinner size="sm" color="blue.500" />
            </InputRightElement>
          )}
        </InputGroup>
        <Text
          position="absolute"
          top="-20px"
          right="4px"
          fontSize="xs"
          color="gray.400"
        >
          Balance: {formatBalance(balance, decimals || 18)}
        </Text>
      </Box>
    </Td>
  );
};
