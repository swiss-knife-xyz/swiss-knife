import React from "react";
import { Box, Button, Image, Text, Flex } from "@chakra-ui/react";
import { Hex } from "viem";
import { blo } from "blo";

interface Props {
  onClick: () => void;
  account: {
    address: string;
    balanceDecimals?: number | undefined;
    balanceFormatted?: string | undefined;
    balanceSymbol?: string | undefined;
    displayBalance?: string | undefined;
    displayName: string;
    ensAvatar?: string | undefined;
    ensName?: string | undefined;
    hasPendingTransactions: boolean;
  };
  isCompact?: boolean;
}

const AccountImage = ({
  account,
  size = "24px",
}: {
  account: Props["account"];
  size?: string;
}) => (
  <Image
    src={account.ensAvatar ?? blo(account.address as Hex)}
    w={size}
    h={size}
    rounded={"full"}
    alt={account.displayName}
  />
);

export const AccountButton = ({ onClick, account, isCompact }: Props) => {
  // For mobile, truncate the address more aggressively
  const displayName = isCompact
    ? account.ensName ||
      `${account.address.slice(0, 4)}...${account.address.slice(-4)}`
    : account.displayName;

  return (
    <Box
      display="flex"
      alignItems="center"
      bg="blackAlpha.500"
      borderRadius="xl"
      py="0"
      width="100%"
    >
      {account.displayBalance && !isCompact ? (
        <Box px="3">
          <Text
            color="white"
            fontSize="md"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {account.displayBalance}
          </Text>
        </Box>
      ) : null}
      <Button
        onClick={onClick}
        bg="blackAlpha.500"
        border="1px solid transparent"
        _hover={{
          border: "1px",
          borderStyle: "solid",
          borderColor: "brand.greenDarker",
          backgroundColor: "blackAlpha.100",
        }}
        borderRadius="xl"
        m="1px"
        px={isCompact ? 2 : 3}
        h={isCompact ? "32px" : "38px"}
        size={isCompact ? "sm" : "md"}
        width="100%"
      >
        <Flex align="center" justify="space-between" width="100%">
          <Text
            color="white"
            fontSize={isCompact ? "xs" : "md"}
            fontWeight="semiBold"
            mr="2"
            isTruncated
            maxW={isCompact ? "60px" : "auto"}
          >
            {displayName}
          </Text>
          <AccountImage account={account} size={isCompact ? "20px" : "24px"} />
        </Flex>
      </Button>
    </Box>
  );
};
