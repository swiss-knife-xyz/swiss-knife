"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  useToast,
  useDisclosure,
  Button,
  IconButton,
  SimpleGrid,
  Input,
  InputGroup,
  InputRightElement,
  Center,
  Spinner,
  Spacer,
  HStack,
  FormControl,
  FormLabel,
  Switch,
  Tooltip,
  Divider,
  useBreakpointValue,
  Image,
} from "@chakra-ui/react";
import { Global } from "@emotion/react";
import {
  ImpersonatorIframe,
  ImpersonatorIframeProvider,
  useImpersonatorIframe,
} from "@impersonator/iframe";
import { ArrowBackIcon, CloseIcon, InfoIcon } from "@chakra-ui/icons";
import {
  useAccount,
  useWalletClient,
  useChainId,
  useSwitchChain,
  useConnections,
} from "wagmi";
import { chainIdToChain } from "@/data/common";
import { ErrorBoundary } from "react-error-boundary";
import { ConnectButton } from "@/components/ConnectButton/ConnectButton";
import { useLocalStorage } from "usehooks-ts";
import { decodeRecursive } from "@/lib/decoder";
import { decodeSignMessage, formatTypedData, isValidUrl } from "../utils";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { AppGridItem, FavoriteAppGridItem } from "./components/AppGridItem";
import { swap } from "@/utils";
import { safeDapps } from "@/data/safe/dapps";
import frameSdk, { Context } from "@farcaster/frame-sdk";

// Import the SessionRequestModal for handling transactions and signatures
import SessionRequestModal from "../components/SessionRequestModal";
import { SessionRequest } from "../types";
import { SafeDappInfo } from "@/types/safeDapps";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { zeroAddress } from "viem";
import { impersonatorConnectorId } from "@/utils/impersonatorConnector/connector";

interface AppStoreContentProps {
  chainId: number;
  address: string | undefined;
  walletClient: any;
  switchChainAsync: any;
  toast: any;
  iframeRequestHandlers: {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  } | null;
  skipDecoder: boolean;
  setSkipDecoder: (value: boolean) => void;
}

interface WalletError extends Error {
  code?: number;
}

