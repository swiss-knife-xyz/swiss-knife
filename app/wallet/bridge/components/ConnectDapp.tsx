import {
  Box,
  Button,
  Heading,
  Input,
  VStack,
  InputGroup,
} from "@chakra-ui/react";
import QrScanner from "./QRScanner";

interface ConnectDappProps {
  uri: string;
  setUri: (uri: string) => void;
  setPasted: (pasted: boolean) => void;
  isConnected: boolean;
  connectToDapp: () => Promise<void>;
}

export default function ConnectDapp({
  uri,
  setUri,
  setPasted,
  isConnected,
  connectToDapp,
}: ConnectDappProps) {
  // Function to handle QR scan
  const handleQrScan = async (scannedUri: string) => {
    setUri(scannedUri);
    setPasted(true);
    // Auto connect if URI is valid
    if (scannedUri && scannedUri.startsWith("wc:") && isConnected) {
      await connectToDapp();
    }
  };

  return (
    <Box
      p={{ base: 4, md: 6 }}
      borderWidth={1}
      borderRadius="lg"
      opacity={!isConnected ? 0.7 : 1}
    >
      <Heading size={{ base: "sm", md: "md" }} mb={{ base: 3, md: 4 }}>
        Connect to dapp
      </Heading>
      <VStack spacing={{ base: 3, md: 4 }}>
        <Input
          placeholder="Enter WalletConnect URI (wc:...)"
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            setPasted(true);
            setUri(e.clipboardData.getData("text"));
          }}
          isDisabled={!isConnected}
          size={{ base: "md", md: "md" }}
        />

        <QrScanner onScan={handleQrScan} isDisabled={!isConnected} />

        <Button
          colorScheme="blue"
          width="100%"
          onClick={connectToDapp}
          isDisabled={!isConnected || !uri || !uri.startsWith("wc:")}
          size={{ base: "md", md: "md" }}
        >
          Connect
        </Button>
      </VStack>
    </Box>
  );
}
