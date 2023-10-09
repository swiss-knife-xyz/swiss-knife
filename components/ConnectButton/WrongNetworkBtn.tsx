import React from "react";
import { Button } from "@chakra-ui/react";

interface Props {
  onClick: () => void;
}

export const WrongNetworkBtn = ({ onClick }: Props) => {
  return (
    <Button colorScheme={"red"} onClick={onClick}>
      Wrong network
    </Button>
  );
};