function AppStoreContent({
  chainId,
  address,
  walletClient,
  switchChainAsync,
  toast,
  iframeRequestHandlers,
  skipDecoder,
  setSkipDecoder,
}: AppStoreContentProps) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { openConnectModal } = useConnectModal();
  const searchParams = useSearchParams();
  const router = useRouter();
  const connections = useConnections();
  const { iframeRef, isReady } = useImpersonatorIframe();
  const [iframeKey, setIframeKey] = useState(0);

  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [dapps, setDapps] = useState<SafeDappInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredDapps, setFilteredDapps] = useState<SafeDappInfo[]>([]);
  const [isLoadingDapps, setIsLoadingDapps] = useState(false);

  // Modal states for handling requests
  const {
    isOpen: isSessionRequestOpen,
    onOpen: onSessionRequestOpen,
    onClose: onSessionRequestClose,
  } = useDisclosure();

  const [currentSessionRequest, setCurrentSessionRequest] =
    useState<SessionRequest | null>(null);
  const [decodedTxData, setDecodedTxData] = useState<any>(null);
  const [isDecodingTx, setIsDecodingTx] = useState<boolean>(false);
  const [decodedSignatureData, setDecodedSignatureData] = useState<{
    type: "message" | "typedData";
    decoded: any;
  } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<boolean>(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState<boolean>(false);
  const [needsChainSwitch, setNeedsChainSwitch] = useState<boolean>(false);
  const [targetChainId, setTargetChainId] = useState<number | null>(null);

  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // Add state for favorite apps
  const [favoriteDappNames, setFavoriteDappNames] = useLocalStorage<string[]>(
    "favorite-dapps",
    []
  );

  const [pendingDappUrl, setPendingDappUrl] = useLocalStorage<string | null>(
    "pendingDappUrl",
    null
  );

  // Function to get current dapp info
  const getCurrentDapp = useCallback(() => {
    if (!appUrl) return null;
    return dapps.find(
      (dapp) => dapp.url === appUrl || appUrl.startsWith(dapp.url)
    );
  }, [appUrl, dapps]);

  // Function to toggle favorite status
  const toggleFavorite = (dappName: string) => {
    if (favoriteDappNames.includes(dappName)) {
      setFavoriteDappNames(
        favoriteDappNames.filter((name) => name !== dappName)
      );
    } else {
      setFavoriteDappNames([...favoriteDappNames, dappName]);
    }
  };

  // Function to handle drag and drop reordering
  const swapFavDapps = useCallback(
    (i: number, j: number) => {
      setFavoriteDappNames((prev) => swap(prev, i, j));
    },
    [setFavoriteDappNames]
  );

  // State for Frame
  const [isFrameSDKLoaded, setIsFrameSDKLoaded] = useState(false);
  const [frameContext, setFrameContext] = useState<Context.FrameContext | null>(
    null
  );

  // Initialize Frame SDK
  useEffect(() => {
    const load = async () => {
      const _frameContext = await frameSdk.context;
      setFrameContext(_frameContext);

      frameSdk.actions.ready().then(() => {
        if (!_frameContext.client.added) {
          frameSdk.actions.addFrame();
        }
      });
    };
    if (frameSdk && !isFrameSDKLoaded) {
      setIsFrameSDKLoaded(true);
      load();
    }
  }, [isFrameSDKLoaded]);

  // Fetch dapps from local dapps.json
  useEffect(() => {
    const loadDapps = () => {
      setIsLoadingDapps(true);
      try {
        // Filter dapps by chain
        const filteredData = safeDapps.filter((dapp: SafeDappInfo) =>
          dapp.chains.includes(chainId)
        );

        setDapps(filteredData);
        setFilteredDapps(filteredData);
      } catch (error) {
        console.error("Failed to load dapps:", error);
        setDapps([]);
        setFilteredDapps([]);
      } finally {
        setIsLoadingDapps(false);
      }
    };

    loadDapps();
  }, [chainId]);

  // Filter dapps based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredDapps(dapps);
    } else {
      const filtered = dapps.filter(
        (dapp) =>
          dapp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dapp.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dapp.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDapps(filtered);
    }
  }, [searchQuery, dapps]);

  // Handle URL parameter
  useEffect(() => {
    const url = searchParams.get("url");
    if (url) {
      setAppUrl(url);
    }
  }, [searchParams]);

  // reload iframe when chainId or address changes
  useEffect(() => {
    setIsIframeLoading(true);
    setIframeKey((prev) => prev + 1);
  }, [chainId]);
  useEffect(() => {
    setIsIframeLoading(true);
    setIframeKey((prev) => prev + 1);
  }, [address]);

  // Decode transaction data
  const decodeTransactionData = useCallback(
    async (to: string, data: string) => {
      setIsDecodingTx(true);
      setDecodedTxData(null);

      try {
        const decodedData = await decodeRecursive({
          calldata: data,
          address: to,
          chainId: chainId,
        });

        console.log("Decoded transaction data:", decodedData);
        setDecodedTxData(decodedData);
      } catch (error) {
        console.error("Failed to decode transaction data:", error);
      } finally {
        setIsDecodingTx(false);
      }
    },
    [chainId]
  );

  // Decode signature data
  const decodeSignatureData = useCallback((method: string, params: any[]) => {
    if (method === "personal_sign" || method === "eth_sign") {
      // For personal_sign, the message is the first parameter
      // For eth_sign, the message is the second parameter (first is address)
      const messageParam = method === "personal_sign" ? params[0] : params[1];
      const decodedMessage = decodeSignMessage(messageParam);
      setDecodedSignatureData({
        type: "message",
        decoded: decodedMessage,
      });
    } else if (
      method === "eth_signTypedData" ||
      method === "eth_signTypedData_v3" ||
      method === "eth_signTypedData_v4"
    ) {
      const typedData = params[1];
      const formattedTypedData = formatTypedData(typedData);
      setDecodedSignatureData({
        type: "typedData",
        decoded: formattedTypedData,
      });
    }
  }, []);

  // Handle session request (transactions and signatures)
  const handleSessionRequest = useCallback(
    async (approve: boolean) => {
      if (!currentSessionRequest || !walletClient || !iframeRequestHandlers)
        return;

      try {
        const { id, params } = currentSessionRequest;
        const { request } = params;

        if (approve) {
          let result;
          setPendingRequest(true);

          if (request.method === "eth_sendTransaction") {
            const txParams = request.params[0];
            const hash = await walletClient.sendTransaction({
              account: address as `0x${string}`,
              to: txParams.to as `0x${string}`,
              value: txParams.value ? BigInt(txParams.value) : undefined,
              data: txParams.data as `0x${string}` | undefined,
              gas: txParams.gas ? BigInt(txParams.gas) : undefined,
            });
            result = hash;
          } else if (
            request.method === "personal_sign" ||
            request.method === "eth_sign"
          ) {
            const message = request.params[0];
            const signature = await walletClient.signMessage({
              account: address as `0x${string}`,
              message: { raw: message as `0x${string}` },
            });
            result = signature;
          } else if (
            request.method === "eth_signTypedData" ||
            request.method === "eth_signTypedData_v3" ||
            request.method === "eth_signTypedData_v4"
          ) {
            const typedData = request.params[1];
            const signature = await walletClient.signTypedData({
              account: address as `0x${string}`,
              domain: typedData.domain,
              types: typedData.types,
              primaryType: typedData.primaryType,
              message: typedData.message,
            });
            result = signature;
          }

          setPendingRequest(false);
          setCurrentSessionRequest(null);
          onSessionRequestClose();

          // Resolve the promise with the result
          iframeRequestHandlers.resolve(result);

          toast({
            title: "Request approved",
            description: `Method: ${request.method}`,
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "bottom-right",
          });

          return result;
        } else {
          // Create a proper error object for rejection
          const error = new Error("User rejected the request") as WalletError;
          error.code = 4001; // Standard error code for user rejection

          // Reject the promise with the error
          iframeRequestHandlers.reject(error);

          // Close the modal
          setCurrentSessionRequest(null);
          onSessionRequestClose();

          toast({
            title: "Request rejected",
            status: "info",
            duration: 3000,
            isClosable: true,
            position: "bottom-right",
          });

          // Make sure to throw the error to propagate the rejection
          throw error;
        }
      } catch (error) {
        console.error("Error handling session request:", error);
        setPendingRequest(false);

        // Always close the modal on error
        setCurrentSessionRequest(null);
        onSessionRequestClose();

        // Reject the promise with the error
        if (iframeRequestHandlers) {
          iframeRequestHandlers.reject(error);
        }

        // Only show error toast if it's not a user rejection
        const isUserRejection =
          error instanceof Error &&
          "code" in error &&
          (error as WalletError).code === 4001;
        if (!isUserRejection) {
          // Extract a more user-friendly error message using Viem's error handling
          let errorMessage = String(error);

          // Check if it's a Viem error with a walk method
          if (
            error &&
            typeof error === "object" &&
            "walk" in error &&
            typeof error.walk === "function"
          ) {
            try {
              // Try to extract ContractFunctionRevertedError or other specific error types
              const specificError = error.walk(
                (err: any) =>
                  err?.name === "ContractFunctionRevertedError" ||
                  err?.shortMessage ||
                  err?.message
              );

              if (specificError) {
                // Use the most specific error information available
                errorMessage =
                  specificError.shortMessage ||
                  specificError.message ||
                  specificError.data?.message ||
                  specificError.data?.errorName ||
                  String(specificError);

                // Clean up the error message
                errorMessage = errorMessage
                  .replace(/^(Error:|ContractFunctionRevertedError:)/, "")
                  .trim();
              }
            } catch (walkError) {
              console.error("Error extracting specific error:", walkError);
            }
          }

          toast({
            title: "Transaction failed",
            description: errorMessage,
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "bottom-right",
          });
        }

        throw error;
      }
    },
    [
      currentSessionRequest,
      walletClient,
      address,
      toast,
      onSessionRequestClose,
      iframeRequestHandlers,
    ]
  );

  // Custom close handler for session request modal
  const handleSessionRequestClose = useCallback(() => {
    if (currentSessionRequest && !pendingRequest && !isSwitchingChain) {
      handleSessionRequest(false).catch((error) => {
        console.error("Error handling session request close:", error);
        // Close the modal anyway after rejection
        onSessionRequestClose();
        setCurrentSessionRequest(null);
      });
    } else {
      onSessionRequestClose();
      setCurrentSessionRequest(null);
    }
  }, [
    currentSessionRequest,
    pendingRequest,
    isSwitchingChain,
    handleSessionRequest,
    onSessionRequestClose,
  ]);

  // Handle chain switch
  const handleChainSwitch = useCallback(async () => {
    if (!targetChainId) return;

    try {
      setIsSwitchingChain(true);
      await switchChainAsync({ chainId: targetChainId });
      setIsSwitchingChain(false);
      setNeedsChainSwitch(false);
    } catch (error) {
      setIsSwitchingChain(false);
      console.error("Error switching chain:", error);
      toast({
        title: "Chain Switch Failed",
        description: `Failed to switch to ${
          chainIdToChain[targetChainId]?.name || `Chain ID: ${targetChainId}`
        }`,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [targetChainId, switchChainAsync, toast]);

  // Listen for iframe requests
  useEffect(() => {
    const handleIframeRequest = (event: any) => {
      const { sessionRequest, type } = event.detail;

      // Set the current session request
      setCurrentSessionRequest(sessionRequest);

      // Decode the request data
      if (sessionRequest.params.request.method === "eth_sendTransaction") {
        const txParams = sessionRequest.params.request.params[0];
        if (txParams.data && txParams.to) {
          decodeTransactionData(txParams.to, txParams.data);
        }
      } else if (
        sessionRequest.params.request.method === "personal_sign" ||
        sessionRequest.params.request.method === "eth_sign" ||
        sessionRequest.params.request.method === "eth_signTypedData" ||
        sessionRequest.params.request.method === "eth_signTypedData_v3" ||
        sessionRequest.params.request.method === "eth_signTypedData_v4"
      ) {
        decodeSignatureData(
          sessionRequest.params.request.method,
          sessionRequest.params.request.params
        );
      }

      // Open the modal
      onSessionRequestOpen();
    };

    window.addEventListener("iframe-request", handleIframeRequest);

    return () => {
      window.removeEventListener("iframe-request", handleIframeRequest);
    };
  }, [decodeTransactionData, decodeSignatureData, onSessionRequestOpen]);

  // Check if chain switch is needed when session request changes
  useEffect(() => {
    if (currentSessionRequest && chainId) {
      const { params } = currentSessionRequest;
      const { request } = params;

      // Extract the requested chain ID from the request
      const requestedChainIdStr = params.chainId.split(":")[1];
      const requestedChainId = parseInt(requestedChainIdStr);

      // Check if we need to switch chains for this request
      const requiresChainSwitch =
        chainId !== requestedChainId &&
        (request.method === "eth_sendTransaction" ||
          request.method === "eth_signTransaction" ||
          request.method === "eth_sign" ||
          request.method === "personal_sign" ||
          request.method === "eth_signTypedData" ||
          request.method === "eth_signTypedData_v3" ||
          request.method === "eth_signTypedData_v4");

      setNeedsChainSwitch(requiresChainSwitch);
      setTargetChainId(requiresChainSwitch ? requestedChainId : null);
    } else {
      setNeedsChainSwitch(false);
      setTargetChainId(null);
    }
  }, [currentSessionRequest, chainId]);

  // Navigate back to grid view
  const handleBack = () => {
    router.push("/wallet/bridge/apps");
    setAppUrl(null);
  };

  // Open dapp in iframe
  const openDapp = (url: string) => {
    if (!address) {
      // If wallet is not connected, open connect modal first
      openConnectModal?.();
      // Store the URL to navigate to after connection
      setPendingDappUrl(url);
      return;
    }

    setIsIframeLoading(true);
    router.push(`/wallet/bridge/apps?url=${encodeURIComponent(url)}`);
    setAppUrl(url);
  };

  // Effect to handle navigation after wallet connection
  useEffect(() => {
    if (address && pendingDappUrl) {
      openDapp(pendingDappUrl);
      setPendingDappUrl(null);
    }
  }, [address, pendingDappUrl]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  // Add this function near the other utility functions
  const formatDisplayUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      // Remove query parameters for display but keep protocol
      const displayUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
      // Truncate if too long
      return displayUrl.length > 40
        ? displayUrl.substring(0, 37) + "..."
        : displayUrl;
    } catch (e) {
      return url;
    }
  };

  if (appUrl && isReady) {
    return (
      <Box
        position="fixed"
        inset={0}
        bg="bg.900"
        style={{ backgroundColor: "#1A202C" }}
      >
        <Flex
          position="absolute"
          top={0}
          left={0}
          right={0}
          height="60px"
          bg="whiteAlpha.100"
          borderBottomWidth="1px"
          borderColor="whiteAlpha.200"
          align="center"
          px={4}
          zIndex={1}
          pointerEvents="auto"
        >
          <IconButton
            aria-label="Back to apps"
            icon={<ArrowBackIcon />}
            onClick={handleBack}
            mr={4}
            variant="ghost"
            colorScheme="white"
            zIndex={20001}
          />
          {getCurrentDapp() && !isMobile && (
            <IconButton
              aria-label={
                favoriteDappNames.includes(getCurrentDapp()!.name)
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
              icon={<FontAwesomeIcon icon={faHeart} />}
              onClick={() => toggleFavorite(getCurrentDapp()!.name)}
              mr={2}
              variant="ghost"
              color={
                favoriteDappNames.includes(getCurrentDapp()!.name)
                  ? "orange.300"
                  : "whiteAlpha.600"
              }
              _hover={{
                color: favoriteDappNames.includes(getCurrentDapp()!.name)
                  ? "orange.200"
                  : "white",
                bg: "whiteAlpha.100",
              }}
              size="sm"
            />
          )}
          {!isMobile && (
            <Button
              as="a"
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="unstyled"
              height="auto"
              minW="0"
              p={2}
              _hover={{ textDecoration: "underline" }}
              display="flex"
              alignItems="center"
            >
              <Text color="white" fontSize="sm" fontWeight="medium">
                {formatDisplayUrl(appUrl)}
              </Text>
            </Button>
          )}
          <Spacer />
          <Box display={{ base: "none", md: "block" }} mr={4}>
            <FormControl display="flex" alignItems="center">
              <Tooltip
                label="Verify the tx first via Swiss-Knife's calldata decoder, before sending them to your wallet"
                placement="top"
                hasArrow
              >
                <IconButton
                  aria-label="Info"
                  icon={<InfoIcon />}
                  variant="ghost"
                  size="xs"
                  color="whiteAlpha.600"
                  _hover={{ color: "white" }}
                  onClick={(e) => e.stopPropagation()}
                  mr={1}
                />
              </Tooltip>
              <FormLabel
                htmlFor="auto-approve"
                mb="0"
                color="white"
                fontSize="sm"
              >
                Enable Swiss Knife decoder
              </FormLabel>
              <Switch
                id="auto-approve"
                colorScheme="blue"
                size="sm"
                isChecked={!skipDecoder}
                onChange={(e) => setSkipDecoder(!e.target.checked)}
              />
            </FormControl>
          </Box>
          <ConnectButton />
        </Flex>
        <Box pt="60px" height="100%" width="100%" position="relative">
          <ErrorBoundary
            fallback={
              <Center height="100%" width="100%">
                <VStack spacing={4}>
                  <Text color="white" fontSize="lg">
                    Failed to load the dapp. Please try again.
                  </Text>
                  <Button onClick={handleBack} colorScheme="blue">
                    Back to Apps
                  </Button>
                </VStack>
              </Center>
            }
          >
            {isIframeLoading && (
              <Center height="100%" width="100%" bg="bg.900">
                <VStack spacing={4}>
                  <Spinner
                    size="xl"
                    color="blue.400"
                    thickness="4px"
                    speed="0.8s"
                  />
                  <Text color="whiteAlpha.800">Loading...</Text>
                </VStack>
              </Center>
            )}
            <Box
              height="100%"
              width="100%"
              visibility={isIframeLoading ? "hidden" : "visible"}
              position="relative"
              bg="bg.900"
            >
              <ImpersonatorIframe
                key={iframeKey}
                width="100%"
                height="100%"
                src={appUrl}
                address={
                  address || "0x0000000000000000000000000000000000000000"
                }
                rpcUrl={chainIdToChain[chainId]?.rpcUrls.default.http[0] || ""}
                onLoad={handleIframeLoad}
              />
            </Box>
          </ErrorBoundary>
        </Box>

        {/* Portal container for modals */}
        <Box
          id="modal-portal"
          position="fixed"
          inset={0}
          style={{
            zIndex: 20000,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            overflow: "hidden",
          }}
        />

        {/* Session Request Modal */}
        <SessionRequestModal
          isOpen={isSessionRequestOpen}
          onClose={handleSessionRequestClose}
          currentSessionRequest={currentSessionRequest}
          decodedTxData={decodedTxData}
          isDecodingTx={isDecodingTx}
          decodedSignatureData={decodedSignatureData}
          pendingRequest={pendingRequest}
          isSwitchingChain={isSwitchingChain}
          needsChainSwitch={needsChainSwitch}
          targetChainId={targetChainId}
          approveText={
            connections?.[0]?.connector.id === impersonatorConnectorId ? (
              <HStack>
                <Image
                  color={"black"}
                  src="/external/impersonator-logo-no-bg-dark.svg"
                  alt="Impersonator"
                  width={5}
                  height={5}
                />
                <Text>Approve</Text>
              </HStack>
            ) : undefined
          }
          onApprove={() => handleSessionRequest(true)}
          onReject={() => handleSessionRequest(false)}
          onChainSwitch={handleChainSwitch}
          portalId="modal-portal"
        />
      </Box>
    );
  }

  return (
    <Container maxW="100%" pb={8} px={{ base: 4, md: 8 }}>
      <Global
        styles={{
          ".chakra-react-select__menu": {
            zIndex: "20002 !important",
          },
          ".chakra-react-select__menu-portal": {
            zIndex: "20002 !important",
          },
          ".chakra-react-select__menu-list": {
            zIndex: "20002 !important",
          },
          ".chakra-modal__content": {
            overflow: "visible !important",
            maxHeight: "85vh !important",
            marginTop: "auto !important",
            marginBottom: "auto !important",
          },
          ".chakra-modal__body": {
            overflow: "auto !important",
            maxHeight: "calc(85vh - 140px) !important", // Account for header and footer
          },
          ".chakra-modal__close-button": {
            zIndex: 20003,
            pointerEvents: "auto",
          },
          ".chakra-modal__footer": {
            pointerEvents: "auto",
            "& > button": {
              pointerEvents: "auto",
            },
          },
          "#modal-portal": {
            zIndex: 20000,
            pointerEvents: "none",
            display: "flex !important",
            alignItems: "center !important",
            justifyContent: "center !important",
            "& > *": {
              pointerEvents: "auto",
            },
          },
        }}
      />
      <VStack spacing={8} align="stretch">
        {!isMobile ? (
          <Flex
            position="relative"
            alignItems={"center"}
            width="100%"
            flexDirection={"row"}
            gap={{ base: 4, md: 0 }}
          >
            <Button
              leftIcon={<ArrowBackIcon />}
              onClick={() => router.push("/wallet/bridge")}
              variant="ghost"
              colorScheme="white"
              fontSize={"md"}
            >
              Back to Bridge
            </Button>
            <Spacer />
            <Box>
              <ConnectButton />
            </Box>
          </Flex>
        ) : (
          <Flex
            position="relative"
            alignItems={"center"}
            width="100%"
            flexDirection={"row"}
            gap={{ base: 4, md: 0 }}
          >
            <Button
              leftIcon={<ArrowBackIcon />}
              onClick={() => router.push("/wallet/bridge")}
              variant="ghost"
              colorScheme="white"
              fontSize={"xs"}
            >
              Back
            </Button>
            <Spacer />
            <Box>
              <ConnectButton />
            </Box>
          </Flex>
        )}

        <Center flexDir={"column"} gap={2}>
          <Heading size="xl" color="white" width="100%" textAlign="center">
            🏪 Web3 App Store
          </Heading>
          <Text color="whiteAlpha.800" fontSize="lg" fontStyle={"italic"}>
            Your Web3 Operating System
          </Text>
        </Center>

        <Center>
          <InputGroup maxW="600px">
            <Input
              placeholder="Search apps or enter URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.300"
              _hover={{ borderColor: "whiteAlpha.400" }}
              _focus={{ borderColor: "whiteAlpha.500" }}
              color="white"
              _placeholder={{ color: "whiteAlpha.600" }}
            />
            {searchQuery && (
              <InputRightElement width="auto" pr={1}>
                <HStack spacing={1}>
                  {isValidUrl(searchQuery) && (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => openDapp(searchQuery)}
                    >
                      Launch
                    </Button>
                  )}
                  <IconButton
                    aria-label="Clear search"
                    icon={<CloseIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => setSearchQuery("")}
                  />
                </HStack>
              </InputRightElement>
            )}
          </InputGroup>
        </Center>

        {isLoadingDapps ? (
          <Center py={10}>
            <Spinner size="xl" color="white" />
          </Center>
        ) : (
          <>
            {/* Favorite Apps Section */}
            {favoriteDappNames.length > 0 && (
              <>
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="white">
                    Favorites:
                  </Text>
                  <DndProvider backend={HTML5Backend}>
                    <SimpleGrid
                      columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
                      spacing={6}
                    >
                      {favoriteDappNames
                        .map((dappName) =>
                          dapps.find((d) => d.name === dappName)
                        )
                        .filter((dapp): dapp is SafeDappInfo => {
                          if (!dapp) return false;
                          return (
                            !searchQuery ||
                            dapp.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            dapp.url
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            dapp.description
                              ?.toLowerCase()
                              .includes(searchQuery.toLowerCase())
                          );
                        })
                        .map((dapp, i) => (
                          <FavoriteAppGridItem
                            key={i}
                            dapp={dapp}
                            toggleFavorite={toggleFavorite}
                            onDappClick={openDapp}
                            index={i}
                            handleDropHover={swapFavDapps}
                          />
                        ))}
                    </SimpleGrid>
                  </DndProvider>
                </Box>
                <Divider my="1rem" />
              </>
            )}

            {/* Regular Apps Grid */}
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
              {filteredDapps
                .filter((dapp) => !favoriteDappNames.includes(dapp.name))
                .map((dapp) => (
                  <AppGridItem
                    key={dapp.id}
                    dapp={dapp}
                    toggleFavorite={toggleFavorite}
                    onDappClick={openDapp}
                    isFavorite={false}
                  />
                ))}
            </SimpleGrid>
          </>
        )}
      </VStack>
    </Container>
  );
}

export default function WalletBridgeAppsPage() {
  const isMobile = useBreakpointValue({ base: true, md: false });

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const toast = useToast();
  const [skipDecoder, setSkipDecoder] = useLocalStorage<boolean>(
    "wallet-skip-decoder",
    !!isMobile // skip by default on mobile
  );

  // Store for handling iframe requests
  const [iframeRequestHandlers, setIframeRequestHandlers] = useState<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  } | null>(null);

  // Transaction handler
  const handleTransaction = useCallback(
    async (tx: any): Promise<string> => {
      if (!walletClient) throw new Error("Wallet client not available");

      return new Promise<string>(async (resolve, reject) => {
        // Create a session request for the transaction
        const sessionRequest: SessionRequest = {
          id: Date.now(),
          topic: "iframe-request",
          params: {
            chainId: `eip155:${chainId}`,
            request: {
              method: "eth_sendTransaction",
              params: [tx],
            },
          },
        };

        if (skipDecoder) {
          try {
            // Check if chain switch is needed
            const requestedChainIdStr =
              sessionRequest.params.chainId.split(":")[1];
            const requestedChainId = parseInt(requestedChainIdStr);

            if (chainId !== requestedChainId) {
              await switchChainAsync({ chainId: requestedChainId });
            }

            // Send transaction
            const hash = await walletClient.sendTransaction({
              account: address as `0x${string}`,
              to: tx.to as `0x${string}`,
              value: tx.value ? BigInt(tx.value) : undefined,
              data: tx.data as `0x${string}` | undefined,
              gas: tx.gas ? BigInt(tx.gas) : undefined,
            });

            toast({
              title: "Transaction sent",
              status: "success",
              duration: 3000,
              isClosable: true,
              position: "bottom-right",
            });

            resolve(hash);
          } catch (error) {
            // Extract a more user-friendly error message using Viem's error handling
            let errorMessage = String(error);

            // Check if it's a Viem error with a walk method
            if (
              error &&
              typeof error === "object" &&
              "walk" in error &&
              typeof error.walk === "function"
            ) {
              try {
                // Try to extract ContractFunctionRevertedError or other specific error types
                const specificError = error.walk(
                  (err: any) =>
                    err?.name === "ContractFunctionRevertedError" ||
                    err?.shortMessage ||
                    err?.message
                );

                if (specificError) {
                  // Use the most specific error information available
                  errorMessage =
                    specificError.shortMessage ||
                    specificError.message ||
                    specificError.data?.message ||
                    specificError.data?.errorName ||
                    String(specificError);

                  // Clean up the error message
                  errorMessage = errorMessage
                    .replace(/^(Error:|ContractFunctionRevertedError:)/, "")
                    .trim();
                }
              } catch (walkError) {
                console.error("Error extracting specific error:", walkError);
              }
            }

            toast({
              title: "Transaction failed",
              description: errorMessage,
              status: "error",
              duration: 3000,
              isClosable: true,
              position: "bottom-right",
            });
            reject(error);
          }
        } else {
          // Store the promise handlers
          setIframeRequestHandlers({ resolve, reject });

          // Pass this to the AppStoreContent component
          const event = new CustomEvent("iframe-request", {
            detail: { sessionRequest, type: "transaction" },
          });
          window.dispatchEvent(event);
        }
      });
    },
    [chainId, walletClient, address, switchChainAsync, toast, skipDecoder]
  );

  // Message signing handler
  const handleSignMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!walletClient) throw new Error("Wallet client not available");

      return new Promise<string>(async (resolve, reject) => {
        // Create a session request for message signing
        const sessionRequest: SessionRequest = {
          id: Date.now(),
          topic: "iframe-request",
          params: {
            chainId: `eip155:${chainId}`,
            request: {
              method: "personal_sign",
              params: [message, address],
            },
          },
        };

        if (skipDecoder) {
          try {
            const signature = await walletClient.signMessage({
              account: address as `0x${string}`,
              message: { raw: message as `0x${string}` },
            });

            toast({
              title: "Message signed",
              status: "success",
              duration: 3000,
              isClosable: true,
              position: "bottom-right",
            });

            resolve(signature);
          } catch (error) {
            // Extract a more user-friendly error message using Viem's error handling
            let errorMessage = String(error);

            // Check if it's a Viem error with a walk method
            if (
              error &&
              typeof error === "object" &&
              "walk" in error &&
              typeof error.walk === "function"
            ) {
              try {
                // Try to extract ContractFunctionRevertedError or other specific error types
                const specificError = error.walk(
                  (err: any) =>
                    err?.name === "ContractFunctionRevertedError" ||
                    err?.shortMessage ||
                    err?.message
                );

                if (specificError) {
                  // Use the most specific error information available
                  errorMessage =
                    specificError.shortMessage ||
                    specificError.message ||
                    specificError.data?.message ||
                    specificError.data?.errorName ||
                    String(specificError);

                  // Clean up the error message
                  errorMessage = errorMessage
                    .replace(/^(Error:|ContractFunctionRevertedError:)/, "")
                    .trim();
                }
              } catch (walkError) {
                console.error("Error extracting specific error:", walkError);
              }
            }

            toast({
              title: "Signing failed",
              description: errorMessage,
              status: "error",
              duration: 3000,
              isClosable: true,
              position: "bottom-right",
            });
            reject(error);
          }
        } else {
          // Store the promise handlers
          setIframeRequestHandlers({ resolve, reject });

          // Pass this to the AppStoreContent component
          const event = new CustomEvent("iframe-request", {
            detail: { sessionRequest, type: "message" },
          });
          window.dispatchEvent(event);
        }
      });
    },
    [chainId, walletClient, address, toast, skipDecoder]
  );

  // Typed data signing handler
  const handleSignTypedData = useCallback(
    async (typedData: any): Promise<string> => {
      if (!walletClient) throw new Error("Wallet client not available");

      return new Promise<string>(async (resolve, reject) => {
        // Create a session request for typed data signing
        const sessionRequest: SessionRequest = {
          id: Date.now(),
          topic: "iframe-request",
          params: {
            chainId: `eip155:${chainId}`,
            request: {
              method: "eth_signTypedData_v4",
              params: [address, typedData],
            },
          },
        };

        if (skipDecoder) {
          try {
            const signature = await walletClient.signTypedData({
              account: address as `0x${string}`,
              domain: typedData.domain,
              types: typedData.types,
              primaryType: typedData.primaryType,
              message: typedData.message,
            });

            toast({
              title: "Typed data signed",
              status: "success",
              duration: 3000,
              isClosable: true,
              position: "bottom-right",
            });

            resolve(signature);
          } catch (error) {
            // Extract a more user-friendly error message using Viem's error handling
            let errorMessage = String(error);

            // Check if it's a Viem error with a walk method
            if (
              error &&
              typeof error === "object" &&
              "walk" in error &&
              typeof error.walk === "function"
            ) {
              try {
                // Try to extract ContractFunctionRevertedError or other specific error types
                const specificError = error.walk(
                  (err: any) =>
                    err?.name === "ContractFunctionRevertedError" ||
                    err?.shortMessage ||
                    err?.message
                );

                if (specificError) {
                  // Use the most specific error information available
                  errorMessage =
                    specificError.shortMessage ||
                    specificError.message ||
                    specificError.data?.message ||
                    specificError.data?.errorName ||
                    String(specificError);

                  // Clean up the error message
                  errorMessage = errorMessage
                    .replace(/^(Error:|ContractFunctionRevertedError:)/, "")
                    .trim();
                }
              } catch (walkError) {
                console.error("Error extracting specific error:", walkError);
              }
            }

            toast({
              title: "Signing failed",
              description: errorMessage,
              status: "error",
              duration: 3000,
              isClosable: true,
              position: "bottom-right",
            });
            reject(error);
          }
        } else {
          // Store the promise handlers
          setIframeRequestHandlers({ resolve, reject });

          // Pass this to the AppStoreContent component
          const event = new CustomEvent("iframe-request", {
            detail: { sessionRequest, type: "typedData" },
          });
          window.dispatchEvent(event);
        }
      });
    },
    [chainId, walletClient, address, toast, skipDecoder]
  );

  return (
    <ImpersonatorIframeProvider
      address={address || zeroAddress}
      rpcUrl={chainIdToChain[chainId]?.rpcUrls.default.http[0] || ""}
      sendTransaction={handleTransaction}
      signMessage={handleSignMessage}
      signTypedData={handleSignTypedData}
    >
      <AppStoreContent
        chainId={chainId}
        address={address}
        walletClient={walletClient}
        switchChainAsync={switchChainAsync}
        toast={toast}
        iframeRequestHandlers={iframeRequestHandlers}
        skipDecoder={skipDecoder}
        setSkipDecoder={setSkipDecoder}
      />
    </ImpersonatorIframeProvider>
  );
}
