"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  useToast,
  useDisclosure,
  Skeleton,
  SkeletonText,
  Stack,
  FormControl,
  Input,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { Global } from "@emotion/react";
import frameSdk, { Context } from "@farcaster/frame-sdk";
import {
  useAccount,
  useWalletClient,
  useChainId,
  useSwitchChain,
  usePublicClient,
} from "wagmi";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { ConnectButton } from "@/components/ConnectButton/ConnectButton";
import { walletChains } from "@/app/providers";
import { Address, isAddress } from "viem";

import {
  SessionProposal,
  SessionRequest,
  WalletKitInstance,
} from "../bridge/types";
import SessionProposalModal from "../bridge/components/SessionProposalModal";
import ConnectDapp from "../bridge/components/ConnectDapp";
import ActiveSessions from "../bridge/components/ActiveSessions";
import WalletKitInitializer from "../bridge/components/WalletKitInitializer";
import ChainNotifier from "../bridge/components/ChainNotifier";
import AutoPasteHandler from "../bridge/components/AutoPasteHandler";
import { filterActiveSessions } from "../bridge/utils";

import SmartWalletSessionRequestModal from "./components/SmartWalletSessionRequestModal";
import SmartWalletKitEventHandler from "./components/SmartWalletKitEventHandler";
import type { SmartWalletConfig } from "./types";

interface ValidationState {
  isValidating: boolean;
  isContract: boolean | null;
  isOwner: boolean | null;
  error: string | null;
}

const initialValidation: ValidationState = {
  isValidating: false,
  isContract: null,
  isOwner: null,
  error: null,
};

