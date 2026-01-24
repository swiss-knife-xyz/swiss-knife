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
} from "@chakra-ui/react";
import { resolveAddressToName, getNameAvatar, getPath, fetchContractAbi } from "@/utils";
import { fetchAddressLabels } from "@/utils/addressLabels";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import subdomains from "@/subdomains";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { Address, createPublicClient, http } from "viem";
import { chainIdToChain } from "@/data/common";
import { erc20Abi } from "viem";

interface Params {
  address: any;
  showLink?: boolean;
  chainId?: number;
}

const skeletonAddress = "0x1111222233334444000000000000000000000000";

export const AddressParam = ({
  address: _address,
  showLink,
  chainId,
}: Params) => {
  const showSkeleton = _address === null || _address === undefined;
  const address = !showSkeleton ? _address : skeletonAddress;

  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [showEns, setShowEns] = useState(false);

  const [addressLabels, setAddressLabels] = useState<string[]>([]);
  const [value, setValue] = useState<string>(address);
  const [isLoaded, setIsLoaded] = useState(false);

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
          setShowEns(true);
        }
      });
    }
  }, [address]);

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
    setValue(showEns ? ensName : address);
  }, [showEns, ensName, address]);

  useEffect(() => {
    if (!showSkeleton) {
      setIsLoaded(true);
    }
  }, [showSkeleton]);

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
        {addressLabels.length > 0 && (
          <HStack py="2">
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
          {ensName ? (
            <Button
              onClick={() => {
                setShowEns(!showEns);
              }}
              size={"xs"}
              px={4}
              py={5}
            >
              {showEns ? "Address" : "Name"}
            </Button>
          ) : null}
          <InputGroup>
            {ensAvatar ? (
              <InputLeftElement>
                <Avatar src={ensAvatar} w={"1.2rem"} h={"1.2rem"} />
              </InputLeftElement>
            ) : null}
            <Input
              value={value}
              isReadOnly
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              _hover={{ borderColor: "whiteAlpha.400" }}
              color="white"
            />
            <InputRightElement pr={1}>
              <CopyToClipboard textToCopy={value ?? ""} />
            </InputRightElement>
          </InputGroup>
          {showLink && (
            <Link
              href={`${getPath(
                subdomains.EXPLORER.base,
                subdomains.EXPLORER.isRelativePath
              )}address/${value}${!!chainId ? "?chainId=" + chainId : ""}`}
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
      </Box>
    </motion.div>
  );
};
