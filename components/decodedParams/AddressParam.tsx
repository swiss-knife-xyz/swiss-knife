import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  HStack,
  Box,
  Text,
  Avatar,
  InputGroup,
  Input,
  InputRightElement,
  InputLeftElement,
  Tag,
  Link,
  Skeleton,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { resolveAddressToName, getNameAvatar, getPath, fetchContractAbi } from "@/utils";
import { fetchAddressLabels } from "@/utils/addressLabels";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import subdomains from "@/subdomains";
import { ExternalLinkIcon, EditIcon, AddIcon } from "@chakra-ui/icons";
import { BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Address, createPublicClient, http } from "viem";
import { chainIdToChain } from "@/data/common";
import { erc20Abi } from "viem";
import { useAddressBook } from "@/hooks/useAddressBook";
import { AddressLabelModal } from "@/components/AddressBook";

interface Params {
  address: any;
  showLink?: boolean;
  chainId?: number;
}

const skeletonAddress = "0x1111222233334444000000000000000000000000";

type DisplayMode = "label" | "ens" | "address";

export const AddressParam = ({
  address: _address,
  showLink,
  chainId,
}: Params) => {
  const showSkeleton = _address === null || _address === undefined;
  const address = !showSkeleton ? _address : skeletonAddress;

  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("address");

  const [addressLabels, setAddressLabels] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Get label from global address book
  const { getLabel, isReady: isAddressBookReady } = useAddressBook();
  const addressBookLabel = isAddressBookReady ? getLabel(address) : null;
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Determine available display modes
  const availableModes: DisplayMode[] = [];
  if (addressBookLabel) availableModes.push("label");
  if (ensName) availableModes.push("ens");
  availableModes.push("address");

  // Get the current display value based on mode
  const getDisplayValue = () => {
    switch (displayMode) {
      case "label":
        return addressBookLabel || address;
      case "ens":
        return ensName || address;
      case "address":
      default:
        return address;
    }
  };

  const value = getDisplayValue();
  const isShowingLabel = displayMode === "label" && addressBookLabel;

  // Cycle through available modes
  const cycleDisplayMode = () => {
    const currentIndex = availableModes.indexOf(displayMode);
    const nextIndex = (currentIndex + 1) % availableModes.length;
    setDisplayMode(availableModes[nextIndex]);
  };

  // Get toggle button text (shows what clicking will switch to)
  const getToggleButtonText = () => {
    const currentIndex = availableModes.indexOf(displayMode);
    const nextIndex = (currentIndex + 1) % availableModes.length;
    const nextMode = availableModes[nextIndex];
    switch (nextMode) {
      case "label":
        return "Label";
      case "ens":
        return "Name";
      case "address":
        return "Address";
    }
  };

  const fetchSetAddressLabels = useCallback(async () => {
    setAddressLabels([]);

    try {
      if (!chainId) throw new Error("Chain ID not provided");

      const client = createPublicClient({
        chain: chainIdToChain[chainId],
        transport: http(),
      });

      // check if the address is a contract
      const res = await client.getBytecode({
        address: address as Address,
      });

      // try fetching the contract symbol() if it's a token
      try {
        const symbol = await client.readContract({
          address: address as Address,
          abi: erc20Abi,
          functionName: "symbol",
        });
        setAddressLabels([symbol]);
      } catch {
        // else try fetching the contract name if it's verified
        const fetchedAbi = await fetchContractAbi({ address, chainId });
        if (fetchedAbi) {
          setAddressLabels([fetchedAbi.name]);
        }
      }
    } catch {
      try {
        const labels = await fetchAddressLabels(address, chainId);
        if (labels.length > 0) {
          setAddressLabels(labels);
        }
      } catch {
        setAddressLabels([]);
      }
    }
  }, [address, chainId]);

  useEffect(() => {
    if (address !== skeletonAddress) {
      resolveAddressToName(address).then((res) => {
        if (res) {
          setEnsName(res);
          // Default to showing ENS if no address book label
          if (!addressBookLabel) {
            setDisplayMode("ens");
          }
        }
      });
    }
  }, [address]);

  // Set display mode to label when address book label becomes available
  useEffect(() => {
    if (addressBookLabel) {
      setDisplayMode("label");
    }
  }, [addressBookLabel]);

  useEffect(() => {
    if (address !== skeletonAddress) {
      fetchSetAddressLabels();
    }
  }, [address, chainId, fetchSetAddressLabels]);

  useEffect(() => {
    if (ensName) {
      getNameAvatar(ensName).then((res) => {
        if (res) {
          setEnsAvatar(res);
        }
      });
    }
  }, [ensName]);

  useEffect(() => {
    if (!showSkeleton) {
      setIsLoaded(true);
    }
  }, [showSkeleton]);

  // Get the value to copy (always the address for copying)
  const copyValue = displayMode === "address" ? address : (displayMode === "ens" ? ensName : address);

  return showSkeleton ? (
    <Box>
      <Skeleton
        height="1.5rem"
        mb={"0.5rem"}
        width="8rem"
        rounded="md"
        startColor="whiteAlpha.50"
        endColor="whiteAlpha.400"
      />
      <HStack w="full">
        <Skeleton
          flexGrow={1}
          height="2rem"
          width="26rem"
          rounded="md"
          startColor="whiteAlpha.50"
          endColor="whiteAlpha.400"
        />
        <Skeleton
          w="2rem"
          height="1.6rem"
          rounded="md"
          startColor="whiteAlpha.50"
          endColor="whiteAlpha.400"
        />
      </HStack>
    </Box>
  ) : (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isLoaded ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      <Box>
        {/* Tags row - only show if there are tags */}
        {addressLabels.length > 0 && (
          <HStack py="2" flexWrap="wrap" gap={1}>
            <Text fontSize={"xs"} opacity={0.6}>
              Tags:{" "}
            </Text>
            {addressLabels.map((label, index) => (
              <Tag key={index} size="sm" variant="solid" colorScheme="blue">
                {label}
              </Tag>
            ))}
          </HStack>
        )}
        <HStack>
          {/* Toggle button - only show if there are multiple display modes */}
          {availableModes.length > 1 && (
            <Button
              onClick={cycleDisplayMode}
              size={"xs"}
              px={4}
              py={5}
            >
              {getToggleButtonText()}
            </Button>
          )}
          {/* Save to address book button - on left side when not saved */}
          {!addressBookLabel && isAddressBookReady && (
            <Tooltip label="Save to Address Book" placement="top">
              <IconButton
                aria-label="Save to address book"
                icon={
                  <HStack spacing={0.5}>
                    <BookOpen size={12} />
                    <AddIcon boxSize={2} />
                  </HStack>
                }
                size="xs"
                variant="ghost"
                color="whiteAlpha.400"
                _hover={{ color: "white", bg: "whiteAlpha.200" }}
                onClick={() => setIsLabelModalOpen(true)}
              />
            </Tooltip>
          )}
          <InputGroup>
            {/* Show book icon when displaying label, or avatar when showing ENS */}
            {isShowingLabel ? (
              <InputLeftElement>
                <BookOpen size={16} color="#9F7AEA" />
              </InputLeftElement>
            ) : displayMode === "ens" && ensAvatar ? (
              <InputLeftElement>
                <Avatar src={ensAvatar} w={"1.2rem"} h={"1.2rem"} />
              </InputLeftElement>
            ) : null}
            <Input
              value={value}
              isReadOnly
              bg={isShowingLabel ? "purple.900" : "whiteAlpha.50"}
              border="1px solid"
              borderColor={isShowingLabel ? "purple.500" : "whiteAlpha.200"}
              borderRadius="lg"
              _hover={{ borderColor: isShowingLabel ? "purple.400" : "whiteAlpha.400" }}
              color={isShowingLabel ? "purple.100" : "white"}
              pl={isShowingLabel || (displayMode === "ens" && ensAvatar) ? 10 : 4}
            />
            <InputRightElement pr={1}>
              <CopyToClipboard textToCopy={copyValue ?? ""} />
            </InputRightElement>
          </InputGroup>
          {/* Edit address book button - on right side when saved */}
          {addressBookLabel && (
            <Tooltip label="Edit Label" placement="top">
              <IconButton
                aria-label="Edit label"
                icon={<EditIcon />}
                size="xs"
                variant="ghost"
                color="whiteAlpha.600"
                _hover={{ color: "white", bg: "whiteAlpha.200" }}
                onClick={() => setIsLabelModalOpen(true)}
              />
            </Tooltip>
          )}
          {showLink && (
            <Link
              href={`${getPath(
                subdomains.EXPLORER.base,
                subdomains.EXPLORER.isRelativePath
              )}address/${address}${!!chainId ? "?chainId=" + chainId : ""}`}
              target="_blank"
              _hover={{ textDecoration: "none" }}
            >
              <Button size={"xs"}>
                <HStack>
                  <ExternalLinkIcon />
                </HStack>
              </Button>
            </Link>
          )}
        </HStack>

        {/* Address Label Modal for save/edit */}
        <AddressLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          address={address}
          existingLabel={addressBookLabel}
          defaultLabel={ensName || ""}
        />
      </Box>
    </motion.div>
  );
};
