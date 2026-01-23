"use client";

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Grid,
  Container,
  Flex,
  Image,
  Spinner,
  Avatar,
  InputGroup,
  InputLeftElement,
  useToast,
  HStack,
} from "@chakra-ui/react";
import { parseAsString, useQueryState } from "next-usequerystate";
import { ConnectButton } from "@/components/ConnectButton";
import { base, baseSepolia } from "wagmi/chains";
import { baseURL } from "@/config";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { resolveNameToAddress, getNameAvatar, isResolvableName } from "@/utils";
import debounce from "lodash/debounce";
import axios from "axios";
// @ts-ignore - x402-axios has dual package exports which may cause TS resolution issues
import { withPaymentInterceptor } from "x402-axios";
import { USDC_ADDRESSES, USDC_ABI, USDC_DECIMALS } from "@/data/tokens";
import { farcasterApi, isFarcasterUsername } from "@/utils/farcaster";
import { NeynarUser } from "@/types/neynar";
import { useDebounce } from "@/hooks/useDebounce";
import frameSdk, { Context } from "@farcaster/frame-sdk";

function USDCPayContent() {
  const searchParams = useSearchParams();
  const isTestnet = searchParams.get("testnet") === "true";
  const selectedChain = isTestnet ? baseSepolia : base;
  const usdcAddress = isTestnet
    ? USDC_ADDRESSES.BASE_SEPOLIA
    : USDC_ADDRESSES.BASE;

  const { address: walletAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { openConnectModal } = useConnectModal();
  const toast = useToast();
  const [address, setAddress] = useQueryState<string>(
    "to",
    parseAsString.withDefault("")
  );
  const [amount, setAmount] = useQueryState<string>(
    "amount",
    parseAsString.withDefault("0")
  );
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for Frame
  const [isFrameSDKLoaded, setIsFrameSDKLoaded] = useState(false);
  const [frameContext, setFrameContext] = useState<Context.FrameContext | null>(
    null
  );

  // ENS/Basename/Farcaster resolution state
  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [farcasterUsername, setFarcasterUsername] = useState("");
  const [farcasterAvatar, setFarcasterAvatar] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [resolutionFailed, setResolutionFailed] = useState(false);

  // Farcaster search dropdown state
  const [searchResults, setSearchResults] = useState<NeynarUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [userJustSelected, setUserJustSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedAddress = useDebounce(address, 300);

  // Fetch USDC balance
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined,
    chainId: selectedChain.id,
    query: {
      enabled: !!walletAddress && isConnected,
      refetchInterval: 2000, // Poll every 2 seconds
    },
  });

  const usdcBalance =
    typeof balanceData === "bigint"
      ? formatUnits(balanceData, USDC_DECIMALS)
      : "0";

  // ENS/Basename/Farcaster resolution
  const resolveAddress = useMemo(
    () =>
      debounce(async (val: string) => {
        if (!val) {
          setEnsName("");
          setEnsAvatar("");
          setFarcasterUsername("");
          setFarcasterAvatar("");
          setResolvedAddress("");
          setIsLoadingAvatar(false);
          setResolutionFailed(false);
          return;
        }

        // Check if it's an ENS or Basename
        if (isResolvableName(val)) {
          setIsResolving(true);
          setIsLoadingAvatar(true);
          setResolutionFailed(false);
          setFarcasterUsername("");
          setFarcasterAvatar("");
          try {
            const resolvedAddr = await resolveNameToAddress(val);
            if (resolvedAddr) {
              setResolvedAddress(resolvedAddr);
              setEnsName(val);
              setResolutionFailed(false);
              // Keep isLoadingAvatar true, will be handled by avatar loading effect
            } else {
              setResolvedAddress("");
              setEnsName("");
              setEnsAvatar("");
              setIsLoadingAvatar(false);
              setResolutionFailed(true);
            }
          } catch (error) {
            console.error("Error resolving name:", error);
            setResolvedAddress("");
            setEnsName("");
            setEnsAvatar("");
            setIsLoadingAvatar(false);
            setResolutionFailed(true);
          } finally {
            setIsResolving(false);
          }
        } else if (val.length === 42 && val.startsWith("0x")) {
          // It's already an address
          setResolvedAddress(val);
          setEnsName("");
          setEnsAvatar("");
          setFarcasterUsername("");
          setFarcasterAvatar("");
          setIsLoadingAvatar(false);
          setResolutionFailed(false);
        } else if (val.startsWith("@") && isFarcasterUsername(val)) {
          // Only resolve Farcaster usernames that start with @
          // This means user selected from dropdown or manually typed @username
          setIsResolving(true);
          setIsLoadingAvatar(true);
          setResolutionFailed(false);
          setEnsName("");
          setEnsAvatar("");
          try {
            const cleanUsername = val.slice(1); // Remove @
            const user = await farcasterApi.getUserByUsername(cleanUsername);
            if (user) {
              const address =
                user.verified_addresses.eth_addresses[0] ||
                user.custody_address;
              if (address) {
                setResolvedAddress(address);
                setFarcasterUsername(user.username);
                if (user.pfp_url) {
                  setFarcasterAvatar(user.pfp_url);
                }
                setResolutionFailed(false);
              } else {
                setResolvedAddress("");
                setFarcasterUsername("");
                setFarcasterAvatar("");
                setIsLoadingAvatar(false);
                setResolutionFailed(true);
              }
            } else {
              setResolvedAddress("");
              setFarcasterUsername("");
              setFarcasterAvatar("");
              setIsLoadingAvatar(false);
              setResolutionFailed(true);
            }
          } catch (error) {
            console.error("Error resolving Farcaster username:", error);
            setResolvedAddress("");
            setFarcasterUsername("");
            setFarcasterAvatar("");
            setIsLoadingAvatar(false);
            setResolutionFailed(true);
          } finally {
            setIsResolving(false);
            setIsLoadingAvatar(false);
          }
        } else {
          // For partial Farcaster usernames (without @), don't show as invalid
          // Just clear resolved state and let them continue typing or select from dropdown
          setResolvedAddress("");
          setEnsName("");
          setEnsAvatar("");
          setFarcasterUsername("");
          setFarcasterAvatar("");
          setIsLoadingAvatar(false);
          setResolutionFailed(false); // Don't mark as failed for partial input
        }
      }, 500),
    []
  );

  // Fetch avatar when ensName changes
  useEffect(() => {
    if (ensName) {
      // isLoadingAvatar is already set to true by resolveEns
      getNameAvatar(ensName).then((avatarUrl) => {
        if (avatarUrl) {
          // Preload the image before setting it
          const img = document.createElement("img");
          img.onload = () => {
            setEnsAvatar(avatarUrl);
            setIsLoadingAvatar(false);
          };
          img.onerror = () => {
            setEnsAvatar("");
            setIsLoadingAvatar(false);
          };
          img.src = avatarUrl;
        } else {
          setEnsAvatar("");
          setIsLoadingAvatar(false);
        }
      });
    } else {
      setEnsAvatar("");
      setIsLoadingAvatar(false);
    }
  }, [ensName]);

  // Search for Farcaster users when input changes (debounced)
  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedAddress.trim() || !isFarcasterUsername(debouncedAddress)) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      // Don't show dropdown if user was just selected
      if (userJustSelected) {
        return;
      }

      setIsResolving(true);
      try {
        const results = await farcasterApi.searchUsers(debouncedAddress, 5);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsResolving(false);
      }
    };

    searchUsers();
  }, [debouncedAddress, userJustSelected]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Resolve address when input changes
  useEffect(() => {
    // Skip resolution if user just selected from dropdown
    if (userJustSelected) {
      return;
    }

    // Immediately clear previous data when address changes
    setEnsName("");
    setEnsAvatar("");
    setFarcasterUsername("");
    setFarcasterAvatar("");
    setResolvedAddress("");
    setIsLoadingAvatar(false);
    setResolutionFailed(false);

    // Then trigger debounced resolution
    resolveAddress(address);
  }, [address, resolveAddress, userJustSelected]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

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

  const clearSuccessState = () => {
    if (showSuccess) {
      setShowSuccess(false);
      setAmount("0");
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  };

  const handleMaxClick = () => {
    clearSuccessState();
    setAmount(usdcBalance);
  };

  const handleNumberClick = (num: string) => {
    clearSuccessState();
    if (amount === "0") {
      setAmount(num);
    } else {
      setAmount(amount + num);
    }
  };

  const handleDecimalClick = () => {
    clearSuccessState();
    if (!amount.includes(".")) {
      setAmount(amount + ".");
    }
  };

  const handleBackspace = () => {
    clearSuccessState();
    if (amount.length > 1) {
      setAmount(amount.slice(0, -1));
    } else {
      setAmount("0");
    }
  };

  const handlePay = async () => {
    if (!walletClient) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const targetAddress = resolvedAddress || address;
    setIsProcessingPayment(true);

    try {
      // Create axios instance with x402 payment interceptor
      const axiosInstance = withPaymentInterceptor(
        axios.create(),
        walletClient as unknown as Parameters<typeof withPaymentInterceptor>[1]
      );

      // Make request to the payment-gated API
      const response = await axiosInstance.post(
        "/api/usdc-pay",
        {
          to: targetAddress,
          amount: amount,
          network: isTestnet ? "base-sepolia" : "base",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Payment successful - show success state on button
      setShowSuccess(true);

      // Force refresh balance after payment
      refetchBalance();

      // Reset success state and amount after 2 seconds
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
        setAmount("0");
        successTimerRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Error processing payment:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { error?: string } } })?.response
              ?.data?.error ||
            (error as { message?: string })?.message ||
            "Failed to process payment";

      toast({
        title: "Payment Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (amount === "") {
      setAmount("0");
    }
  };

  const selectUser = async (user: NeynarUser) => {
    setAddress(`@${user.username}`);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setUserJustSelected(true);

    // Blur the input to remove focus
    if (inputRef.current) {
      inputRef.current.blur();
    }

    try {
      const address =
        user.verified_addresses.eth_addresses[0] || user.custody_address;
      if (address) {
        setResolvedAddress(address);
        setFarcasterUsername(user.username);
        if (user.pfp_url) {
          setFarcasterAvatar(user.pfp_url);
        }
        setResolutionFailed(false);
      } else {
        setResolvedAddress("");
        setFarcasterUsername("");
        setFarcasterAvatar("");
        setResolutionFailed(true);
        toast({
          title: "Error",
          description: "Could not find ETH address for this user",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error selecting user:", error);
      setResolvedAddress("");
      setFarcasterUsername("");
      setFarcasterAvatar("");
      setResolutionFailed(true);
      toast({
        title: "Error",
        description: "Failed to get address for selected user",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          selectUser(searchResults[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputChange = (value: string) => {
    clearSuccessState();
    setAddress(value);

    // Reset flags when user starts typing manually
    if (userJustSelected) {
      setUserJustSelected(false);
    }
  };

  return (
    <Box
      h={{ base: "100vh", md: "auto" }}
      minH={{ base: "100vh", md: "100vh" }}
      bg="black"
      display="flex"
      alignItems={{ base: "flex-start", md: "center" }}
      justifyContent="center"
      py={{ base: 0, md: 4 }}
      position="relative"
      overflow="hidden"
    >
      {/* Logo - Top Left */}
      <Link href={baseURL}>
        <Flex
          position="absolute"
          top={{ base: 2, md: 6 }}
          left={{ base: 2, md: 6 }}
          zIndex={10}
          cursor="pointer"
          _hover={{ opacity: 0.8 }}
          transition="opacity 0.2s"
        >
          <Image
            w={{ base: "2rem", md: "2.5rem" }}
            h={{ base: "2rem", md: "2.5rem" }}
            alt="Swiss Knife"
            src="/icon.png"
            rounded="lg"
          />
        </Flex>
      </Link>

      {/* Connect Button - Top Right */}
      <Flex
        position="absolute"
        top={{ base: 2, md: 6 }}
        right={{ base: 2, md: 6 }}
        zIndex={10}
      >
        <ConnectButton hideChain expectedChainId={selectedChain.id} />
      </Flex>

      <Container
        maxW="400px"
        px={4}
        pt={{ base: 16, md: 4 }}
        pb={{ base: 4, md: 0 }}
        h={{ base: "100%", md: "auto" }}
      >
        <VStack
          spacing={{ base: 3, md: 5 }}
          w="100%"
          h={{ base: "100%", md: "auto" }}
          justify="space-between"
        >
          {/* Header */}
          <VStack
            spacing={{ base: 1, md: 2 }}
            w="100%"
            textAlign="center"
            mb={{ base: 0, md: 2 }}
          >
            <Text
              fontSize={{ base: "3xl", md: "4xl" }}
              fontWeight="900"
              color="white"
              letterSpacing="tight"
            >
              USDC Pay
            </Text>
            <Text
              fontSize={{ base: "xs", md: "sm" }}
              color="gray.400"
              lineHeight="1.5"
            >
              Transfer USDC on {isTestnet ? "Base Sepolia" : "Base"}{" "}
              <Text as="span" color="custom.greenLight" fontWeight="semibold">
                without gas fees
              </Text>
              !
            </Text>
            <Text fontSize="xs" color="gray.600">
              Powered by x402
            </Text>
          </VStack>

          {/* Address Input */}
          <Box w="100%" position="relative">
            <Text fontSize="xs" mb={1} color="gray.400">
              To Address
            </Text>
            <InputGroup>
              {(ensAvatar || farcasterAvatar) && (
                <InputLeftElement
                  h={{ base: "2rem", md: "2.5rem" }}
                  w={{ base: "2.5rem", md: "3rem" }}
                >
                  <Avatar
                    src={ensAvatar || farcasterAvatar}
                    w={{ base: "1.5rem", md: "1.75rem" }}
                    h={{ base: "1.5rem", md: "1.75rem" }}
                    ignoreFallback
                  />
                </InputLeftElement>
              )}
              <Input
                ref={inputRef}
                placeholder="Address, ENS, Basename, or Farcaster"
                value={address}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (
                    searchResults.length > 0 &&
                    isFarcasterUsername(address)
                  ) {
                    setShowDropdown(true);
                  }
                }}
                size={{ base: "sm", md: "md" }}
                bg="#1a1a1a"
                border="none"
                color="white"
                _placeholder={{ color: "gray.600" }}
                _focus={{
                  bg: "#1a1a1a",
                  outline: "none",
                }}
                fontFamily="mono"
                fontSize="sm"
                borderRadius="lg"
                autoComplete="off"
                type="text"
                name="ethereum-address"
                data-form-type="other"
                pl={
                  ensAvatar || farcasterAvatar
                    ? { base: "2.5rem", md: "3rem" }
                    : undefined
                }
                sx={{
                  transition:
                    "box-shadow 0.3s ease-in-out, border 0.3s ease-in-out",
                  ...(resolutionFailed
                    ? {
                        border: "2px solid",
                        borderColor: "red.500",
                      }
                    : isResolving || isLoadingAvatar
                      ? {
                          "@keyframes glow": {
                            "0%, 100%": {
                              boxShadow:
                                "0 0 8px rgba(74, 144, 226, 0.5), 0 0 16px rgba(74, 144, 226, 0.3), 0 0 24px rgba(74, 144, 226, 0.1)",
                            },
                            "50%": {
                              boxShadow:
                                "0 0 12px rgba(74, 144, 226, 0.7), 0 0 24px rgba(74, 144, 226, 0.5), 0 0 36px rgba(74, 144, 226, 0.2)",
                            },
                          },
                          animation: "glow 2s ease-in-out infinite",
                        }
                      : {}),
                }}
              />
            </InputGroup>

            {/* Search Results Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <Box
                ref={dropdownRef}
                position="absolute"
                top="100%"
                left={0}
                right={0}
                zIndex={10}
                mt={1}
                bg="#1a1a1a"
                border="1px solid"
                borderColor="#333"
                borderRadius="lg"
                maxH="300px"
                overflowY="auto"
                boxShadow="0 4px 12px rgba(0, 0, 0, 0.5)"
              >
                {searchResults.map((user, index) => (
                  <Box
                    key={user.fid}
                    p={3}
                    cursor="pointer"
                    bg={selectedIndex === index ? "#252525" : "transparent"}
                    _hover={{ bg: "#252525" }}
                    onClick={() => selectUser(user)}
                    borderBottom="1px solid"
                    borderColor="#333"
                    _last={{ borderBottom: "none" }}
                  >
                    <HStack gap={3}>
                      <Avatar
                        src={user.pfp_url}
                        name={user.display_name}
                        w="32px"
                        h="32px"
                      />
                      <VStack align="start" gap={0} flex={1}>
                        <Text color="white" fontWeight="medium" fontSize="sm">
                          @{user.username}
                        </Text>
                        <Text
                          color="gray.500"
                          fontSize="xs"
                          noOfLines={1}
                          maxW="100%"
                        >
                          {user.display_name}
                        </Text>
                      </VStack>
                      <Text color="gray.600" fontSize="xs">
                        {user.follower_count.toLocaleString()}
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </Box>
            )}

            {resolvedAddress && (ensName || farcasterUsername) && (
              <Text fontSize="2xs" color="gray.600" mt={1} fontFamily="mono">
                {resolvedAddress}
              </Text>
            )}
          </Box>

          {/* USDC Balance Display - Compact */}
          {isConnected && (
            <Flex
              w="100%"
              justify="flex-end"
              align="center"
              gap={2}
              mb={{ base: -1, md: -2 }}
            >
              {isBalanceLoading ? (
                <>
                  <Spinner size="xs" color="gray.500" />
                  <Text fontSize="xs" color="gray.500">
                    Loading balance...
                  </Text>
                </>
              ) : (
                <>
                  <Text fontSize="xs" color="gray.500">
                    Balance ${parseFloat(usdcBalance).toFixed(2)}
                  </Text>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    cursor="pointer"
                    _hover={{ color: "gray.400" }}
                    onClick={handleMaxClick}
                  >
                    (max)
                  </Text>
                </>
              )}
            </Flex>
          )}

          {/* Amount Display */}
          <Box
            w="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            py={{ base: 0, md: 0 }}
            mt={{ base: -6, md: -6 }}
          >
            <Text
              fontSize={{ base: "5xl", md: "6xl" }}
              fontWeight="bold"
              color="white"
              lineHeight="1"
            >
              $
            </Text>
            <Input
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and one decimal point
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  clearSuccessState();
                  setAmount(value);
                }
              }}
              onFocus={(e) => {
                handleFocus();
                // Select all text on focus for easy replacement
                e.target.select();
              }}
              onBlur={handleBlur}
              placeholder="0"
              _placeholder={{ color: "white", opacity: 1 }}
              fontSize={{ base: "5xl", md: "6xl" }}
              fontWeight="bold"
              textAlign="center"
              color="white"
              bg="transparent"
              border="none"
              _focus={{
                bg: "transparent",
                outline: "none",
                border: "none",
                boxShadow: "none",
              }}
              paddingInlineStart="0"
              paddingInlineEnd="0"
              h="auto"
              w={`${Math.max(amount.length || 1, 1)}ch`}
              maxW="100%"
              sx={{
                caretColor: "white",
              }}
            />
          </Box>

          {/* Keypad */}
          <VStack spacing={{ base: 2, md: 2.5 }} w="100%">
            <Grid
              templateColumns="repeat(3, 1fr)"
              gap={{ base: 2, md: 2.5 }}
              w="100%"
            >
              {/* Row 1: 1, 2, 3 */}
              {["1", "2", "3"].map((num) => (
                <Button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  h={{ base: "14", md: "16" }}
                  fontSize={{ base: "xl", md: "2xl" }}
                  bg="#1a1a1a"
                  color="white"
                  border="none"
                  borderRadius="lg"
                  _hover={{ bg: "#252525" }}
                  _active={{ bg: "#2a2a2a" }}
                >
                  {num}
                </Button>
              ))}

              {/* Row 2: 4, 5, 6 */}
              {["4", "5", "6"].map((num) => (
                <Button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  h={{ base: "14", md: "16" }}
                  fontSize={{ base: "xl", md: "2xl" }}
                  bg="#1a1a1a"
                  color="white"
                  border="none"
                  borderRadius="lg"
                  _hover={{ bg: "#252525" }}
                  _active={{ bg: "#2a2a2a" }}
                >
                  {num}
                </Button>
              ))}

              {/* Row 3: 7, 8, 9 */}
              {["7", "8", "9"].map((num) => (
                <Button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  h={{ base: "14", md: "16" }}
                  fontSize={{ base: "xl", md: "2xl" }}
                  bg="#1a1a1a"
                  color="white"
                  border="none"
                  borderRadius="lg"
                  _hover={{ bg: "#252525" }}
                  _active={{ bg: "#2a2a2a" }}
                >
                  {num}
                </Button>
              ))}

              {/* Row 4: ., 0, ← */}
              <Button
                onClick={handleDecimalClick}
                h={{ base: "14", md: "16" }}
                fontSize={{ base: "xl", md: "2xl" }}
                bg="#1a1a1a"
                color="white"
                border="none"
                borderRadius="lg"
                _hover={{ bg: "#252525" }}
                _active={{ bg: "#2a2a2a" }}
              >
                .
              </Button>
              <Button
                onClick={() => handleNumberClick("0")}
                h={{ base: "14", md: "16" }}
                fontSize={{ base: "xl", md: "2xl" }}
                bg="#1a1a1a"
                color="white"
                border="none"
                borderRadius="lg"
                _hover={{ bg: "#252525" }}
                _active={{ bg: "#2a2a2a" }}
              >
                0
              </Button>
              <Button
                onClick={handleBackspace}
                h={{ base: "14", md: "16" }}
                fontSize={{ base: "xl", md: "2xl" }}
                bg="#1a1a1a"
                color="white"
                border="none"
                borderRadius="lg"
                _hover={{ bg: "#252525" }}
                _active={{ bg: "#2a2a2a" }}
              >
                ←
              </Button>
            </Grid>

            {/* Pay Button */}
            <Button
              onClick={!isConnected ? openConnectModal : handlePay}
              w="100%"
              h={{ base: "12", md: "14" }}
              bg={showSuccess ? "green.500" : "blue.500"}
              color="white"
              fontSize={{ base: "md", md: "lg" }}
              fontWeight="bold"
              borderRadius="lg"
              _hover={{ bg: showSuccess ? "green.500" : "blue.600" }}
              _active={{ bg: showSuccess ? "green.500" : "blue.700" }}
              _disabled={{
                bg: showSuccess ? "green.500" : "gray.700",
                color: showSuccess ? "white" : "gray.500",
                cursor: showSuccess ? "default" : "not-allowed",
                opacity: 1,
              }}
              isDisabled={
                showSuccess ||
                (isConnected &&
                  (!address ||
                    amount === "0" ||
                    amount === "" ||
                    isResolving ||
                    resolutionFailed ||
                    // For ENS/Basename/Farcaster, need resolved address
                    ((isResolvableName(address) ||
                      (isFarcasterUsername(address) &&
                        address.startsWith("@"))) &&
                      !resolvedAddress) ||
                    // For direct hex addresses, just check format
                    (address.startsWith("0x") && address.length !== 42) ||
                    isProcessingPayment ||
                    // Check if amount exceeds balance
                    parseFloat(amount) > parseFloat(usdcBalance)))
              }
              isLoading={isProcessingPayment}
              loadingText="Processing..."
              transition="all 0.3s ease-in-out"
            >
              {showSuccess ? (
                <HStack gap={2}>
                  <Text>✓</Text>
                  <Text>Success</Text>
                </HStack>
              ) : !isConnected ? (
                "Connect Wallet"
              ) : resolutionFailed ? (
                "Invalid address"
              ) : isResolving ? (
                "Resolving..."
              ) : isProcessingPayment ? (
                "Processing..."
              ) : parseFloat(amount) > parseFloat(usdcBalance) ? (
                "Insufficient Balance"
              ) : (
                "Pay"
              )}
            </Button>
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
}

export default function USDCPay() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <USDCPayContent />
    </Suspense>
  );
}
