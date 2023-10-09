import React from "react";
import { Button, Box, Image } from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";

interface Props {
  onClick: () => void;
  chain: {
    hasIcon: boolean;
    iconUrl?: string | undefined;
    iconBackground?: string | undefined;
    id: number;
    name?: string | undefined;
    unsupported?: boolean | undefined;
  };
}

const ChainIcon = ({ chain }: { chain: Props["chain"] }) => (
  <Box
    mr={4}
    w={"1.5rem"}
    bgImg={chain.iconBackground}
    overflow={"hidden"}
    rounded={"full"}
  >
    {chain.iconUrl ? (
      <Image alt={chain.name ?? "Chain icon"} src={chain.iconUrl} />
    ) : null}
  </Box>
);

export const ChainButton = ({ onClick, chain }: Props) => {
  return (
    <Button
      mr={2}
      pr={2}
      bg="blackAlpha.500"
      _hover={{
        bg: "whiteAlpha.200",
      }}
      onClick={onClick}
      borderRadius="xl"
    >
      {chain.hasIcon ? <ChainIcon chain={chain} /> : null}
      {chain.name}
      <ChevronDownIcon ml={1} pt={1} fontSize="2xl" />
    </Button>
  );
};
