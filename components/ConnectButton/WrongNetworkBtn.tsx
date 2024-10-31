import React from "react";
import { Button } from "@chakra-ui/react";

interface Props {
  txt?: string;
  onClick: () => void;
}

export const WrongNetworkBtn = ({ txt = "Wrong Network", onClick }: Props) => {
  return (
    <Button colorScheme={"red"} onClick={onClick}>
      {txt}
    </Button>
  );
};
