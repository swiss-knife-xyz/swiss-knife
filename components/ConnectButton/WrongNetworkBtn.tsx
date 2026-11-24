import React from "react";
import { Button, Text } from "@chakra-ui/react";

interface Props {
  onClick: () => void;
  txt?: string;
  isCompact?: boolean;
  transparent?: boolean;
}

export const WrongNetworkBtn = ({ onClick, txt, isCompact, transparent }: Props) => {
  return (
    <Button
      onClick={onClick}
      bg={transparent ? "transparent" : "red.500"}
      _hover={{
        bg: transparent ? "blackAlpha.200" : "red.600",
      }}
      border="none"
      outline="none"
      boxShadow="none"
      borderRadius="xl"
      size={isCompact ? "sm" : "md"}
      width={isCompact ? "100%" : "auto"}
    >
      <Text fontSize={isCompact ? "xs" : "md"} isTruncated>
        {txt ?? "Wrong Network"}
      </Text>
    </Button>
  );
};
