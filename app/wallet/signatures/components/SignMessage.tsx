"use client";

import { Textarea, Flex } from "@chakra-ui/react";
import LoadingButton from "./LoadingButton";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";

type SignMessageProps = {
  messageText: string;
  setMessageText: (value: string) => void;
  onSign: (signature: `0x${string}`) => void;
};

export const SignMessage = ({
  messageText,
  setMessageText,
  onSign,
}: SignMessageProps) => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync, isPending } = useSignMessage();

  const handleMessageChange = (value: string) => {
    setMessageText(value);
  };

  const handleSign = async () => {
    const signature = await signMessageAsync({ message: messageText });
    onSign(signature);
  };

  return (
    <>
      <Textarea
        value={messageText}
        onChange={(e) => handleMessageChange(e.target.value)}
        borderColor={"gray.400"}
      />
      <Flex my={4} alignItems="end" justifyContent="end">
        <LoadingButton
          onClick={isConnected ? handleSign : openConnectModal}
          disabled={isPending}
          isLoading={isPending}
          loadingText="Signing..."
          defaultText={isConnected ? "Sign Message" : "Connect Wallet"}
        />
      </Flex>
    </>
  );
};
