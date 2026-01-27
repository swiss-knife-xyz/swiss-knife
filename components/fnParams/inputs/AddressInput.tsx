import React, { useEffect, useState, useMemo, useRef } from "react";
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
import { keyframes } from "@emotion/react";
import { InputField } from "@/components/InputField";
import { Address, createPublicClient, http, zeroAddress, erc20Abi } from "viem";
import { fetchAddressLabels } from "@/utils/addressLabels";
import { chainIdToChain } from "@/data/common";
import { AddressBookButton } from "@/components/AddressBook";

const resolveGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 1px rgba(59,130,246,0.5), 0 0 10px rgba(59,130,246,0.15);
  }
  33% {
    box-shadow: 0 0 0 1px rgba(139,92,246,0.5), 0 0 15px rgba(139,92,246,0.15), 0 0 30px rgba(139,92,246,0.05);
  }
  66% {
    box-shadow: 0 0 0 1px rgba(96,165,250,0.6), 0 0 12px rgba(96,165,250,0.2);
  }
`;

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
  const [errorResolving, setErrorResolving] = useState(false);

  const [addressLabels, setAddressLabels] = useState<string[]>([]);

  // Use refs for values accessed inside debounced callbacks to avoid
  // recreating the callbacks (which causes useEffect re-triggers and loops)
  const lastResolvedValueRef = useRef("");
  const lastFetchedLabelsRef = useRef("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const chainIdRef = useRef(chainId);
  chainIdRef.current = chainId;
  const prevIsResolvingRef = useRef(isResolving);

  const resolveEns = useMemo(
    () =>
      debounce(async (val: string) => {
        if (val === lastResolvedValueRef.current) return;
        setErrorResolving(false);
        try {
          if (isResolvableName(val)) {
            setIsResolving(true);
            const address = await resolveNameToAddress(val);
            if (address) {
              setResolvedAddress(address);
              setEnsName(val);
              setEnsAvatar("");
              lastResolvedValueRef.current = address;
              onChangeRef.current({
                target: { value: address },
              } as any);
            } else {
              setEnsName("");
              setResolvedAddress("");
              lastResolvedValueRef.current = val;
              setErrorResolving(true);
            }
          } else if (val.length === 42) {
            try {
              const name = await resolveAddressToName(val);
              if (name) {
                setEnsName(name);
                setResolvedAddress(val);
              } else {
                setResolvedAddress(val);
              }
              lastResolvedValueRef.current = val;
            } catch {
              setResolvedAddress(val);
              lastResolvedValueRef.current = val;
            }
          } else {
            setEnsName("");
            setResolvedAddress("");
            lastResolvedValueRef.current = "";
          }
        } catch {
          setErrorResolving(true);
          setEnsName("");
          setResolvedAddress("");
          lastResolvedValueRef.current = val;
        } finally {
          setIsResolving(false);
        }
      }, 500),
    []
  );

  const fetchSetAddressLabels = useMemo(
    () =>
      debounce(async (val: string) => {
        if (!val || !val.startsWith("0x") || val.length !== 42) return;
        if (val === lastFetchedLabelsRef.current) return;
        lastFetchedLabelsRef.current = val;
        setAddressLabels([]);
        try {
          const currentChainId = chainIdRef.current;
          const client = createPublicClient({
            chain: chainIdToChain[currentChainId],
            transport: http(),
          });

          const res = await client.getBytecode({
            address: val as Address,
          });

          try {
            const symbol = await client.readContract({
              address: val as Address,
              abi: erc20Abi,
              functionName: "symbol",
            });
            setAddressLabels([symbol]);
          } catch {
            const fetchedAbi = await fetchContractAbi({
              address: val,
              chainId: currentChainId,
            });
            if (fetchedAbi) {
              setAddressLabels([fetchedAbi.name]);
            }
          }
        } catch {
          try {
            const labels = await fetchAddressLabels(
              val,
              chainIdRef.current
            );
            if (labels.length > 0) {
              setAddressLabels(labels);
            }
          } catch {
            setAddressLabels([]);
          }
        }
      }, 500),
    []
  );

  useEffect(() => {
    if (value && value !== lastResolvedValueRef.current) {
      resolveEns(value);
    }
  }, [value, resolveEns]);

  useEffect(() => {
    fetchSetAddressLabels.cancel();
    if (value && !hideTags) {
      fetchSetAddressLabels(value);
    }
  }, [value, hideTags, fetchSetAddressLabels, chainId]);

  // Cancel debounced calls on unmount
  useEffect(() => {
    return () => {
      resolveEns.cancel();
      fetchSetAddressLabels.cancel();
    };
  }, [resolveEns, fetchSetAddressLabels]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    // Clear resolved state when user modifies the input
    if (ensName) {
      setEnsName("");
      setEnsAvatar("");
      setResolvedAddress("");
      setErrorResolving(false);
      setAddressLabels([]);
      lastResolvedValueRef.current = "";
      lastFetchedLabelsRef.current = "";
    }
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
        <Box position="relative">
          <Box
            position="absolute"
            inset="0"
            rounded="md"
            pointerEvents="none"
            zIndex={1}
            opacity={isResolving ? 1 : 0}
            transition="opacity 0.4s ease"
            animation={`${resolveGlow} 2s ease-in-out infinite`}
          />
          <InputField
            type="text"
            value={value}
            onChange={handleInputChange}
            isInvalid={isInvalid || errorResolving}
            color="white"
            rounded="md"
            _focus={{
              outline: "none",
              boxShadow: "none",
            }}
            placeholder={rest.placeholder ?? ""}
            {...rest}
          />
        </Box>

        <HStack my={2}>
          <Spacer />
          <AddressBookButton
            onSelect={(address: string) => {
              onChange({
                target: { value: address },
              } as any);
            }}
          />
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
