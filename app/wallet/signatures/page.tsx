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

const DEFAULT_EXAMPLE_PRETTY = JSON.stringify(exampleTypedDataJSON, null, 2);
const DEFAULT_EXAMPLE_MINIFIED = JSON.stringify(exampleTypedDataJSON);

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
  const [typedDataInput, setTypedDataInput] = useState(() => {
    if (rawTypedDataString && rawTypedDataString.trim() !== "") {
      try {
        return JSON.stringify(JSON.parse(rawTypedDataString), null, 2);
      } catch {
        return DEFAULT_EXAMPLE_PRETTY;
      }
    }
    return DEFAULT_EXAMPLE_PRETTY;
  });

  useEffect(() => {
    if (rawTypedDataString && rawTypedDataString.trim() !== "") {
      try {
        const parsed = JSON.parse(rawTypedDataString);
        const newPretty = JSON.stringify(parsed, null, 2);
        if (newPretty !== typedDataInput) {
          setTypedDataInput(newPretty);
        }
      } catch (e) {
        console.error(
          "Error parsing rawTypedDataString from URL for display sync:",
          e
        );
        if (typedDataInput !== DEFAULT_EXAMPLE_PRETTY) {
          setTypedDataInput(DEFAULT_EXAMPLE_PRETTY);
        }
      }
    } else {
      if (typedDataInput.trim() !== "") {
        setTypedDataInput(DEFAULT_EXAMPLE_PRETTY);
      }
    }
  }, [rawTypedDataString]);

  const handlePastedJson = (parsedJson: any) => {
    try {
      const minified = JSON.stringify(parsedJson);
      const pretty = JSON.stringify(parsedJson, null, 2);
      setRawTypedDataString(minified);
      setTypedDataInput(pretty);
    } catch (err) {
      console.error("Error in handlePastedJson:", err);
    }
  };

  const handleTypedDataInputChange = (newTextAreaValue: string) => {
    setTypedDataInput(newTextAreaValue);
    if (newTextAreaValue.trim() === "") {
      if (rawTypedDataString !== "") {
        setRawTypedDataString("");
      }
    } else {
      try {
        const parsedObject = JSON.parse(newTextAreaValue);
        const newMinified = JSON.stringify(parsedObject);
        if (newMinified !== rawTypedDataString) {
          setRawTypedDataString(newMinified);
        }
      } catch (e) {
        console.warn(" Invalid JSON typed. URL state not changed.");
      }
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
      let finalTypedDataRaw = signedContent.typedDataRaw;
      let finalTypedDataObject = signedContent.typedDataObject;

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
        if (!finalTypedDataRaw || finalTypedDataRaw.trim() === "") {
          finalTypedDataRaw = DEFAULT_EXAMPLE_MINIFIED;
          finalTypedDataObject = exampleTypedDataJSON;
        }
        if (
          !finalTypedDataRaw ||
          typeof finalTypedDataObject !== "object" ||
          finalTypedDataObject === null
        ) {
          throw new Error(
            "Typed data content (raw or parsed) is missing for 'typed_data' type signature."
          );
        }
        payloadForUrl = {
          type: "typed_data",
          rawData: finalTypedDataRaw,
          parsedData: finalTypedDataObject,
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
            typedData={typedDataInput}
            setTypedData={handleTypedDataInputChange}
            placeholder={exampleTypedDataJSON}
            onSign={(signature, signedDataObject) =>
              handleSignature(signature, "typed_data", {
                typedDataRaw:
                  rawTypedDataString && rawTypedDataString.trim() !== ""
                    ? rawTypedDataString
                    : DEFAULT_EXAMPLE_MINIFIED,
                typedDataObject:
                  rawTypedDataString && rawTypedDataString.trim() !== ""
                    ? signedDataObject
                    : exampleTypedDataJSON,
              })
            }
            onPasteCallback={handlePastedJson}
          />
        </Box>
      </VStack>
    </VStack>
  );
}
