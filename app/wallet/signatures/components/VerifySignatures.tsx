import { useState } from "react";
import { verifyMessage, verifyTypedData } from "viem";
import {
  VStack,
  HStack,
  Input,
  Box,
  Text,
  Button,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { Editor } from "@monaco-editor/react";

export default function VerifySignatures() {
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [signatureHash, setSignatureHash] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    type: "message" | "typedData" | null;
    error?: string;
  } | null>(null);

  const handleMessageChange = (value: string | undefined) => {
    setMessage(value ?? "");
    setVerificationResult(null);
  };

  const detectMessageType = (messageInput: string) => {
    try {
      const parsed = JSON.parse(messageInput);
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.domain || parsed.types || parsed.primaryType)
      ) {
        return "typedData";
      }
      return "message";
    } catch {
      return "message";
    }
  };

  const handleVerify = async () => {
    if (!address || !message || !signatureHash) {
      setVerificationResult({
        isValid: false,
        type: null,
        error: "Please fill in all fields",
      });
      return;
    }

    try {
      const messageType = detectMessageType(message);
      let isValid = false;

      if (messageType === "typedData") {
        const typedData = JSON.parse(message);
        isValid = await verifyTypedData({
          address: address as `0x${string}`,
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
          signature: signatureHash as `0x${string}`,
        });
      } else {
        const messageToVerify =
          message.startsWith('"') && message.endsWith('"')
            ? JSON.parse(message)
            : message;

        isValid = await verifyMessage({
          address: address as `0x${string}`,
          message: messageToVerify,
          signature: signatureHash as `0x${string}`,
        });
      }

      setVerificationResult({
        isValid,
        type: messageType,
        error: undefined,
      });
    } catch (error) {
      setVerificationResult({
        isValid: false,
        type: null,
        error: error instanceof Error ? error.message : "Verification failed",
      });
    }
  };

  const clearFields = () => {
    setAddress("");
    setMessage("");
    setSignatureHash("");
    setVerificationResult(null);
  };

  const inputStyles = {
    bg: "whiteAlpha.100",
    border: "1px solid",
    borderColor: "whiteAlpha.300",
    _hover: { borderColor: "whiteAlpha.400" },
    _focus: {
      borderColor: "blue.400",
      boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
    },
    color: "gray.100",
    _placeholder: { color: "gray.500" },
  };

  return (
    <VStack spacing={4} align="stretch" w="full">
      <FormControl>
        <FormLabel color="gray.300" fontSize="sm">Address</FormLabel>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          {...inputStyles}
        />
      </FormControl>

      <FormControl>
        <FormLabel color="gray.300" fontSize="sm">Message or Typed Data</FormLabel>
        <Box
          borderRadius="md"
          overflow="hidden"
          border="1px solid"
          borderColor="whiteAlpha.300"
        >
          <Editor
            height="180px"
            theme="vs-dark"
            defaultLanguage="json"
            value={message}
            onChange={handleMessageChange}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: "off",
              folding: false,
              padding: { top: 8, bottom: 8 },
            }}
          />
        </Box>
      </FormControl>

      <FormControl>
        <FormLabel color="gray.300" fontSize="sm">Signature Hash</FormLabel>
        <Input
          value={signatureHash}
          onChange={(e) => setSignatureHash(e.target.value)}
          placeholder="0x..."
          {...inputStyles}
        />
      </FormControl>

      {verificationResult && (
        <Alert
          rounded="md"
          status={verificationResult.isValid ? "success" : "error"}
          bg={verificationResult.isValid ? "green.900" : "red.900"}
        >
          <AlertIcon
            color={verificationResult.isValid ? "green.400" : "red.400"}
          />
          <Text color={verificationResult.isValid ? "green.100" : "red.100"} fontSize="sm">
            {verificationResult.error
              ? verificationResult.error
              : `Signature ${verificationResult.isValid ? "verified successfully" : "is invalid"}`}
          </Text>
        </Alert>
      )}

      <HStack justify="flex-end" spacing={3} pt={2}>
        <Button
          variant="outline"
          size="sm"
          onClick={clearFields}
          borderColor="whiteAlpha.300"
        >
          Clear
        </Button>
        <Button colorScheme="blue" size="sm" onClick={handleVerify}>
          Verify
        </Button>
      </HStack>
    </VStack>
  );
}
