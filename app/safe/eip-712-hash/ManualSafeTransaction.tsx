"use client";

import { useState, type FormEvent } from "react";
import { AddressBookButton } from "@/components/AddressBook/AddressBookButton";
import {
  Alert,
  AlertIcon,
  Box,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Select,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { InputField } from "@/components/InputField";
import { DarkButton } from "@/components/DarkButton";
import {
  computeSafeTransactionHash,
  type SafeTransactionInput,
} from "@/lib/safeTransactionHash";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const initialInput: SafeTransactionInput = {
  version: "1.3.0",
  chainId: "",
  safeAddress: "",
  to: "",
  value: "0",
  data: "0x",
  operation: "0",
  safeTxGas: "0",
  baseGas: "0",
  gasPrice: "0",
  gasToken: ZERO_ADDRESS,
  refundReceiver: ZERO_ADDRESS,
  nonce: "0",
};
// Public Cyfrin safe-hash-rs Ethereum reference transaction. No service fetch.
const publicExample: SafeTransactionInput = {
  ...initialInput,
  chainId: "1",
  nonce: "63",
  safeAddress: "0x1c694Fc3006D81ff4a56F97E1b99529066a23725",
  to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  data: "0xa9059cbb00000000000000000000000092d0ebaf7eb707f0650f9471e61348f4656c29bc00000000000000000000000000000000000000000000000000000005d21dba00",
};
const fields: {
  key: keyof SafeTransactionInput;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "safeAddress",
    label: "Safe address (proxy)",
    placeholder: "0x… (not the implementation)",
  },
  { key: "chainId", label: "Chain ID", placeholder: "1 or 0x1" },
  { key: "nonce", label: "Nonce", placeholder: "0" },
  { key: "to", label: "To", placeholder: "0x… destination address" },
  { key: "value", label: "Value (wei)", placeholder: "0" },
  { key: "safeTxGas", label: "Safe transaction gas", placeholder: "0" },
  { key: "baseGas", label: "Base gas", placeholder: "0" },
  { key: "gasPrice", label: "Gas price (wei)", placeholder: "0" },
  { key: "gasToken", label: "Gas token", placeholder: ZERO_ADDRESS },
  {
    key: "refundReceiver",
    label: "Refund receiver",
    placeholder: ZERO_ADDRESS,
  },
];

export function ManualSafeTransaction() {
  const [input, setInput] = useState(initialInput);
  const [result, setResult] = useState<ReturnType<
    typeof computeSafeTransactionHash
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof SafeTransactionInput, value: string) {
    setInput((current) => ({ ...current, [key]: value }));
    setResult(null);
    setError(null);
  }
  function calculate(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    try {
      setResult(computeSafeTransactionHash(input));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not calculate hashes. Check your inputs."
      );
    }
  }

  return (
    <Box maxW="800px" mx="auto" w="full">
      <Heading as="h1" size="lg" color="gray.100" mb={2}>
        Safe transaction hash
      </Heading>
      <Text color="gray.400" mb={5}>
        Calculate locally from Safe 1.3.0 or 1.4.1 transaction parameters.
      </Text>
      <Box
        as="form"
        onSubmit={calculate}
        p={{ base: 3, md: 5 }}
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
      >
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl>
            <FormLabel htmlFor="safe-version">Safe version</FormLabel>
            <Select
              id="safe-version"
              value={input.version}
              onChange={(event) => update("version", event.target.value)}
              bg="whiteAlpha.50"
            >
              <option value="1.3.0">1.3.0</option>
              <option value="1.4.1">1.4.1</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="safe-operation">Operation</FormLabel>
            <Select
              id="safe-operation"
              value={input.operation}
              onChange={(event) => update("operation", event.target.value)}
              bg="whiteAlpha.50"
            >
              <option value="0">Call</option>
              <option value="1">Delegate call</option>
            </Select>
          </FormControl>
          {fields.map(({ key, label, placeholder }) => (
            <FormControl key={key}>
              <HStack justify="space-between" mb={2}>
                <FormLabel htmlFor={`safe-${key}`} mb={0}>{label}</FormLabel>
                {["safeAddress", "to", "gasToken", "refundReceiver"].includes(key) && (
                  <AddressBookButton onSelect={(address) => update(key, address)} />
                )}
              </HStack>
              <InputField
                id={`safe-${key}`}
                value={input[key]}
                placeholder={placeholder}
                onChange={(event) => update(key, event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </FormControl>
          ))}
        </SimpleGrid>
        <FormControl mt={4}>
          <FormLabel htmlFor="safe-data">Data (hex bytes)</FormLabel>
          <InputField
            id="safe-data"
            multiline
            value={input.data}
            placeholder="0x"
            onChange={(event) => update("data", event.target.value)}
            fontFamily="mono"
            autoComplete="off"
            spellCheck={false}
          />
        </FormControl>
        <Box display="flex" flexWrap="wrap" gap={3} mt={4}>
          <DarkButton type="submit" variant="primary" bg="blue.600">
            Calculate Safe hashes
          </DarkButton>
          <DarkButton
            type="button"
            onClick={() => {
              setInput({ ...publicExample });
              setResult(null);
              setError(null);
            }}
          >
            Load public example
          </DarkButton>
        </Box>
      </Box>
      {error && (
        <Alert status="error" mt={4} borderRadius="md">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}
      {result && (
        <VStack
          role="region"
          aria-label="Computed Safe hashes"
          aria-live="polite"
          align="stretch"
          spacing={4}
          mt={5}
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
        >
          {(
            [
              ["Safe transaction hash", result.safeTxHash],
              ["Domain hash", result.domainHash],
              ["Message hash", result.messageHash],
            ] as const
          ).map(([label, hash], index) => (
            <FormControl key={label}>
              <FormLabel htmlFor={`safe-hash-${index}`}>{label}</FormLabel>
              <InputField
                id={`safe-hash-${index}`}
                value={hash}
                placeholder={label}
                onChange={() => {}}
                isReadOnly
                fontFamily="mono"
                fontSize="sm"
              />
            </FormControl>
          ))}
          <FormControl>
            <FormLabel htmlFor="safe-typed-data">
              EIP-712 JSON
            </FormLabel>
            <InputField
              id="safe-typed-data"
              multiline
              value={JSON.stringify(result.typedData, null, 2)}
              placeholder="EIP-712 typed data"
              onChange={() => {}}
              isReadOnly
              rows={8}
              fontFamily="mono"
              fontSize="sm"
            />
          </FormControl>
        </VStack>
      )}
    </Box>
  );
}
