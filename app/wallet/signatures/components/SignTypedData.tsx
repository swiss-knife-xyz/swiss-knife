"use client";

import { useEffect, useState, useMemo } from "react";
import { Flex, Text } from "@chakra-ui/react";
import { JsonTextArea } from "@/components/JsonTextArea";
import LoadingButton from "./LoadingButton";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useSignTypedData } from "wagmi";

type SignTypedDataProps = {
  typedData: string;
  setTypedData: (value: string) => void;
  onSign: (signature: `0x${string}`, signedData: any) => void;
  placeholder?: any;
  onPasteCallback?: (json: any) => void;
};

export const SignTypedData = ({
  typedData,
  setTypedData,
  onSign,
  placeholder,
  onPasteCallback,
}: SignTypedDataProps) => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const {
    signTypedDataAsync,
    isPending,
    error: signError,
  } = useSignTypedData();

  const [parsedDataForSigning, setParsedDataForSigning] = useState<any | null>(
    null
  );
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);

  const displayPlaceholderString = useMemo(() => {
    if (!placeholder) return "";
    try {
      return JSON.stringify(placeholder, null, 2);
    } catch {
      console.error("SignTypedData: Invalid placeholder object for display.");
      return "Error: Invalid placeholder object.";
    }
  }, [placeholder]);

  useEffect(() => {
    if (!typedData.trim()) {
      try {
        setParsedDataForSigning(placeholder);
        setJsonParseError(null);
      } catch (e) {
        setParsedDataForSigning(null);
        setJsonParseError("Invalid placeholder data.");
      }
      return;
    }
    try {
      const newTypedData = JSON.parse(typedData);
      setParsedDataForSigning(newTypedData);
      setJsonParseError(null);
    } catch (error) {
      setParsedDataForSigning(null);
      setJsonParseError(
        "Invalid JSON format. Please correct it before signing."
      );
    }
  }, [typedData, placeholder]);

  const handleTypedDataChange = (value: string) => {
    setTypedData(value);
  };

  const handleSign = async () => {
    if (!parsedDataForSigning || jsonParseError) {
      return;
    }
    if (isPending) return;
    try {
      const signature = await signTypedDataAsync(parsedDataForSigning);
      onSign(signature, parsedDataForSigning);
    } catch (e) {
      console.error("Error signing typed data:", e);
    }
  };

  return (
    <>
      <JsonTextArea
        value={typedData}
        onChange={handleTypedDataChange}
        height={"300px"}
        placeholder={displayPlaceholderString}
        onPasteCallback={onPasteCallback}
      />
      {jsonParseError && (
        <Text color="red.500" mt={2} fontSize="sm">
          {jsonParseError}
        </Text>
      )}
      {signError && (
        <Text color="red.500" mt={2} fontSize="sm">
          Signing Error: {signError.message}
        </Text>
      )}
      <Flex my={4} alignItems="end" justifyContent="end">
        <LoadingButton
          onClick={isConnected ? handleSign : openConnectModal}
          disabled={isPending}
          isLoading={isPending}
          loadingText="Signing..."
          defaultText={isConnected ? "Sign Typed Data" : "Connect Wallet"}
        />
      </Flex>
    </>
  );
};
