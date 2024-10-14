import React, { useEffect, useState } from "react";
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
} from "@chakra-ui/react";
import { getEnsName, getEnsAvatar, getPath } from "@/utils";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import axios from "axios";
import subdomains from "@/subdomains";
import { ExternalLinkIcon } from "@chakra-ui/icons";

interface Params {
  address: any;
  showLink?: boolean;
  chainId?: number;
}

export const AddressParam = ({ address, showLink, chainId }: Params) => {
  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [showEns, setShowEns] = useState(false);

  const [addressLabels, setAddressLabels] = useState<string[]>([]);

  const [value, setValue] = useState<string>(address);

  const fetchSetAddressLabel = async () => {
    try {
      const res = await axios.get(
        `${
          process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
            ? ""
            : "https://swiss-knife.xyz"
        }/api/labels/${address}`
      );
      const data = res.data.data;
      if (data.length > 0) {
        setAddressLabels(data.map((d: any) => d.address_name ?? d.label));
      } else {
        setAddressLabels([]);
      }
    } catch {
      setAddressLabels([]);
    }
  };

  useEffect(() => {
    getEnsName(address).then((res) => {
      if (res) {
        setEnsName(res);
        setShowEns(true);
      }
    });

    fetchSetAddressLabel();
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
        {showLink && (
          <Link
            href={`${getPath(subdomains.EXPLORER.base)}address/${value}${
              chainId ? `/contract?chainId=${chainId}` : ""
            }`}
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
    </Box>
  );
};
