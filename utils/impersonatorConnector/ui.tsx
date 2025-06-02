import { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  Box,
  Alert,
  AlertIcon,
  AlertDescription,
  useToast,
  Portal,
  IconButton,
  Tooltip,
  Image,
  InputGroup,
} from "@chakra-ui/react";
import { Global } from "@emotion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWallet } from "@fortawesome/free-solid-svg-icons";
import { type Address, isAddress, getAddress } from "viem";
import { useAccount } from "wagmi";
import { getEnsAddress } from "@/utils";
import {
  getStoredImpersonatorAddress,
  getStoredImpersonatorENS,
  setStoredImpersonatorAddress,
  getLastUsedImpersonatorAddress,
  getLastUsedImpersonatorENS,
  setLastUsedImpersonatorAddress,
} from "./provider";
import { impersonatorConnectorId } from "./connector";

interface ImpersonatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect: (address: Address) => void;
  currentAddress?: Address;
}

export const ImpersonatorModal = ({
  isOpen,
  onClose,
  onAddressSelect,
  currentAddress,
}: ImpersonatorModalProps) => {
  const [addressInput, setAddressInput] = useState<string>("");
  const [isValidAddress, setIsValidAddress] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showAddress, setShowAddress] = useState<boolean>(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      const storedENS = getStoredImpersonatorENS();
      const lastUsedENS = getLastUsedImpersonatorENS();
      const lastUsedAddress = getLastUsedImpersonatorAddress();

      // Priority: current address > stored ENS > last used ENS > last used address
      setAddressInput(
        storedENS || currentAddress || lastUsedENS || lastUsedAddress || ""
      );
      setIsValidAddress(true);
      setShowAddress(false);
    }
  }, [isOpen, currentAddress]);

  const validateAddress = (address: string): boolean => {
    if (!address.trim()) return true; // Empty is valid (will show error on submit)
    // Accept valid addresses or potential ENS names (ending with .eth or containing dots)
    return (
      isAddress(address) || address.includes(".") || address.endsWith(".eth")
    );
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressInput(value);
    setIsValidAddress(validateAddress(value));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleConnect();
    }
  };

  const handleConnect = async () => {
    if (!addressInput.trim()) {
      toast({
        title: "Address Required",
        description:
          "Please enter an Ethereum address or ENS name to impersonate.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      let resolvedAddress: string;
      let ensName: string | undefined;

      if (isAddress(addressInput)) {
        // Direct address input
        resolvedAddress = getAddress(addressInput);
      } else {
        // Try to resolve as ENS name
        try {
          const ensResolvedAddress = await getEnsAddress(addressInput);
          if (ensResolvedAddress) {
            resolvedAddress = ensResolvedAddress;
            // Store the original ENS input if it's a valid ENS name
            if (addressInput.includes(".") || addressInput.endsWith(".eth")) {
              ensName = addressInput;
            }
          } else {
            setIsValidAddress(false);
            toast({
              title: "Invalid Input",
              description: "Please enter a valid Ethereum address or ENS name.",
              status: "error",
              duration: 3000,
              isClosable: true,
            });
            return;
          }
        } catch (error) {
          setIsValidAddress(false);
          toast({
            title: "Invalid Input",
            description: "Please enter a valid Ethereum address or ENS name.",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      }

      // First notify the connector through onAddressSelect
      onAddressSelect(resolvedAddress as Address);

      // Then update localStorage with both address and ENS name
      setStoredImpersonatorAddress(resolvedAddress as Address, ensName);

      // Also update last used address/ENS
      setLastUsedImpersonatorAddress(resolvedAddress as Address, ensName);

      // Close the modal
      onClose();

      toast({
        title: "Address Set",
        description: `Now impersonating ${
          ensName ||
          resolvedAddress.slice(0, 6) + "..." + resolvedAddress.slice(-4)
        }`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error setting impersonator address:", error);
      toast({
        title: "Error",
        description: "Failed to set impersonator address. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentENS = getStoredImpersonatorENS();

  return (
    <>
      <Global
        styles={{
          "[data-rk]": {
            zIndex: isOpen ? "1400 !important" : "auto",
          },
        }}
      />
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="5px" />
        <ModalContent
          minW={{
            base: 0,
            sm: "25rem",
            md: "30rem",
          }}
          pb="6"
          bg="bg.900"
          zIndex={2147483647}
        >
          <ModalHeader>
            <HStack>
              <Image
                src="/external/impersonator-logo-no-bg.png"
                alt="Impersonator"
                boxSize="24px"
              />
              <Text>Impersonator</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  Browse in view-only mode as any address.
                </AlertDescription>
              </Alert>

              {currentAddress && (
                <Box p={3} bg="whiteAlpha.100" borderRadius="md">
                  <Text fontSize="sm" color="gray.400" mb={1}>
                    Currently impersonating:
                  </Text>
                  <VStack align="stretch" spacing={0}>
                    {currentENS && (
                      <Text fontSize="sm" fontWeight={"bold"}>
                        {currentENS}
                      </Text>
                    )}
                    <Text fontFamily="mono" fontSize="sm">
                      {currentAddress}
                    </Text>
                  </VStack>
                </Box>
              )}

              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" fontWeight="medium">
                  Ethereum Address or ENS Name:
                </Text>
                <InputGroup>
                  <Input
                    placeholder="0x... or ENS name"
                    value={addressInput}
                    onChange={handleAddressChange}
                    onKeyPress={handleKeyPress}
                    isInvalid={!isValidAddress}
                    fontFamily="mono"
                    fontSize="sm"
                  />
                </InputGroup>
                {!isValidAddress && (
                  <Text color="red.400" fontSize="xs">
                    Please enter a valid Ethereum address or ENS name
                  </Text>
                )}
              </VStack>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3} width="100%">
              <Button
                colorScheme="blue"
                onClick={handleConnect}
                isLoading={isLoading}
                loadingText="Connecting..."
                isDisabled={!addressInput.trim() || !isValidAddress}
                size="sm"
                flex={1}
              >
                <HStack>
                  <FontAwesomeIcon icon={faWallet} />
                  <Text>{currentAddress ? "Update" : "Connect"}</Text>
                </HStack>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

// Hook to use the impersonator modal
export const useImpersonatorModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<
    ((address: Address | null) => void) | null
  >(null);

  const openModal = (): Promise<Address | null> => {
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  };

  const closeModal = () => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(null);
      setResolvePromise(null);
    }
  };

  const handleAddressSelect = (address: Address) => {
    if (resolvePromise) {
      resolvePromise(address);
      setResolvePromise(null);
    }
    setIsOpen(false);
  };

  const currentAddress = getStoredImpersonatorAddress();

  const ModalComponent = () => (
    <ImpersonatorModal
      isOpen={isOpen}
      onClose={closeModal}
      onAddressSelect={handleAddressSelect}
      currentAddress={currentAddress}
    />
  );

  return {
    openModal,
    ModalComponent,
    isOpen,
  };
};

// Floating button component that appears when impersonator connector is active
export const ImpersonatorFloatingButton = () => {
  const { connector } = useAccount();
  const currentAddress = getStoredImpersonatorAddress();
  const currentENS = getStoredImpersonatorENS();

  // Only show if the current connector is the impersonator connector
  const isImpersonatorActive = connector?.id === impersonatorConnectorId;

  if (!isImpersonatorActive || !currentAddress) {
    return null;
  }

  const handleOpenSettings = async () => {
    try {
      if (
        connector &&
        typeof (connector as any).openImpersonatorSettings === "function"
      ) {
        await (connector as any).openImpersonatorSettings();
      }
    } catch (error) {
      console.error("Error opening impersonator settings:", error);
    }
  };

  return (
    <Portal>
      <Box
        position="fixed"
        bottom="20px"
        right="20px"
        zIndex={50_000}
        cursor="pointer"
      >
        <Tooltip
          label={
            <VStack spacing={0} align="center">
              <Text>Impersonating:</Text>
              {currentENS ? (
                <Text fontSize="sm" fontFamily="mono">
                  {currentENS}
                </Text>
              ) : (
                <Text fontFamily="mono" fontSize="sm">
                  {currentAddress.slice(0, 6)}...{currentAddress.slice(-4)}
                </Text>
              )}
            </VStack>
          }
          placement="left"
          hasArrow
        >
          <IconButton
            aria-label="Impersonator Settings"
            icon={
              <Image
                src="/external/impersonator-logo-no-bg.png"
                alt="Impersonator"
                boxSize="24px"
              />
            }
            bg="gray.800"
            color="white"
            variant="solid"
            size="lg"
            borderRadius="full"
            boxShadow="lg"
            border="1px solid"
            borderColor="gray.600"
            _hover={{
              transform: "scale(1.05)",
              boxShadow: "xl",
              bg: "gray.700",
              borderColor: "gray.500",
            }}
            _active={{
              transform: "scale(0.95)",
              bg: "gray.900",
            }}
            transition="all 0.2s"
            onClick={handleOpenSettings}
          />
        </Tooltip>
      </Box>
    </Portal>
  );
};
