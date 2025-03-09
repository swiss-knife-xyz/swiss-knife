import { useState, Fragment } from "react";
import {
  Box,
  Button,
  Center,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Text,
  Flex,
} from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { FaQrcode } from "react-icons/fa";

// Dynamically import the QR reader to avoid SSR issues
const ReactQrReader = dynamic(() => import("react-qr-reader-es6"), {
  ssr: false,
});

interface QrScannerProps {
  onScan: (uri: string) => Promise<void>;
  isDisabled: boolean;
}

export default function QrScanner({ onScan, isDisabled }: QrScannerProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  function onError() {
    console.error("QR Scanner error");
  }

  async function handleScan(data: string | null) {
    if (data && data.startsWith("wc:")) {
      await onScan(data);
      onClose();
    }
  }

  function handleOpen() {
    setLoading(true);
    onOpen();
    // Delay activating the scanner to ensure the modal is fully rendered
    setTimeout(() => setScannerActive(true), 500);
  }

  function handleClose() {
    setScannerActive(false);
    onClose();
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        isDisabled={isDisabled}
        variant="outline"
        size="md"
        width="100%"
        mt={2}
      >
        <Flex align="center">
          <Text mr={2}>
            <FaQrcode />
          </Text>
          <Text>Scan QR Code</Text>
        </Flex>
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        isCentered
        closeOnOverlayClick={true}
        closeOnEsc={true}
      >
        <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="5px" />
        <ModalContent
          bg="bg.900"
          color="white"
          display="flex"
          flexDirection="column"
        >
          <ModalHeader
            borderBottomWidth="1px"
            borderColor="whiteAlpha.200"
            fontSize={{ base: "md", md: "lg" }}
          >
            Scan WalletConnect QR Code
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody p={4} flex="1">
            <Flex
              direction="column"
              align="center"
              justify="center"
              height="100%"
              width="100%"
              position="relative"
            >
              {loading && (
                <Center
                  position="absolute"
                  width="100%"
                  height="100%"
                  zIndex={10}
                >
                  <Spinner size="xl" color="blue.400" />
                </Center>
              )}

              <Box
                width="100%"
                height={{ base: "250px", md: "350px" }}
                borderRadius="md"
                overflow="hidden"
                position="relative"
                borderWidth={1}
                borderColor="whiteAlpha.300"
                mb={2}
              >
                {scannerActive && (
                  <ReactQrReader
                    onLoad={() => setLoading(false)}
                    delay={300}
                    onError={onError}
                    onScan={handleScan}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    facingMode="environment"
                    resolution={800}
                  />
                )}
              </Box>

              <Text
                mt={2}
                fontSize="sm"
                color="whiteAlpha.700"
                textAlign="center"
              >
                Point your camera at a WalletConnect QR code
              </Text>
            </Flex>
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderColor="whiteAlpha.200">
            <Button colorScheme="red" onClick={handleClose} variant="outline">
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
