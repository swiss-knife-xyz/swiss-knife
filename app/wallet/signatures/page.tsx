"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { VStack, Center, Heading, Text, Box } from "@chakra-ui/react";
import { parseAsString, useQueryState } from "next-usequerystate";
import { SignMessage } from "./components/SignMessage";
import { SignTypedData } from "./components/SignTypedData";
import { exampleTypedDataJSON } from "./components/types";
import { SignatureType, SharedSignaturePayload } from "./components/types";

export default function WalletSignatures() {
  const { address } = useAccount();
  const router = useRouter();

  const [messageToSign, setMessageToSign] = useQueryState<string>(
    "messageToSign",
    parseAsString.withDefault("Swiss-Knife")
  );

  const [rawTypedDataString, setRawTypedDataString] = useQueryState<string>(
    "typedDataToSign",
    parseAsString.withDefault("")
  );
  const [input, setInput] = useState(() => {
    if (rawTypedDataString) {
      try {
        const parsed = JSON.parse(rawTypedDataString);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return "";
      }
    }
    return "";
  });

  const handlePastedJson = (parsedJson: any) => {
    try {
      setRawTypedDataString(JSON.stringify(parsedJson));
      setInput(JSON.stringify(parsedJson, null, 2));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignature = async (
    signature: `0x${string}`,
    type: SignatureType,
    signedContent: {
      message?: string;
      typedDataRaw?: string;
      typedDataObject?: any;
    }
  ) => {
    try {
      let payloadForUrl: SharedSignaturePayload | undefined;

      if (type === "message") {
        if (typeof signedContent.message !== "string") {
          throw new Error(
            "Message content is missing for 'message' type signature."
          );
        }
        payloadForUrl = {
          type: "message",
          message: signedContent.message,
          signature: signature,
          address: address!,
          timestamp: new Date().toISOString(),
        };
      } else if (type === "typed_data") {
        if (
          !signedContent.typedDataRaw ||
          typeof signedContent.typedDataObject !== "object" ||
          signedContent.typedDataObject === null
        ) {
          throw new Error(
            "Typed data content (raw or parsed) is missing for 'typed_data' type signature."
          );
        }
        payloadForUrl = {
          type: "typed_data",
          rawData: signedContent.typedDataRaw,
          parsedData: signedContent.typedDataObject,
          signature: signature,
          address: address!,
          timestamp: new Date().toISOString(),
        };
      } else {
        console.error("Unknown signature type:", type);
        return;
      }

      if (payloadForUrl) {
        const jsonString = JSON.stringify(payloadForUrl);
        const base64String = btoa(jsonString);
        const encodedPayload = encodeURIComponent(base64String);

        router.push(`/wallet/signatures/view?payload=${encodedPayload}`);
      } else {
        throw new Error("Payload for URL was not constructed.");
      }
    } catch (error) {
      console.error("Error handling signature:", error);
    }
  };

  return (
    <VStack
      spacing={10}
      align="stretch"
      maxW={{ base: "100%", md: "900px" }}
      mx="auto"
      minW={"40rem"}
      width="100%"
      px={{ base: 2, md: 4 }}
    >
      <Center flexDirection="column" pt={4}>
        <Heading as="h1" size="xl" mb={3} textAlign="center" color="white">
          Signatures
        </Heading>
        <Text>View Signatures</Text>
      </Center>
      <VStack gap={2}>
        <Box position="relative" width="100%" overflow="hidden">
          <SignMessage
            messageText={messageToSign}
            setMessageText={setMessageToSign}
            onSign={(signature) =>
              handleSignature(signature, "message", { message: messageToSign })
            }
          />
        </Box>
        <Center flexDirection="column" my={4}>
          <Text>OR</Text>
        </Center>
        <Box position="relative" width="100%" overflow="hidden">
          <SignTypedData
            typedData={input}
            setTypedData={(value) => {
              setInput(value);
              if (!value) {
                setRawTypedDataString("");
              }
            }}
            placeholder={exampleTypedDataJSON}
            onSign={(signature, signedDataObject) =>
              handleSignature(signature, "typed_data", {
                typedDataRaw: rawTypedDataString,
                typedDataObject: signedDataObject,
              })
            }
            onPasteCallback={handlePastedJson}
          />
        </Box>
      </VStack>
    </VStack>
  );
}
