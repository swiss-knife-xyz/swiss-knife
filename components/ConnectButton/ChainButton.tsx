import React from "react";
import { Button, Box, Image, Text, Flex } from "@chakra-ui/react";
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
  isCompact?: boolean;
}

const ChainIcon = ({
  chain,
  size = "1.5rem",
}: {
  chain: Props["chain"];
  size?: string;
}) => (
  <Box
    mr={2}
    w={size}
    h={size}
    bgImg={chain.iconBackground}
    overflow={"hidden"}
    rounded={"full"}
    display="flex"
    alignItems="center"
    justifyContent="center"
  >
    {chain.iconUrl ? (
      <Image alt={chain.name ?? "Chain icon"} src={chain.iconUrl} />
    ) : null}
  </Box>
);

export const ChainButton = ({ onClick, chain, isCompact }: Props) => {
  return (
    <Button
      bg="blackAlpha.500"
      _hover={{
        bg: "whiteAlpha.200",
      }}
      onClick={onClick}
      borderRadius="xl"
      size={isCompact ? "sm" : "md"}
      width="100%"
      px={isCompact ? 2 : 3}
      h={isCompact ? "32px" : "38px"}
    >
      <Flex align="center" justify="space-between" width="100%">
        <Flex align="center" minW={0}>
          {chain.hasIcon ? (
            <ChainIcon chain={chain} size={isCompact ? "1.2rem" : "1.5rem"} />
          ) : null}
          <Text
            fontSize={isCompact ? "xs" : "md"}
            isTruncated
            maxW={isCompact ? "60px" : "auto"}
          >
            {chain.name}
          </Text>
        </Flex>
        <ChevronDownIcon ml={1} fontSize={isCompact ? "lg" : "2xl"} />
      </Flex>
    </Button>
  );
};
