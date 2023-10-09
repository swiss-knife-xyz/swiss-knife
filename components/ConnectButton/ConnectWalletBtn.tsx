import React from "react";
import { Button } from "@chakra-ui/react";

interface Props {
  onClick: () => void;
}

export const ConnectWalletBtn = ({ onClick }: Props) => {
  return (
    <Button
      bg={"twitter.700"}
      _hover={{
        bg: "twitter.800",
      }}
      onClick={onClick}
      rounded={"xl"}
    >
      Connect Wallet
    </Button>
  );
};
