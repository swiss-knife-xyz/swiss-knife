import React from "react";
import { Button, Text } from "@chakra-ui/react";

interface Props {
  onClick: () => void;
  txt?: string;
  isCompact?: boolean;
}

export const WrongNetworkBtn = ({ onClick, txt, isCompact }: Props) => {
  return (
    <Button
      onClick={onClick}
      bg="red.500"
      _hover={{
        bg: "red.600",
      }}
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
