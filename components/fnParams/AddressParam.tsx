import React, { useEffect, useState } from "react";
import {
  Button,
  HStack,
  Link,
  Box,
  Center,
  Text,
  Avatar,
  InputGroup,
  Input,
  InputRightElement,
  InputLeftElement,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { getPath, getEnsName, getEnsAvatar } from "@/utils";
import subdomains from "@/subdomains";
import { CopyToClipboard } from "@/components/CopyToClipboard";

interface Params {
  address: any;
}

export const AddressParam = ({ address }: Params) => {
  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [showEns, setShowEns] = useState(false);

  const [value, setValue] = useState<string>(address);

  useEffect(() => {
    getEnsName(address).then((res) => {
      if (res) {
        setEnsName(res);
        setShowEns(true);
      }
    });
  }, [address]);

  useEffect(() => {
    if (ensName) {
      getEnsAvatar(ensName).then((res) => {
        console.log({
          ensName,
          avatar: res,
        });
        if (res) {
          setEnsAvatar(res);
        }
      });
    }
  }, [ensName]);

  useEffect(() => {
    setValue(showEns ? ensName : address);
  }, [showEns, ensName, address]);

  return (
    <Box>
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
            {showEns ? "Address" : "ENS"}
          </Button>
        ) : null}
        <InputGroup>
          {ensAvatar ? (
            <InputLeftElement>
              <Avatar src={ensAvatar} w={"1.2rem"} h={"1.2rem"} />
            </InputLeftElement>
          ) : null}
          <Input value={value} isReadOnly />
          <InputRightElement pr={1}>
            <CopyToClipboard textToCopy={value ?? ""} />
          </InputRightElement>
        </InputGroup>
      </HStack>
    </Box>
  );
};
