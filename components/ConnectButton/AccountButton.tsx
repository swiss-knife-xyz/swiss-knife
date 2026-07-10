import {
  Box,
  Button,
  Image,
  Text,
  Flex,
  useDisclosure,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { blo } from "blo";
import { getGnsIdentityQueryKey, readGnsIdentity } from "@/lib/gns";
import { AccountModal } from "./AccountModal";

interface Props {
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
  address,
  avatar,
  displayName,
  size = "24px",
}: {
  address: string;
  avatar?: string;
  displayName: string;
  size?: string;
}) => (
  <Image
    src={avatar ?? blo(address as Hex)}
    w={size}
    h={size}
    rounded={"full"}
    alt={displayName}
  />
);

export const AccountButton = ({ account, isCompact }: Props) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { data: gnsIdentity } = useQuery({
    queryKey: getGnsIdentityQueryKey(account.address),
    queryFn: () => readGnsIdentity(account.address as Address),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  // For mobile, truncate the address more aggressively
  const displayName =
    gnsIdentity?.name ||
    (isCompact
      ? account.ensName ||
        `${account.address.slice(0, 4)}...${account.address.slice(-4)}`
      : account.displayName);
  const avatar = gnsIdentity?.avatar || account.ensAvatar;

  return (
    <>
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
          onClick={onOpen}
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
            <AccountImage
              address={account.address}
              avatar={avatar}
              displayName={displayName}
              size={isCompact ? "20px" : "24px"}
            />
          </Flex>
        </Button>
      </Box>

      <AccountModal
        address={account.address}
        avatar={avatar}
        balance={account.displayBalance}
        displayName={displayName}
        isOpen={isOpen}
        onClose={onClose}
      />
    </>
  );
};
