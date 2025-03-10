import { useState, useEffect, useRef } from "react";
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
import { FaQrcode } from "react-icons/fa";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

interface QrScannerProps {
  onScan: (uri: string) => Promise<void>;
  isDisabled: boolean;
}

export default function EnhancedQrScanner({
  onScan,
  isDisabled,
}: QrScannerProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!scannerActive || !videoRef.current) return;

    const startScanning = async () => {
      try {
        const reader = new BrowserQRCodeReader();
        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        const selectedDevice =
          devices.find((d) => d.label.toLowerCase().includes("back")) ||
          devices[0];

        if (!videoRef.current) return;

        controlsRef.current = await reader.decodeFromVideoDevice(
          selectedDevice?.deviceId,
          videoRef.current,
          async (result, error) => {
            if (result?.getText()?.startsWith("wc:")) {
              await onScan(result.getText());
              handleClose();
            }

            if (
              error &&
              error.message !==
                "No MultiFormat Readers were able to detect the code."
            ) {
              console.error("QR Scanner error:", error);
            }
          }
        );

        // Start periodic enhanced scanning
        startEnhancedScanning();

        setLoading(false);
      } catch (error) {
        console.error("Failed to start QR scanner:", error);
        setLoading(false);
      }
    };

    startScanning();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [scannerActive, onScan]);

  const startEnhancedScanning = () => {
    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get the image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const enhancedImageUrl = applyEnhancements(imageData);

      // Try decoding the enhanced image
      try {
        const reader = new BrowserQRCodeReader();
        const img = new Image();
        img.src = enhancedImageUrl;

        img.onload = async () => {
          try {
            const result = await reader.decodeFromImageElement(img);
            if (result?.getText()?.startsWith("wc:")) {
              await onScan(result.getText());
              handleClose();
            }
          } catch (error) {
            // Ignore failed attempts
          }
        };
      } catch (error) {
        console.error("Enhanced QR scan error:", error);
      }
    }, 500); // Capture and enhance every 500ms

    return () => clearInterval(interval);
  };

  function applyEnhancements(imageData: ImageData): string {
    const { data, width, height } = imageData;

    // Apply enhancements
    const contrast = 120;
    const threshold = 128;
    const invert = true;
    const grayscale = false;

    // Convert to grayscale if needed
    if (grayscale) {
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
    }

    // Apply contrast
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < data.length; i += 4) {
      data[i] = factor * (data[i] - 128) + 128;
      data[i + 1] = factor * (data[i + 1] - 128) + 128;
      data[i + 2] = factor * (data[i + 2] - 128) + 128;
    }

    // Apply threshold
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const val = avg > threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }

    // Apply inversion if needed
    if (invert) {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
    }

    // Draw back to canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL("image/png");
  }

  function handleOpen() {
    setLoading(true);
    onOpen();
    setTimeout(() => setScannerActive(true), 200);
  }

  function handleClose() {
    setScannerActive(false);
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
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
                height={{ base: "25rem", md: "28rem" }}
                borderRadius="md"
                overflow="hidden"
                position="relative"
                borderWidth={1}
                borderColor="whiteAlpha.300"
                mb={2}
              >
                {scannerActive && (
                  <Box
                    position="absolute"
                    top="0"
                    left="0"
                    right="0"
                    bottom="0"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <video
                      ref={videoRef}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                )}
              </Box>
              <Text
                mt={2}
                fontSize="sm"
                color="whiteAlpha.700"
                textAlign="center"
              >
                Point & keep your camera still at a WalletConnect QR code
              </Text>
              <canvas ref={canvasRef} style={{ display: "none" }} />
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
