import React from "react";
import { Button } from "@chakra-ui/react";

interface Props {
  onClick: () => void;
}

export const ConnectWalletBtn = ({ onClick }: Props) => {
  return (
    <Button colorScheme={"blue"} onClick={onClick} rounded={"lg"}>
      Connect Wallet
    </Button>
  );
};
