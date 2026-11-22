"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  IconButton,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Plus, Search } from "lucide-react";
import { getAddress, isAddress } from "viem";
import { useAccount } from "wagmi";
import { usePortfolio } from "@/app/migrate/hooks/usePortfolio";
import type { OftDeployment } from "../lib/oft";
import {
  ROBIN_TOKEN_REGISTRY,
  findRegisteredDeployment,
} from "../lib/registry";
import {
  resolveOftDeployment,
  type ResolvedOftDeployment,
} from "../lib/resolveDeployment";
import {
  BaseTokenHoldingsMenu,
  getBaseTokenHoldings,
} from "./BaseTokenHoldingsMenu";

export function TokenLogo({
  src,
  alt = "",
  size = "22px",
}: {
  src: string;
  alt?: string;
  size?: string;
}) {
  return (
    <Box
      boxSize={size}
      flexShrink={0}
      display="grid"
      placeItems="center"
      overflow="hidden"
      borderRadius="full"
      bg="white"
    >
      <Image
        src={src}
        alt={alt}
        boxSize="full"
        objectFit="contain"
        borderRadius="full"
      />
    </Box>
  );
}

export function RegisteredTokenList({
  deployment,
  onSelect,
}: {
  deployment: OftDeployment;
  onSelect: (deployment: OftDeployment) => void;
}) {
  const { address } = useAccount();
  const modal = useDisclosure();
  const registeredDeployment = findRegisteredDeployment(
    deployment.baseToken,
    deployment.robinToken
  );
  const needsPortfolioLogo = !registeredDeployment && !deployment.logo;
  const portfolio = usePortfolio(
    modal.isOpen || needsPortfolioLogo ? address : undefined
  );
  const baseHoldings = useMemo(
    () => getBaseTokenHoldings(portfolio.tokens),
    [portfolio.tokens]
  );
  const portfolioLogo = useMemo(
    () =>
      baseHoldings.find(
        (token) =>
          token.contractAddress.toLowerCase() ===
          deployment.baseToken.toLowerCase()
      )?.logoUrl,
    [baseHoldings, deployment.baseToken]
  );
  const [baseToken, setBaseToken] = useState("");
  const [robinToken, setRobinToken] = useState("");
  const [resolved, setResolved] = useState<ResolvedOftDeployment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const options: readonly OftDeployment[] = registeredDeployment
    ? ROBIN_TOKEN_REGISTRY
    : [...ROBIN_TOKEN_REGISTRY, deployment];

  useEffect(() => {
    if (!needsPortfolioLogo || !portfolioLogo) return;
    onSelect({ ...deployment, logo: portfolioLogo });
  }, [deployment, needsPortfolioLogo, onSelect, portfolioLogo]);

  const updateAddress = (setter: (value: string) => void, value: string) => {
    setter(value.trim());
    setResolved(null);
    setError("");
  };

  const openCustomToken = () => {
    if (!registeredDeployment) {
      setBaseToken(deployment.baseToken);
      setRobinToken(deployment.robinToken);
    }
    setResolved(null);
    setError("");
    modal.onOpen();
  };

  const inspectRoute = async () => {
    if (!isAddress(baseToken) || !isAddress(robinToken)) {
      setError("Enter valid Base and Robinhood token addresses.");
      return;
    }
    setLoading(true);
    setError("");
    setResolved(null);
    try {
      const holdingLogo = baseHoldings.find(
        (token) =>
          token.contractAddress.toLowerCase() === baseToken.toLowerCase()
      )?.logoUrl;
      setResolved(
        await resolveOftDeployment(
          getAddress(baseToken),
          getAddress(robinToken),
          { fallbackLogo: holdingLogo }
        )
      );
    } catch (routeError) {
      const message =
        routeError instanceof Error
          ? routeError.message.split("\n")[0]
          : "Could not verify this token route.";
      setError(message.replace("ContractFunctionExecutionError: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <HStack
        role="group"
        aria-label="Choose token route"
        mt={4}
        spacing={2}
        justify={{ base: "center", md: "flex-start" }}
        flexWrap="wrap"
      >
        <Text color="text.tertiary" fontSize="sm" fontWeight="600">
          Choose:
        </Text>
        {options.map((option) => {
          const isActive =
            deployment.baseToken.toLowerCase() ===
              option.baseToken.toLowerCase() &&
            deployment.robinToken.toLowerCase() ===
              option.robinToken.toLowerCase();
          return (
            <Button
              key={`${option.baseToken}:${option.robinToken}`}
              type="button"
              size="sm"
              variant="ghost"
              h="36px"
              px={3}
              border="1px solid"
              borderColor={isActive ? "whiteAlpha.300" : "whiteAlpha.100"}
              bg={isActive ? "whiteAlpha.100" : "blackAlpha.200"}
              color={isActive ? "text.primary" : "text.secondary"}
              borderRadius="full"
              aria-pressed={isActive}
              onClick={() => onSelect(option)}
              _hover={{ bg: "whiteAlpha.100", color: "text.primary" }}
            >
              <HStack spacing={2}>
                {option.logo ? (
                  <TokenLogo src={option.logo} />
                ) : (
                  <Box
                    boxSize="22px"
                    display="grid"
                    placeItems="center"
                    bg="white"
                    color="black"
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="800"
                  >
                    {option.symbol.slice(0, 1).toUpperCase()}
                  </Box>
                )}
                <Text fontSize="sm" fontWeight="700">
                  {option.symbol}
                </Text>
              </HStack>
            </Button>
          );
        })}
        <IconButton
          type="button"
          aria-label="Add custom token route"
          icon={<Plus size={17} />}
          size="sm"
          variant="ghost"
          boxSize="36px"
          minW="36px"
          border="1px solid"
          borderColor="whiteAlpha.100"
          borderRadius="full"
          color="text.secondary"
          onClick={openCustomToken}
          _hover={{ bg: "whiteAlpha.100", color: "text.primary" }}
        />
      </HStack>

      <Modal isOpen={modal.isOpen} onClose={modal.onClose} isCentered size="lg">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
        <ModalContent
          bg="bg.base"
          border="1px solid"
          borderColor="border.default"
        >
          <ModalHeader color="text.primary">Add a token route</ModalHeader>
          <ModalCloseButton color="text.secondary" />
          <ModalBody>
            <Text color="text.secondary" fontSize="sm" mb={5}>
              Enter the canonical Base token and its bridged Robinhood token.
              The reciprocal LayerZero peers will be verified before use.
            </Text>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel color="text.secondary" fontSize="sm">
                  Base token address
                </FormLabel>
                <HStack align="stretch" spacing={2}>
                  <Input
                    value={baseToken}
                    onChange={(event) =>
                      updateAddress(setBaseToken, event.target.value)
                    }
                    placeholder="0x…"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    fontFamily="mono"
                  />
                  <BaseTokenHoldingsMenu
                    tokens={baseHoldings}
                    isLoading={portfolio.isLoading}
                    onSelect={(token) =>
                      updateAddress(setBaseToken, token.contractAddress)
                    }
                  />
                </HStack>
              </FormControl>
              <FormControl>
                <FormLabel color="text.secondary" fontSize="sm">
                  Robinhood token address
                </FormLabel>
                <Input
                  value={robinToken}
                  onChange={(event) =>
                    updateAddress(setRobinToken, event.target.value)
                  }
                  placeholder="0x…"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  fontFamily="mono"
                />
              </FormControl>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void inspectRoute()}
                disabled={
                  loading || !isAddress(baseToken) || !isAddress(robinToken)
                }
                leftIcon={
                  loading ? <Spinner size="sm" /> : <Search size={16} />
                }
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                color="text.primary"
                _hover={{ bg: "whiteAlpha.100" }}
                _disabled={{
                  bg: "whiteAlpha.50",
                  borderColor: "whiteAlpha.100",
                  color: "text.tertiary",
                  opacity: 1,
                  cursor: "not-allowed",
                }}
              >
                {loading ? "Checking route…" : "Check token route"}
              </Button>

              {error ? (
                <Alert
                  status="error"
                  bg="rgba(239,68,68,.10)"
                  border="1px solid"
                  borderColor="rgba(248,113,113,.34)"
                  color="#FECACA"
                  borderRadius="md"
                >
                  <AlertIcon color="#F87171" />
                  <Text fontSize="sm">{error}</Text>
                </Alert>
              ) : null}

              {resolved ? (
                <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={3}>
                  <TokenMetadataCard
                    chain="Base"
                    name={resolved.baseMetadata.name}
                    symbol={resolved.baseMetadata.symbol}
                    address={resolved.deployment.baseToken}
                    logo={resolved.deployment.logo}
                  />
                  <TokenMetadataCard
                    chain="Robinhood"
                    name={resolved.robinMetadata.name}
                    symbol={resolved.robinMetadata.symbol}
                    address={resolved.deployment.robinToken}
                    logo={resolved.deployment.logo}
                  />
                </Grid>
              ) : null}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={modal.onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!resolved}
              onClick={() => {
                if (!resolved) return;
                onSelect(resolved.deployment);
                modal.onClose();
              }}
            >
              {resolved ? `Use ${resolved.baseMetadata.symbol}` : "Use token"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function TokenMetadataCard({
  chain,
  name,
  symbol,
  address,
  logo,
}: {
  chain: "Base" | "Robinhood";
  name: string;
  symbol: string;
  address: string;
  logo?: string;
}) {
  return (
    <Flex
      direction="column"
      align="stretch"
      gap={3}
      p={4}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
    >
      <HStack spacing={2}>
        <Image
          src={
            chain === "Base"
              ? "/chainIcons/base.svg"
              : "/chainIcons/robinhood.svg"
          }
          alt=""
          boxSize="24px"
        />
        <Text color="text.secondary" fontSize="sm" fontWeight="600">
          {chain}
        </Text>
      </HStack>
      <HStack spacing={3} minW={0}>
        {logo ? (
          <TokenLogo src={logo} size="38px" />
        ) : (
          <Box
            boxSize="38px"
            flexShrink={0}
            display="grid"
            placeItems="center"
            bg="white"
            color="black"
            borderRadius="full"
            fontWeight="800"
          >
            {symbol.slice(0, 1).toUpperCase()}
          </Box>
        )}
        <Box minW={0}>
          <Text color="text.primary" fontWeight="700">
            {symbol}
          </Text>
          <Text color="text.secondary" fontSize="sm" noOfLines={1}>
            {name}
          </Text>
        </Box>
      </HStack>
      <Text color="text.tertiary" fontSize="xs" fontFamily="mono">
        {`${address.slice(0, 6)}…${address.slice(-4)}`}
      </Text>
    </Flex>
  );
}
