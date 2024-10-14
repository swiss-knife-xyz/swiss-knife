import React, { useEffect, useState, useCallback } from "react";
import {
  Input,
  InputGroup,
  InputRightElement,
  InputProps,
  Avatar,
  Box,
  HStack,
  Spacer,
  Link,
  Button,
} from "@chakra-ui/react";
import { ExternalLinkIcon, WarningIcon } from "@chakra-ui/icons";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { getEnsAddress, getEnsAvatar, getEnsName, getPath } from "@/utils";
import { JsonFragment } from "ethers";
import { InputInfo } from "@/components/fnParams/inputs";
import subdomains from "@/subdomains";
import debounce from "lodash/debounce";
import { motion, AnimatePresence } from "framer-motion";

interface InputFieldProps extends InputProps {
  input: JsonFragment;
  value: string;
  chainId: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setReadIsDisabled?: (isDisabled: boolean) => void;
}

export const AddressInput = ({
  input,
  value,
  chainId,
  onChange,
  isInvalid,
  setReadIsDisabled,
  ...rest
}: InputFieldProps) => {
  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [lastResolvedValue, setLastResolvedValue] = useState("");

  const resolveEns = useCallback(
    debounce(async (val: string) => {
      if (val === lastResolvedValue) return; // Prevent re-resolution of already resolved values
      setIsResolving(true);
      try {
        if (val.includes(".eth")) {
          const address = await getEnsAddress(val);
          if (address) {
            setResolvedAddress(address);
            setEnsName(val);
            onChange({
              target: { value: address },
            } as any);
            setLastResolvedValue(address);
          }
        } else if (val.length === 42) {
          const name = await getEnsName(val);
          if (name) {
            setEnsName(name);
            setResolvedAddress(val);
            setLastResolvedValue(val);
          } else {
            setEnsName("");
            setResolvedAddress(val);
            setLastResolvedValue(val);
          }
        } else {
          setEnsName("");
          setResolvedAddress("");
          setLastResolvedValue("");
        }
      } finally {
        setIsResolving(false);
      }
    }, 500),
    [onChange]
  );

  useEffect(() => {
    if (value && value !== lastResolvedValue) {
      resolveEns(value);
    }
  }, [value, resolveEns, lastResolvedValue]);

  useEffect(() => {
    if (ensName) {
      getEnsAvatar(ensName).then((avatar) => {
        setEnsAvatar(avatar || "");
      });
    } else {
      setEnsAvatar("");
    }
  }, [ensName]);

  useEffect(() => {
    if (setReadIsDisabled) {
      setReadIsDisabled(isResolving);
    }
  }, [isResolving, setReadIsDisabled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange({
      target: { value: newValue },
    } as any);
  };

  return (
    <Box p={4} borderRadius="md">
      <HStack mb={2}>
        <InputInfo input={input} />
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
                {ensAvatar && <Avatar src={ensAvatar} w="1.2rem" h="1.2rem" />}
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
      <InputGroup>
        <motion.div
          initial={false}
          animate={{
            background: isResolving
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
          <Input
            type="text"
            value={value}
            onChange={handleInputChange}
            isInvalid={isInvalid}
            bg="bg.900"
            color="white"
            rounded="md"
            _focus={{
              outline: "none",
              boxShadow: "none",
            }}
            {...rest}
          />
        </motion.div>
        <InputRightElement pr={1}>
          {!isInvalid ? (
            <CopyToClipboard textToCopy={resolvedAddress || value} />
          ) : (
            <WarningIcon color="red.300" />
          )}
        </InputRightElement>
      </InputGroup>
    </Box>
  );
};
