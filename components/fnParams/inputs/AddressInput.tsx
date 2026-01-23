import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Text,
  InputProps,
  Avatar,
  Box,
  HStack,
  Spacer,
  Link,
  Button,
  Tag,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  fetchContractAbi,
  resolveNameToAddress,
  resolveAddressToName,
  getNameAvatar,
  isResolvableName,
  getPath,
  slicedText,
} from "@/utils";
import { useAccount } from "wagmi";
import { JsonFragment } from "ethers";
import { InputInfo } from "@/components/fnParams/inputs";
import subdomains from "@/subdomains";
import debounce from "lodash/debounce";
import { motion, AnimatePresence } from "framer-motion";
import { InputField } from "@/components/InputField";
import { Address, createPublicClient, http, zeroAddress, erc20Abi } from "viem";
import { fetchAddressLabels } from "@/utils/addressLabels";
import { chainIdToChain } from "@/data/common";

interface InputFieldProps extends InputProps {
  chainId: number;
  input: JsonFragment;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFunctionIsDisabled?: (value: boolean) => void;
  hideTags?: boolean;
}

export const AddressInput = ({
  input,
  value,
  chainId,
  onChange,
  isInvalid,
  setFunctionIsDisabled,
  hideTags,
  ...rest
}: InputFieldProps) => {
  const { address: userAddress } = useAccount();

  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [lastResolvedValue, setLastResolvedValue] = useState("");
  const [errorResolving, setErrorResolving] = useState(false);

  const [addressLabels, setAddressLabels] = useState<string[]>([]);

  const [isDelayedAnimating, setIsDelayedAnimating] = useState(isResolving);
  const delayedAnimationDuration = 100;

  const prevIsResolvingRef = useRef(isResolving);

  const resolveEns = useCallback(
    debounce(async (val: string) => {
      if (val === lastResolvedValue) return; // Prevent re-resolution of already resolved values
      setErrorResolving(false);
      console.log({ val });
      try {
        // Check if it's a resolvable name (ENS, Basename, etc.)
        if (isResolvableName(val)) {
          setIsResolving(true);
          const address = await resolveNameToAddress(val);
          if (address) {
            setResolvedAddress(address);
            setEnsName(val);
            onChange({
              target: { value: address },
            } as any);
            setLastResolvedValue(address);
          } else {
            throw new Error("Name resolution failed");
          }
        } else if (val.length === 42) {
          // It's an address, try reverse resolution
          try {
            const name = await resolveAddressToName(val);
            if (name) {
              setEnsName(name);
              setResolvedAddress(val);
              setLastResolvedValue(val);
            } else {
              setEnsName("");
              setResolvedAddress(val);
              setLastResolvedValue(val);
            }
          } catch {
            setEnsName("");
            setResolvedAddress(val);
            setLastResolvedValue(val);
          }
        } else {
          setEnsName("");
          setResolvedAddress("");
          setLastResolvedValue("");
        }
      } catch (error) {
        console.error("Error resolving name:", error);
        setErrorResolving(true);
        setEnsName("");
        setResolvedAddress("");
        setLastResolvedValue(val);
      } finally {
        setIsResolving(false);
      }
    }, 500),
    [lastResolvedValue, onChange]
  );

  const fetchSetAddressLabels = useCallback(
    debounce(async (val: string) => {
      if (val === lastResolvedValue) return; // Prevent re-resolution of already resolved values
      setErrorResolving(false);
      setAddressLabels([]);
      try {
        const client = createPublicClient({
          chain: chainIdToChain[chainId],
          transport: http(),
        });

        // check if the address is a contract
        const res = await client.getBytecode({
          address: val as Address,
        });

        // try fetching the contract symbol() if it's a token
        try {
          const symbol = await client.readContract({
            address: val as Address,
            abi: erc20Abi,
            functionName: "symbol",
          });
          setAddressLabels([symbol]);
        } catch {
          // else try fetching the contract name if it's verified
          const fetchedAbi = await fetchContractAbi({ address: val, chainId });
          if (fetchedAbi) {
            setAddressLabels([fetchedAbi.name]);
          }
        }
      } catch {
        try {
          const labels = await fetchAddressLabels(val, chainId);
          if (labels.length > 0) {
            setAddressLabels(labels);
          }
        } catch {
          setAddressLabels([]);
        }
      }
    }, 500),
    [lastResolvedValue, chainId]
  );

  useEffect(() => {
    if (value && value !== lastResolvedValue) {
      resolveEns(value);
    }
  }, [value, resolveEns, lastResolvedValue]);

  useEffect(() => {
    if (value && value !== lastResolvedValue && !hideTags) {
      fetchSetAddressLabels(value);
    }
  }, [value, hideTags, fetchSetAddressLabels, lastResolvedValue, chainId]);

  useEffect(() => {
    if (ensName) {
      getNameAvatar(ensName).then((avatar) => {
        setEnsAvatar(avatar || "");
      });
    } else {
      setEnsAvatar("");
    }
  }, [ensName]);

  useEffect(() => {
    if (setFunctionIsDisabled && isResolving !== prevIsResolvingRef.current) {
      setFunctionIsDisabled(isResolving);
      prevIsResolvingRef.current = isResolving;
    }
  }, [isResolving, setFunctionIsDisabled]);

  useEffect(() => {
    if (!isResolving) {
      const timer = setTimeout(() => {
        setIsDelayedAnimating(false);
      }, delayedAnimationDuration);
      return () => clearTimeout(timer);
    } else {
      setIsDelayedAnimating(true);
    }
  }, [isResolving]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    onChange({
      target: { value: newValue },
    } as any);
  };

  return (
    <Box>
      <HStack mb={2}>
        <InputInfo input={input} />
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
        <Spacer />
        <AnimatePresence>
          {ensName && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <HStack px={2} bg="whiteAlpha.200" rounded="md">
                {ensAvatar && (
                  <Avatar
                    src={ensAvatar}
                    w="1.2rem"
                    h="1.2rem"
                    ignoreFallback
                  />
                )}
                <Box>{ensName}</Box>
              </HStack>
            </motion.div>
          )}
        </AnimatePresence>
        {resolvedAddress && (
          <Link
            href={`${getPath(
              subdomains.EXPLORER.base
            )}address/${resolvedAddress}/contract?chainId=${chainId}`}
            title="View on explorer"
            isExternal
          >
            <Button size="xs">
              <ExternalLinkIcon />
            </Button>
          </Link>
        )}
      </HStack>
      <Box>
        <motion.div
          initial={false}
          animate={{
            background: isDelayedAnimating
              ? [
                  "linear-gradient(90deg, #3498db, #8e44ad, #3498db)",
                  "linear-gradient(180deg, #3498db, #8e44ad, #3498db)",
                  "linear-gradient(270deg, #3498db, #8e44ad, #3498db)",
                  "linear-gradient(360deg, #3498db, #8e44ad, #3498db)",
                ]
              : "none",
            backgroundSize: "200% 200%",
            boxShadow: isResolving
              ? [
                  "0 0 5px #3498db, 0 0 10px #3498db, 0 0 15px #3498db",
                  "0 0 5px #8e44ad, 0 0 10px #8e44ad, 0 0 15px #8e44ad",
                  "0 0 5px #3498db, 0 0 10px #3498db, 0 0 15px #3498db",
                ]
              : "none",
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            width: "100%",
            borderRadius: "md",
            padding: "2px",
          }}
        >
          <InputField
            type="text"
            value={value}
            onChange={handleInputChange}
            isInvalid={isInvalid || errorResolving}
            bg={isDelayedAnimating ? "#222" : undefined}
            color="white"
            rounded="md"
            _focus={{
              outline: "none",
              boxShadow: "none",
            }}
            placeholder={rest.placeholder ?? ""}
            {...rest}
          />
        </motion.div>

        <HStack my={2}>
          <Spacer />
          <Button
            onClick={() => {
              onChange({
                target: { value: zeroAddress },
              } as any);
            }}
            size={"sx"}
            fontWeight={"thin"}
            variant={"ghost"}
            color="whiteAlpha.300"
          >
            [zeroAddr]
          </Button>
          {userAddress && (
            <Button
              onClick={() => {
                onChange({
                  target: { value: userAddress },
                } as any);
              }}
              size={"sx"}
              fontWeight={"thin"}
              variant={"ghost"}
              color="whiteAlpha.300"
            >
              [{slicedText(userAddress)}]
            </Button>
          )}
        </HStack>
      </Box>
    </Box>
  );
};
