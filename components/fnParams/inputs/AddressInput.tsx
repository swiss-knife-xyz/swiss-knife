import {
  Input,
  InputGroup,
  InputRightElement,
  InputProps,
  InputLeftElement,
  Avatar,
  Box,
  HStack,
  Spacer,
  Link,
  Button,
} from "@chakra-ui/react";
import { ExternalLinkIcon, WarningIcon } from "@chakra-ui/icons";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { useEffect, useState } from "react";
import { getEnsAvatar, getEnsName, getPath } from "@/utils";
import { JsonFragment } from "ethers";
import { InputInfo } from "@/components/fnParams/inputs";
import subdomains from "@/subdomains";

interface InputFieldProps extends InputProps {
  input: JsonFragment;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  chainId: number;
}

export const AddressInput = ({
  input,
  value,
  onChange,
  chainId,
  isInvalid,
  ...rest
}: InputFieldProps) => {
  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");

  // fetch ens name after 100ms of user input
  useEffect(() => {
    if (value) {
      if (value.length === 42) {
        const timeoutId = setTimeout(() => {
          getEnsName(value).then((res) => {
            if (res) {
              setEnsName(res);
            }
          });
        }, 100);

        // Cleanup function to clear the timeout if value changes before 100ms
        return () => clearTimeout(timeoutId);
      } else {
        setEnsName("");
      }
    } else {
      setEnsName("");
    }
  }, [value]);

  // fetch ens avatar
  useEffect(() => {
    if (ensName && ensName.length > 0) {
      setEnsAvatar("");
      getEnsAvatar(ensName).then((res) => {
        console.log({
          ensName,
          avatar: res,
        });
        if (res) {
          setEnsAvatar(res);
        } else {
          setEnsAvatar("");
        }
      });
    }
  }, [ensName]);

  return (
    <Box>
      <HStack>
        <InputInfo input={input} />
        <Spacer />
        <HStack>
          {ensName && ensName.length > 0 && (
            <HStack mb={1} px={2} bg="whiteAlpha.100" rounded="md">
              {ensAvatar && ensAvatar.length > 0 && (
                <Avatar src={ensAvatar} w={"1.2rem"} h={"1.2rem"} />
              )}
              <Box>{ensName}</Box>
            </HStack>
          )}
          {value && value.trim().length > 0 && (
            <Link
              href={`${getPath(
                subdomains.EXPLORER.base
              )}address/${value}/contract?chainId=${chainId}`}
              title="View on explorer"
              isExternal
            >
              <Button size={"xs"}>
                <HStack>
                  <ExternalLinkIcon />
                </HStack>
              </Button>
            </Link>
          )}
        </HStack>
      </HStack>
      <InputGroup>
        <Input
          type={"text"}
          value={value}
          onChange={onChange}
          isInvalid={isInvalid}
          {...rest}
        />
        <InputRightElement pr={1}>
          {!isInvalid ? (
            <CopyToClipboard textToCopy={value ?? ""} />
          ) : (
            <WarningIcon color={"red.300"} />
          )}
        </InputRightElement>
      </InputGroup>
    </Box>
  );
};
