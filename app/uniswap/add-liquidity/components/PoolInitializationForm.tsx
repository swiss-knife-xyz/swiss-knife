import {
  Divider,
  Heading,
  Text,
  Tr,
  Td,
  InputGroup,
  Input,
  Button,
} from "@chakra-ui/react";
import { isValidNumericInput } from "../lib/utils";

interface PoolInitializationFormProps {
  isPoolInitialized?: boolean;
  initialPrice: string;
  setInitialPrice: (value: string) => void;
  initialPriceDirection: boolean;
  setInitialPriceDirection: (value: boolean) => void;
  currency0Symbol?: string;
  currency1Symbol?: string;
}

export const PoolInitializationForm: React.FC<PoolInitializationFormProps> = ({
  isPoolInitialized,
  initialPrice,
  setInitialPrice,
  initialPriceDirection,
  setInitialPriceDirection,
  currency0Symbol,
  currency1Symbol,
}) => {
  if (isPoolInitialized === undefined || isPoolInitialized) {
    return null; // Don't render if pool is initialized or status is unknown
  }

  return (
    <>
      <Tr>
        <Td colSpan={2}>
          <Divider />
        </Td>
      </Tr>
      <Tr>
        <Td colSpan={2}>
          <Heading size={"md"} mb={4}>
            Pool Initialization:
          </Heading>
          <Text fontSize="sm" color="yellow.400" mb={4}>
            This pool needs to be initialized. Please set the initial price.
          </Text>
        </Td>
      </Tr>
      <Tr>
        <Td>Initial Price</Td>
        <Td>
          <InputGroup>
            <Input
              value={initialPrice}
              onChange={(e) => {
                if (isValidNumericInput(e.target.value)) {
                  setInitialPrice(e.target.value);
                }
              }}
              placeholder="Enter initial price (e.g., 1800)"
            />
            <Button
              colorScheme="blue"
              variant="outline"
              onClick={() => setInitialPriceDirection(!initialPriceDirection)}
              minW="200px"
              size="md"
              borderLeftRadius={0}
            >
              {initialPriceDirection
                ? `${currency1Symbol || "Currency1"} per ${
                    currency0Symbol || "Currency0"
                  }`
                : `${currency0Symbol || "Currency0"} per ${
                    currency1Symbol || "Currency1"
                  }`}
            </Button>
          </InputGroup>
        </Td>
      </Tr>
    </>
  );
};
