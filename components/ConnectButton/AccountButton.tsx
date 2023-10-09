import React from "react";
import { Box, Button, Image, Text } from "@chakra-ui/react";
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
}

const AccountImage = ({ account }: { account: Props["account"] }) => (
  <Image
    src={account.ensAvatar ?? blo(account.address as Hex)}
    w="24px"
    h="24px"
    rounded={"full"}
    alt={account.displayName}
  />
);

export const AccountButton = ({ onClick, account }: Props) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      bg="blackAlpha.500"
      borderRadius="xl"
      py="0"
    >
      {account.displayBalance ? (
        <Box px="3">
          <Text color="white" fontSize="md">
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
        px={3}
        h="38px"
      >
        <Text color="white" fontSize="md" fontWeight="semiBold" mr="2">
          {account.displayName}
        </Text>
        <AccountImage account={account} />
      </Button>
    </Box>
  );
};
