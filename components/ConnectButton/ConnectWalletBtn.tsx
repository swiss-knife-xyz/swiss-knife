import React from "react";
import { Button, useBreakpointValue } from "@chakra-ui/react";

interface Props {
  onClick: () => void;
}

export const ConnectWalletBtn = ({ onClick }: Props) => {
  const isMobile = useBreakpointValue({ base: true, sm: false });

  return (
    <Button
      colorScheme={"blue"}
      onClick={onClick}
      rounded={"lg"}
      size={isMobile ? "sm" : "md"}
      fontSize={isMobile ? "xs" : "md"}
    >
      Connect Wallet
    </Button>
  );
};