export default function SmartWalletConnect({
  config,
}: {
  config: SmartWalletConfig;
}) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const [walletAddress, setWalletAddress] = useLocalStorage<string>(
    config.localStorageKey,
    ""
  );

  const [validation, setValidation] =
    useState<ValidationState>(initialValidation);

  const isChainSupported = config.isChainSupported(chainId);

  // Frame SDK
  const [isFrameSDKLoaded, setIsFrameSDKLoaded] = useState(false);
  const [, setFrameContext] = useState<Context.FrameContext | null>(null);

  // WalletConnect state
  const [uri, setUri] = useState<string>("");
  const [pasted, setPasted] = useState(false);
  const [walletKit, setWalletKit] = useState<WalletKitInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  const {
    isOpen: isSessionProposalOpen,
    onOpen: onSessionProposalOpen,
    onClose: onSessionProposalClose,
  } = useDisclosure();

  const {
    isOpen: isSessionRequestOpen,
    onOpen: onSessionRequestOpen,
    onClose: onSessionRequestClose,
  } = useDisclosure();

  const [currentSessionProposal, setCurrentSessionProposal] =
    useState<SessionProposal | null>(null);
  const [currentSessionRequest, setCurrentSessionRequest] =
    useState<SessionRequest | null>(null);
  const [decodedTxData, setDecodedTxData] = useState<any>(null);
  const [isDecodingTx, setIsDecodingTx] = useState<boolean>(false);
  const [decodedSignatureData, setDecodedSignatureData] = useState<{
    type: "message" | "typedData";
    decoded: any;
  } | null>(null);

  const [isSwitchingChain, setIsSwitchingChain] = useState<boolean>(false);
  const [pendingRequest, setPendingRequest] = useState<boolean>(false);

  const [needsChainSwitch, setNeedsChainSwitch] = useState<boolean>(false);
  const [targetChainId, setTargetChainId] = useState<number | null>(null);

  const isConfigurationValid = (): boolean => {
    return (
      walletAddress.trim() !== "" &&
      isChainSupported &&
      validation.isContract === true &&
      validation.isOwner === true &&
      !validation.isValidating
    );
  };

  const validateAddress = useCallback(
    async (addr: string) => {
      if (!addr.trim() || !isAddress(addr) || !publicClient || !address) {
        setValidation(initialValidation);
        return;
      }

      setValidation({
        isValidating: true,
        isContract: null,
        isOwner: null,
        error: null,
      });

      try {
        const bytecode = await publicClient.getBytecode({
          address: addr as Address,
        });

        if (!bytecode || bytecode === "0x") {
          setValidation({
            isValidating: false,
            isContract: false,
            isOwner: null,
            error: `Invalid ${config.shortName} address - not a contract. Has the wallet been deployed on the selected chain?`,
          });
          return;
        }

        try {
          const { isOwner, error } = await config.checkOwner({
            walletAddress: addr as Address,
            eoa: address as Address,
            publicClient,
          });

          setValidation({
            isValidating: false,
            isContract: true,
            isOwner,
            error:
              error ??
              (isOwner
                ? null
                : `Connected wallet is not the owner of this ${config.shortName}`),
          });
        } catch (error) {
          console.error("Error checking owner:", error);
          setValidation({
            isValidating: false,
            isContract: true,
            isOwner: false,
            error: config.ownerCheckErrorMessage,
          });
        }
      } catch (error) {
        console.error(`Error validating ${config.shortName} address:`, error);
        setValidation({
          isValidating: false,
          isContract: null,
          isOwner: null,
          error: `Failed to validate ${config.shortName} address`,
        });
      }
    },
    [publicClient, address, config]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateAddress(walletAddress);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [walletAddress, validateAddress]);

  const connectToDapp = useCallback(async () => {
    if (!walletKit || !uri) return;

    try {
      await walletKit.core.pairing.pair({ uri });
      setUri("");
      toast({
        title: "Connecting to dapp",
        description: "Waiting for session proposal...",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Failed to connect to dapp:", error);
      toast({
        title: "Failed to connect to dapp",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [walletKit, uri, toast]);

  const approveSessionProposal = useCallback(async () => {
    if (!walletKit || !currentSessionProposal || !address || !walletAddress)
      return;

    try {
      const chains = walletChains.map((chain) => `eip155:${chain.id}`);
      const accounts = chains.map((chain) => `${chain}:${walletAddress}`);

      const namespaces = buildApprovedNamespaces({
        proposal: currentSessionProposal.params,
        supportedNamespaces: {
          eip155: {
            chains,
            accounts,
            methods: [
              "eth_sendTransaction",
              "eth_sign",
              "personal_sign",
              "eth_signTransaction",
              "eth_signTypedData",
              "eth_signTypedData_v3",
              "eth_signTypedData_v4",
              "wallet_switchEthereumChain",
              "wallet_addEthereumChain",
            ],
            events: ["chainChanged", "accountsChanged"],
          },
        },
      });

      console.log("Approving session with namespaces:", namespaces);

      await walletKit.approveSession({
        id: currentSessionProposal.id,
        namespaces,
      });

      const sessions = walletKit.getActiveSessions();
      setActiveSessions(filterActiveSessions(Object.values(sessions)));

      onSessionProposalClose();
      setCurrentSessionProposal(null);

      toast({
        title: "Session approved",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Failed to approve session:", error);
      toast({
        title: "Failed to approve session",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [
    walletKit,
    currentSessionProposal,
    address,
    walletAddress,
    onSessionProposalClose,
    toast,
  ]);

  const rejectSessionProposal = useCallback(async () => {
    if (!walletKit || !currentSessionProposal) return;

    try {
      await walletKit.rejectSession({
        id: currentSessionProposal.id,
        reason: {
          code: 5000,
          message: "User rejected the session proposal",
        },
      });

      onSessionProposalClose();
      setCurrentSessionProposal(null);

      toast({
        title: "Session rejected",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Failed to reject session:", error);
      toast({
        title: "Failed to reject session",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [walletKit, currentSessionProposal, onSessionProposalClose, toast]);

  const handleChainSwitch = useCallback(async () => {
    if (!targetChainId) return;

    try {
      setIsSwitchingChain(true);
      await switchChainAsync({ chainId: targetChainId });
      setIsSwitchingChain(false);
      setNeedsChainSwitch(false);
      setTargetChainId(null);
    } catch (error) {
      console.error("Failed to switch chain:", error);
      setIsSwitchingChain(false);
      toast({
        title: "Failed to switch chain",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [targetChainId, switchChainAsync, toast]);

  const handleSessionRequestClose = useCallback(() => {
    onSessionRequestClose();
    setCurrentSessionRequest(null);
    setDecodedTxData(null);
    setDecodedSignatureData(null);
    setPendingRequest(false);
    setNeedsChainSwitch(false);
    setTargetChainId(null);
  }, [onSessionRequestClose]);

  const disconnectSession = useCallback(
    async (topic: string) => {
      if (!walletKit) return;

      try {
        await walletKit.disconnectSession({
          topic,
          reason: {
            code: 6000,
            message: "User disconnected the session",
          },
        });

        const sessions = walletKit.getActiveSessions();
        setActiveSessions(filterActiveSessions(Object.values(sessions)));

        toast({
          title: "Session disconnected",
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "bottom-right",
        });
      } catch (error) {
        console.error("Failed to disconnect session:", error);
        toast({
          title: "Failed to disconnect session",
          description: (error as Error).message,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom-right",
        });
      }
    },
    [walletKit, toast]
  );

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

  useEffect(() => {
    if (currentSessionRequest && chainId) {
      const { params } = currentSessionRequest;
      const { request } = params;

      const requestedChainIdStr = params.chainId.split(":")[1];
      const requestedChainId = parseInt(requestedChainIdStr);

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

  const ConfigFooter = config.ConfigFooter;

  return (
    <Box w="full" mt="-2rem">
      <Container
        mt="2rem"
        maxW={{ base: "20rem", md: "80%" }}
        px={{ base: 3, sm: 4, md: 6 }}
        mx="auto"
      >
        <Global
          styles={{
            ".chakra-react-select__menu": {
              zIndex: "9999 !important",
            },
            ".chakra-react-select__menu-portal": {
              zIndex: "9999 !important",
            },
            ".chakra-react-select__menu-list": {
              zIndex: "9999 !important",
            },
            ".chakra-modal__content": {
              overflow: "visible !important",
            },
            ".chakra-modal__body": {
              overflow: "visible !important",
            },
          }}
        />

        <WalletKitInitializer
          isConnected={isConnected}
          address={address}
          setWalletKit={setWalletKit}
          setActiveSessions={setActiveSessions}
          setIsInitializing={setIsInitializing}
          isInitializing={isInitializing}
        />

        <SmartWalletKitEventHandler
          config={config}
          walletKit={walletKit}
          address={address}
          walletAddress={walletAddress}
          setCurrentSessionProposal={setCurrentSessionProposal}
          setCurrentSessionRequest={setCurrentSessionRequest}
          setDecodedTxData={setDecodedTxData}
          setIsDecodingTx={setIsDecodingTx}
          setDecodedSignatureData={setDecodedSignatureData}
          setActiveSessions={setActiveSessions}
          onSessionProposalOpen={onSessionProposalOpen}
          onSessionRequestOpen={onSessionRequestOpen}
        />

        <ChainNotifier
          walletKit={walletKit}
          isConnected={isConnected}
          chainId={chainId}
          activeSessions={activeSessions}
        />

        <AutoPasteHandler
          pasted={pasted}
          isConnected={isConnected}
          uri={uri}
          connectToDapp={connectToDapp}
          setPasted={setPasted}
        />

        <VStack
          spacing={{ base: 4, md: 6 }}
          align="stretch"
          w="100%"
          maxW={{ base: "100%", md: "700px", lg: "800px" }}
          mx="auto"
        >
          <Flex
            justifyContent="space-between"
            alignItems="center"
            direction={{ base: "column", lg: "row" }}
            gap={{ base: 4, lg: 0 }}
          >
            <Heading size={{ base: "xl", md: "xl" }}>
              {config.emoji} {config.shortName} Connect
            </Heading>
            {isConnected && <ConnectButton />}
          </Flex>

          <Text mb={2} fontSize={{ base: "md", md: "lg" }} color="gray.300">
            {config.description}
          </Text>

          <Box>
            {isInitializing ? (
              <Box p={{ base: 4, md: 6 }} borderWidth={1} borderRadius="lg">
                <Stack spacing={4}>
                  <Skeleton height="40px" width="60%" />
                  <SkeletonText
                    mt={2}
                    noOfLines={3}
                    spacing={4}
                    skeletonHeight={4}
                  />
                  <Skeleton height="60px" mt={2} />
                </Stack>
              </Box>
            ) : (
              <>
                {!isConnected && (
                  <Box
                    mt={{ base: 0, md: -5 }}
                    p={{ base: 4, md: 6 }}
                    borderWidth={1}
                    borderRadius="lg"
                    textAlign="center"
                    mb={{ base: 3, md: 4 }}
                  >
                    <Text mb={{ base: 3, md: 4 }}>
                      Please connect your wallet that owns the{" "}
                      {config.shortName} contract
                    </Text>
                    <ConnectButton />
                  </Box>
                )}

                {isConnected && (
                  <Box
                    p={{ base: 4, md: 6 }}
                    borderWidth={1}
                    borderRadius="lg"
                    mb={{ base: 3, md: 4 }}
                  >
                    <Heading
                      size={{ base: "sm", md: "md" }}
                      mb={{ base: 3, md: 4 }}
                    >
                      {config.configHeading}
                    </Heading>
                    <VStack spacing={{ base: 3, md: 4 }}>
                      <FormControl isRequired>
                        <Input
                          placeholder="0x..."
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          size={{ base: "md", md: "md" }}
                          isDisabled={validation.isValidating}
                        />
                      </FormControl>

                      {validation.isValidating && (
                        <Alert status="info" borderRadius="md">
                          <AlertIcon />
                          Validating {config.shortName} address...
                        </Alert>
                      )}

                      {validation.error && (
                        <Alert status="error" borderRadius="md">
                          <AlertIcon />
                          {validation.error}
                        </Alert>
                      )}

                      {validation.isContract === true &&
                        validation.isOwner === true && (
                          <Alert status="success" borderRadius="md">
                            <AlertIcon />
                            {config.shortName} address validated successfully
                          </Alert>
                        )}

                      {!isChainSupported && (
                        <Alert status="warning" borderRadius="md">
                          <AlertIcon />
                          This chain is not supported. Please switch to a
                          supported chain:{" "}
                          {config.getSupportedChainNames().join(", ")}
                        </Alert>
                      )}

                      {!isConfigurationValid() &&
                        isChainSupported &&
                        !validation.error &&
                        walletAddress.trim() === "" && (
                          <Alert status="warning" borderRadius="md">
                            <AlertIcon />
                            Please provide {config.shortName} address to
                            continue.
                          </Alert>
                        )}

                      {ConfigFooter && <ConfigFooter chainId={chainId} />}
                    </VStack>
                  </Box>
                )}

                <ConnectDapp
                  uri={uri}
                  setUri={setUri}
                  setPasted={setPasted}
                  isConnected={isConnected && isConfigurationValid()}
                  connectToDapp={connectToDapp}
                />

                <ActiveSessions
                  isConnected={isConnected && isConfigurationValid()}
                  activeSessions={activeSessions}
                  chainId={chainId}
                  disconnectSession={disconnectSession}
                />
              </>
            )}
          </Box>
        </VStack>

        <SessionProposalModal
          isOpen={isSessionProposalOpen}
          onClose={onSessionProposalClose}
          currentSessionProposal={currentSessionProposal}
          onApprove={approveSessionProposal}
          onReject={rejectSessionProposal}
        />

        <SmartWalletSessionRequestModal
          config={config}
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
          onChainSwitch={handleChainSwitch}
          walletAddress={walletAddress}
          walletKit={walletKit}
          address={address}
          walletClient={walletClient}
          setPendingRequest={setPendingRequest}
          setIsSwitchingChain={setIsSwitchingChain}
          setNeedsChainSwitch={setNeedsChainSwitch}
          setTargetChainId={setTargetChainId}
          toast={toast}
        />
      </Container>
    </Box>
  );
}
