"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Image,
  Avatar,
} from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isAddress, getAddress } from "viem";
import { AddressInput } from "@/components/fnParams/inputs/AddressInput";
import { PortfolioToken } from "../lib/portfolioApi";
import {
  resolveAddressToName,
  getNameAvatar,
} from "@/lib/nameResolution";

interface ReceiverPanelProps {
  receiver: string;
  onReceiverChange: (value: string) => void;
  chainId: number;
  selectedTokens: PortfolioToken[];
  onMigrate: () => void;
  isExecuting: boolean;
  disabledReason?: string;
}

const MAX_LOGOS = 6;

// Cast for the AddressInput shim — it requires a JsonFragment-shaped `input`
// prop even though we only need a plain address field here.
const ADDRESS_INPUT_SHIM = { name: "Recipient", type: "address" } as any;

export function ReceiverPanel({
  receiver,
  onReceiverChange,
  chainId,
  selectedTokens,
  onMigrate,
  isExecuting,
  disabledReason,
}: ReceiverPanelProps) {
  const trimmedReceiver = receiver.trim();
  const isValidReceiver = useMemo(
    () => isAddress(trimmedReceiver),
    [trimmedReceiver]
  );

  // Reverse-resolve the receiver address to its primary name + avatar so the
  // "RECEIVER" chip shows e.g. "apoorv.eth" + avatar instead of a raw hex stub.
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidReceiver) {
      setResolvedName(null);
      setResolvedAvatar(null);
      return;
    }
    let cancelled = false;
    const checksummed = getAddress(trimmedReceiver);
    setResolvedName(null);
    setResolvedAvatar(null);
    (async () => {
      const name = await resolveAddressToName(checksummed);
      if (cancelled || !name) return;
      setResolvedName(name);
      const avatar = await getNameAvatar(name);
      if (cancelled) return;
      setResolvedAvatar(avatar);
    })();
    return () => {
      cancelled = true;
    };
  }, [isValidReceiver, trimmedReceiver]);

  const visibleTokens = selectedTokens.slice(0, MAX_LOGOS);
  const extra = Math.max(0, selectedTokens.length - MAX_LOGOS);

  return (
    <Box
      p={5}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
      w="full"
    >
      <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="wider" mb={3}>
        SEND TO
      </Text>

      <Box mb={4}>
        <AddressInput
          input={ADDRESS_INPUT_SHIM}
          chainId={chainId}
          value={receiver}
          onChange={(e) => onReceiverChange(e.target.value)}
          placeholder="0x… or name.eth"
          hideTags
          hideQuickFillButtons
        />
      </Box>

      {/* Visualization */}
      <Box
        bg="whiteAlpha.50"
        border="1px dashed"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        p={4}
        mb={4}
        minH="140px"
      >
        {selectedTokens.length === 0 ? (
          <VStack
            justify="center"
            align="center"
            minH="100px"
            color="whiteAlpha.600"
            spacing={1}
          >
            <Text fontSize="sm">Select tokens to migrate</Text>
            <Text fontSize="xs">
              Tick the boxes on the left to add them here
            </Text>
          </VStack>
        ) : (
          <HStack align="center" spacing={4}>
            <Box flex={1} minW={0}>
              <Text fontSize="2xs" color="whiteAlpha.600" mb={2}>
                {selectedTokens.length} TOKEN
                {selectedTokens.length === 1 ? "" : "S"}
              </Text>
              <HStack spacing={-2} flexWrap="wrap">
                <AnimatePresence initial={false}>
                  {visibleTokens.map((t, idx) => (
                    <motion.div
                      key={`${t.chainId}:${t.contractAddress}`}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.18 }}
                      style={{ zIndex: MAX_LOGOS - idx }}
                    >
                      {t.logoUrl ? (
                        <Image
                          src={t.logoUrl}
                          alt={t.symbol}
                          boxSize="32px"
                          borderRadius="full"
                          border="2px solid"
                          borderColor="whiteAlpha.300"
                          bg="bg.muted"
                          fallbackSrc="/icon.png"
                        />
                      ) : (
                        <Box
                          boxSize="32px"
                          borderRadius="full"
                          border="2px solid"
                          borderColor="whiteAlpha.300"
                          bg="whiteAlpha.200"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text fontSize="2xs" color="whiteAlpha.700">
                            {t.symbol.slice(0, 2).toUpperCase()}
                          </Text>
                        </Box>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {extra > 0 && (
                  <Box
                    boxSize="32px"
                    borderRadius="full"
                    border="2px solid"
                    borderColor="whiteAlpha.300"
                    bg="whiteAlpha.100"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    ml={1}
                  >
                    <Text fontSize="2xs" color="whiteAlpha.800">
                      +{extra}
                    </Text>
                  </Box>
                )}
              </HStack>
            </Box>

            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ display: "flex", color: "var(--chakra-colors-primary-400)" }}
            >
              <ArrowRight size={28} />
            </motion.div>

            <Box
              flexShrink={0}
              bg="whiteAlpha.100"
              border="1px solid"
              borderColor={isValidReceiver ? "primary.500" : "whiteAlpha.200"}
              borderRadius="md"
              p={2}
              minW="120px"
              maxW="180px"
            >
              <Text fontSize="2xs" color="whiteAlpha.600" mb={1}>
                RECEIVER
              </Text>
              <HStack spacing={2}>
                <Avatar
                  size="xs"
                  name={resolvedName ?? (isValidReceiver ? receiver : "?")}
                  src={resolvedAvatar ?? undefined}
                  bg="whiteAlpha.200"
                />
                <Text
                  fontSize="xs"
                  fontFamily={resolvedName ? "body" : "mono"}
                  color={isValidReceiver ? "white" : "whiteAlpha.600"}
                  fontWeight={resolvedName ? "600" : "400"}
                  noOfLines={1}
                >
                  {resolvedName
                    ? resolvedName
                    : isValidReceiver
                    ? `${receiver.slice(0, 6)}…${receiver.slice(-4)}`
                    : "Not set"}
                </Text>
              </HStack>
            </Box>
          </HStack>
        )}
      </Box>

      <Button
        w="full"
        size="lg"
        bg="primary.500"
        color="white"
        _hover={{ bg: "primary.600" }}
        _active={{ bg: "primary.700" }}
        _disabled={{
          bg: "whiteAlpha.200",
          color: "whiteAlpha.500",
          cursor: "not-allowed",
        }}
        onClick={onMigrate}
        isLoading={isExecuting}
        loadingText="Migrating…"
        isDisabled={
          !isValidReceiver || selectedTokens.length === 0 || isExecuting
        }
      >
        Migrate{" "}
        {selectedTokens.length > 0
          ? `${selectedTokens.length} token${
              selectedTokens.length === 1 ? "" : "s"
            }`
          : "tokens"}
      </Button>

      {disabledReason && (
        <Text mt={2} fontSize="xs" color="#FBBF24" textAlign="center">
          {disabledReason}
        </Text>
      )}
    </Box>
  );
}
