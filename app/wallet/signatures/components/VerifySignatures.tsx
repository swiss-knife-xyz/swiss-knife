import { useState } from "react";
import { verifyMessage, verifyTypedData } from "viem";
import {
  VStack,
  Flex,
  Input,
  Grid,
  Text,
  Button,
  Alert,
  AlertIcon,
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

  return (
    <VStack
      spacing={6}
      align="stretch"
      maxW={{ base: "100%", md: "900px" }}
      mx="auto"
      minW={"40rem"}
      width="100%"
      px={{ base: 2, md: 4 }}
    >
      <Grid gap={1}>
        <Text fontWeight="bold">Address</Text>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
        />
      </Grid>

      <Grid gap={1}>
        <Text fontWeight="bold">Message or Typed Data</Text>
        <Editor
          height="300px"
          theme="vs-dark"
          defaultLanguage="json"
          value={message}
          onChange={handleMessageChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </Grid>

      <Grid gap={1}>
        <Text fontWeight="bold">Signature Hash</Text>
        <Input
          value={signatureHash}
          onChange={(e) => setSignatureHash(e.target.value)}
          placeholder="0x..."
        />
      </Grid>

      <Alert
        rounded="lg"
        status={verificationResult?.isValid ? "success" : "error"}
        border="1px"
        borderColor={verificationResult?.isValid ? "green.400" : "red.500"}
        textColor={verificationResult?.isValid ? "green.400" : "red.500"}
        minHeight="60px"
        opacity={verificationResult ? 1 : 0}
        visibility={verificationResult ? "visible" : "hidden"}
        transition="opacity 0.2s ease-in-out"
        display="flex"
        alignItems="center"
      >
        <AlertIcon
          color={verificationResult?.isValid ? "green.400" : "red.500"}
        />
        {verificationResult?.error
          ? verificationResult.error
          : verificationResult
            ? `Signature ${verificationResult.isValid ? "verified" : "invalid"}`
            : ""}
      </Alert>

      <Flex justifyContent="flex-end" gap={2}>
        <Button onClick={clearFields}>Clear</Button>
        <Button colorScheme="blue" onClick={handleVerify}>
          Verify
        </Button>
      </Flex>
    </VStack>
  );
}
