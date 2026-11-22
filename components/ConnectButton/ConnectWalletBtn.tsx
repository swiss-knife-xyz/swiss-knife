import React from "react";
import { Button, useBreakpointValue } from "@chakra-ui/react";

interface Props {
  onClick: () => void;
  embedded?: boolean;
}

export const ConnectWalletBtn = ({ onClick, embedded }: Props) => {
  const isMobile = useBreakpointValue({ base: true, sm: false });

  return (
    <Button
      colorScheme={"blue"}
      onClick={onClick}
      rounded={embedded ? "none" : "lg"}
      variant={embedded ? "ghost" : undefined}
      borderWidth={embedded ? 0 : undefined}
      borderLeftRadius={embedded ? "lg" : undefined}
      color={embedded ? "text.primary" : undefined}
      h={embedded ? { base: 10, md: 8 } : undefined}
      size={isMobile ? "sm" : "md"}
      fontSize={embedded ? "sm" : isMobile ? "xs" : "md"}
    >
      Connect Wallet
    </Button>
  );
};
