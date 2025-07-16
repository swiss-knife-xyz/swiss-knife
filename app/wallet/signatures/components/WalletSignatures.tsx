"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { VStack, Center, Text, Box, HStack, Spacer } from "@chakra-ui/react";
import { parseAsString, useQueryState } from "next-usequerystate";
import { SignMessage } from "./SignMessage";
import { SignTypedData } from "./SignTypedData";
import { exampleTypedDataJSON } from "./types";
import { SignatureType, SharedSignaturePayload, SignerEntry } from "./types";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const DEFAULT_EXAMPLE_PRETTY = JSON.stringify(exampleTypedDataJSON, null, 2);
const DEFAULT_EXAMPLE_MINIFIED = JSON.stringify(exampleTypedDataJSON);

export default function WalletSignatures() {
  const { address, isConnected } = useAccount();
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

  // Parse hash-based query parameters and sync with useQueryState
  useEffect(() => {
    const parseHashParams = () => {
      const hash = window.location.hash.substring(1);
      if (hash.includes("?")) {
        const queryString = hash.split("?")[1];
        const params = new URLSearchParams(queryString);

        const hashMessageToSign = params.get("messageToSign");
        const hashTypedDataToSign = params.get("typedDataToSign");

        // Only update if the hash param is different from current state
        if (hashMessageToSign && hashMessageToSign !== messageToSign) {
          setMessageToSign(hashMessageToSign);
        }

        if (hashTypedDataToSign && hashTypedDataToSign !== rawTypedDataString) {
          setRawTypedDataString(hashTypedDataToSign);
        }
      }
    };

    // Parse initial hash params
    parseHashParams();

    // Listen for hash changes
    const handleHashChange = () => {
      parseHashParams();
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [
    messageToSign,
    rawTypedDataString,
    setMessageToSign,
    setRawTypedDataString,
  ]);

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
    if (!address) {
      throw new Error("No address found for signature.");
    }
    try {
      let payloadForUrl: SharedSignaturePayload | undefined;

      const newSignerEntry: SignerEntry = {
        address: address,
        signature: signature,
        timestamp: new Date().toISOString(),
      };

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
          signers: [newSignerEntry],
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
          signers: [newSignerEntry],
        };
      } else {
        console.error("Unknown signature type:", type);
        return;
      }

      if (payloadForUrl) {
        const jsonString = JSON.stringify(payloadForUrl);
        const base64String = btoa(jsonString);
        const encodedPayload = encodeURIComponent(base64String);
        
        let payloadParam = encodedPayload;
        
        // If URL would be too long, use sessionStorage, vercel caps the uri size at 14KB
        // https://vercel.com/docs/errors/URL_TOO_LONG
        if (encodedPayload.length > 4000) {
          const storageKey = `swissknife_sig_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
          sessionStorage.setItem(storageKey, jsonString);
          payloadParam = storageKey;
        }

        // Preserve current query parameters for navigation back
        const preservedParams = new URLSearchParams();

        // Preserve the form state parameters
        if (messageToSign && messageToSign !== "Swiss-Knife") {
          preservedParams.set("messageToSign", messageToSign);
        }
        if (rawTypedDataString && rawTypedDataString.trim() !== "") {
          preservedParams.set("typedDataToSign", rawTypedDataString);
        }

        let viewUrl = `${getPath(
          subdomains.WALLET.base
        )}signatures/view?payload=${payloadParam}`;
        if (preservedParams.toString()) {
          let returnParam = preservedParams.toString();
          if (returnParam.length > 1500) {
            const returnKey = `swissknife_ret_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
            sessionStorage.setItem(returnKey, JSON.stringify({ returnParams: returnParam }));
            returnParam = returnKey;
          }
          viewUrl += `&returnParams=${encodeURIComponent(returnParam)}`;
        }

        router.push(viewUrl);
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
      <VStack gap={2}>
        {isConnected && (
          <HStack w="100%" mb={2}>
            <Spacer /> <ConnectButton hideChain />
          </HStack>
        )}
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
