import {
  Box,
  Button,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Grid,
  IconButton,
  Image,
  Modal,
  ModalContent,
  ModalOverlay,
  Text,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react";
import { LogOut, X } from "lucide-react";
import type { Hex } from "viem";
import { useDisconnect } from "wagmi";
import { blo } from "blo";
import { CopyToClipboard } from "@/components/CopyToClipboard";

type Props = {
  address: string;
  avatar?: string;
  balance?: string;
  displayName: string;
  isOpen: boolean;
  onClose: () => void;
};

export const AccountModal = ({
  address,
  avatar,
  balance,
  displayName,
  isOpen,
  onClose,
}: Props) => {
  const { disconnect } = useDisconnect();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const content = (
    <AccountDetails
      address={address}
      avatar={avatar}
      balance={balance}
      displayName={displayName}
      isMobile={!!isMobile}
      onClose={onClose}
      onDisconnect={() => {
        onClose();
        disconnect();
      }}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        placement="bottom"
        autoFocus={false}
      >
        <DrawerOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
        <DrawerContent
          bg="#24252a"
          borderTop="1px solid"
          borderColor="whiteAlpha.100"
          borderTopRadius="28px"
          boxShadow="0 -24px 80px rgba(0, 0, 0, 0.48)"
          color="white"
          overflow="hidden"
          pb="env(safe-area-inset-bottom)"
        >
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="sm"
      autoFocus={false}
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
      <ModalContent
        bg="#24252a"
        border="1px solid"
        borderColor="whiteAlpha.100"
        borderRadius="24px"
        boxShadow="0 24px 80px rgba(0, 0, 0, 0.48)"
        color="white"
        maxW="360px"
        mx={4}
        overflow="hidden"
      >
        {content}
      </ModalContent>
    </Modal>
  );
};

const AccountDetails = ({
  address,
  avatar,
  balance,
  displayName,
  isMobile,
  onClose,
  onDisconnect,
}: Omit<Props, "isOpen"> & {
  isMobile: boolean;
  onDisconnect: () => void;
}) => (
  <Box position="relative" px={5} pt={isMobile ? 12 : 6} pb={isMobile ? 7 : 5}>
    <IconButton
      aria-label="Close account menu"
      icon={<X size={isMobile ? 20 : 18} />}
      position="absolute"
      top={4}
      right={4}
      boxSize="34px"
      minW="34px"
      borderRadius="full"
      bg="whiteAlpha.100"
      color="whiteAlpha.700"
      _focusVisible={{
        boxShadow: "0 0 0 2px var(--chakra-colors-whiteAlpha-300)",
      }}
      _hover={{ bg: "whiteAlpha.200", color: "white" }}
      onClick={onClose}
    />

    <VStack spacing={1}>
      <Image
        src={avatar ?? blo(address as Hex)}
        alt={displayName}
        boxSize={isMobile ? "82px" : "74px"}
        borderRadius="full"
        mb={isMobile ? 4 : 2}
      />
      <Text
        fontSize="22px"
        fontWeight="bold"
        lineHeight="shorter"
        maxW="100%"
        isTruncated
      >
        {displayName}
      </Text>
      {balance ? (
        <Text color="whiteAlpha.600" fontSize="17px" fontWeight="semibold">
          {balance}
        </Text>
      ) : null}
    </VStack>

    <Grid
      templateColumns="repeat(2, minmax(0, 1fr))"
      gap={2}
      maxW={isMobile ? "none" : "304px"}
      mx="auto"
      mt={5}
    >
      <CopyToClipboard
        textToCopy={address}
        labelText="Copy Address"
        h="52px"
        px={2}
        borderRadius="xl"
        bg="whiteAlpha.100"
        border="1px solid transparent"
        color="white"
        fontSize="sm"
        fontWeight="semibold"
        boxShadow="none"
        _focusVisible={{
          boxShadow: "0 0 0 2px var(--chakra-colors-whiteAlpha-300)",
        }}
        _hover={{ bg: "whiteAlpha.200" }}
      />
      <Button
        h="52px"
        px={2}
        borderRadius="xl"
        bg="whiteAlpha.100"
        border="1px solid transparent"
        color="white"
        fontSize="sm"
        fontWeight="semibold"
        boxShadow="none"
        leftIcon={<LogOut size={17} />}
        _focusVisible={{
          boxShadow: "0 0 0 2px var(--chakra-colors-whiteAlpha-300)",
        }}
        _hover={{ bg: "whiteAlpha.200" }}
        onClick={onDisconnect}
      >
        Disconnect
      </Button>
    </Grid>
  </Box>
);
