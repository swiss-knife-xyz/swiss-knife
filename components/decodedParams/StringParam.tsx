import React, { useEffect, useState } from "react";
import { InputField } from "../InputField";
import {
  Textarea,
  Box,
  Button,
  Flex,
  Stack,
  Table,
  Tbody,
  Tr,
  Td,
  HStack,
  Spacer,
  Link,
  Skeleton,
  Text,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import axios from "axios";
import { decodeBase64, isBigInt, isValidJSON, resolveIPFS } from "@/utils";
import TabsSelector from "../Tabs/TabsSelector";
import { CopyToClipboard } from "../CopyToClipboard";
import { ResizableImage } from "../ResizableImage";
import { motion } from "framer-motion";
import { isAddress } from "viem";
import { renderParamTypes } from "../renderParams";
import { Editor } from "@monaco-editor/react";

interface Params {
  value: string | null;
  chainId?: number;
  disableRich?: boolean;
}

// FIXME: passing chainId leads to infinite calls to fetch labels and ENS
export const StringParam = ({
  value: _value,
  chainId,
  disableRich,
}: Params) => {
  const showSkeleton = _value === undefined || _value === null;
  const value = !showSkeleton ? _value : "abcdef1234";

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [richSelectedTabIndex, setRichSelectedTabIndex] = useState(0);
  const [urlContent, setUrlContent] = useState<string | null>(null);
  const [isUrlImageOrJson, setIsUrlImageOrJson] = useState<{
    isImage?: boolean;
    isJson?: boolean;
  } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  let displayValue = value;
  let isJson = false;
  let isImage = false;
  let isBase64Encoded = false;
  let isUrl = false;

  const base64 = decodeBase64(value);
  if (base64 && base64.content) {
    displayValue = base64.content;
    isBase64Encoded = true;
    isImage = base64.isSvg;
  }

  try {
    const _value = isBase64Encoded ? base64!.content : value;
    const parsedValue = JSON.parse(_value);
    displayValue = JSON.stringify(parsedValue, null, 4);
    if (displayValue === "null" || !isValidJSON(_value)) {
      throw new Error("Invalid JSON");
    }
    isJson = true;
  } catch (e) {
    // If parsing fails, keep the original value
  }

  if (
    typeof value === "string" &&
    (value.startsWith("http") || value.startsWith("ipfs://"))
  ) {
    isUrl = true;
  }

  const SimpleString = () => {
    // use Textarea if value is large
    return value.length > 200 ? (
      <Box w="full">
        <HStack mb={1} w="full">
          <Spacer />
          <HStack>
            <CopyToClipboard textToCopy={value ?? ""} size="xs" />
            {isUrl && (
              <Link href={resolveIPFS(value)} title="visit link" isExternal>
                <Button size={"xs"}>
                  <ExternalLinkIcon />
                </Button>
              </Link>
            )}
          </HStack>
        </HStack>
        <Textarea
          value={value}
          isReadOnly
          resize={"both"}
          rows={2}
          placeholder=""
          w="full"
        />
      </Box>
    ) : (
      <HStack w="full">
        <Box flex="1">
          <InputField
            w="full"
            value={value}
            placeholder=""
            isReadOnly
            onChange={() => {}}
          />
        </Box>
        {isUrl && (
          <Link href={resolveIPFS(value)} title="visit link" isExternal>
            <Button size={"xs"}>
              <ExternalLinkIcon />
            </Button>
          </Link>
        )}
      </HStack>
    );
  };

  const RichJsonTable = ({
    _value,
    chainId,
  }: {
    _value: string;
    chainId?: number;
  }) => {
    let jsonValue: { [key: string]: any };

    try {
      jsonValue = isValidJSON(_value)
        ? JSON.parse(_value)
        : JSON.parse(JSON.stringify(_value));
    } catch (e) {
      jsonValue = {};
    }

    return (
      <Table variant={"unstyled"}>
        <Tbody>
          {Object.keys(jsonValue).map((key) => {
            const __value: any = jsonValue[key];
            // avoids the quotes from the string
            const isString = typeof __value === "string";

            let type: "uint" | "address" | "bytes" | null = null;
            if (isString) {
              if (isAddress(__value)) {
                type = "address";
              } else if (
                __value.startsWith("0x") &&
                /^0x[0-9a-fA-F]*$/.test(__value)
              ) {
                type = "bytes";
              } else if (isBigInt(__value)) {
                type = "uint";
              }
            }

            if (type) {
              return (
                <Tr key={key}>
                  <Td colSpan={2}>
                    <Box>
                      <Text fontWeight={"bold"}>{key}</Text>
                      {renderParamTypes(
                        {
                          name: key,
                          type: type,
                          baseType: type,
                          value: __value,
                          rawValue: __value,
                        },
                        chainId
                      )}
                    </Box>
                  </Td>
                </Tr>
              );
            }

            return (
              <Tr key={key}>
                <Td fontWeight={"bold"}>{key}</Td>
                <Td>
                  <StringParam
                    value={isString ? __value : JSON.stringify(__value)}
                  />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    );
  };

  const renderContent = (chainId?: number) => {
    // Decoded Base64 / JSON / SVG / URL
    if (selectedTabIndex === 0) {
      // Rich Output
      if (richSelectedTabIndex === 0) {
        // Return key-value table
        if (isJson) {
          return <RichJsonTable _value={displayValue} chainId={chainId} />;
        } else if (isImage) {
          return <ResizableImage src={value} />;
        } else {
          if (isUrlImageOrJson?.isJson && urlContent) {
            return <RichJsonTable _value={urlContent} chainId={chainId} />;
          } else if (isUrlImageOrJson?.isImage) {
            return <ResizableImage src={resolveIPFS(value)} />;
          } else {
            return <SimpleString />;
          }
        }
      } else {
        // Raw JSON / SVG
        if (isJson || isImage) {
          return (
            <Box>
              <HStack mb={1}>
                <Spacer />
                <CopyToClipboard textToCopy={value ?? ""} size="xs" />
              </HStack>
              <Editor
                height="100%"
                theme="vs-dark"
                defaultLanguage="json"
                value={displayValue}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </Box>
          );
        } else {
          // Raw URL
          return <SimpleString />;
        }
      }
    } else {
      // Original
      return <SimpleString />;
    }
  };

  const StringFormatOptions = [
    `Decoded ${isBase64Encoded ? "Base64" : ""} ${isJson ? "JSON" : ""} ${
      base64?.isSvg ? "SVG" : ""
    } ${isUrl ? "URL" : ""}`,
    "Original",
  ];

  let richTabs: string[] = [];
  if (isJson) {
    richTabs = ["Rich Output", "Raw JSON"];
  } else if (isImage) {
    richTabs = ["Image", "Raw SVG"];
  } else if (isUrl) {
    richTabs = ["Fetched URL", "Raw URL"];
  }

  useEffect(() => {
    if (isUrl) {
      // Check if the URL returns an image or JSON
      axios
        .get(resolveIPFS(value))
        .then((res) => {
          let _urlContent = res.data;
          setUrlContent(_urlContent);
          try {
            if (
              !(
                JSON.stringify(_urlContent).startsWith("{") &&
                JSON.stringify(_urlContent).endsWith("}")
              )
            ) {
              throw new Error("Invalid JSON");
            }

            _urlContent = JSON.parse(JSON.stringify(_urlContent));
            setIsUrlImageOrJson({
              isJson: true,
            });
          } catch (e) {
            const contentType = res.headers["content-type"];
            if (contentType?.startsWith("image")) {
              setIsUrlImageOrJson({
                isImage: true,
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [isUrl]);

  useEffect(() => {
    if (!showSkeleton) {
      setIsLoaded(true);
    }
  }, [showSkeleton]);

  return showSkeleton ? (
    <HStack w="full">
      <Skeleton
        height="2rem"
        width="20rem"
        rounded="md"
        startColor="whiteAlpha.50"
        endColor="whiteAlpha.400"
      />
      <Skeleton
        flexGrow={1}
        height="2rem"
        rounded="md"
        startColor="whiteAlpha.50"
        endColor="whiteAlpha.400"
      />
    </HStack>
  ) : (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isLoaded ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      style={{ width: "100%" }}
    >
      <Box w="full">
        {!disableRich && (isJson || isImage || (isUrl && isUrlImageOrJson)) ? (
          <Stack
            mt={2}
            p={4}
            w="full"
            bg={"whiteAlpha.50"}
            rounded={"lg"}
            boxShadow="lg"
          >
            {/* Decoded / Original button */}
            <Flex justifyContent="flex-end" mb={2}>
              <Button
                size="sm"
                onClick={() =>
                  setSelectedTabIndex((prev) => (prev === 0 ? 1 : 0))
                }
              >
                {StringFormatOptions[selectedTabIndex]}
              </Button>
            </Flex>
            {/* Rich tabs selector */}
            {selectedTabIndex === 0 ? (
              <Box fontSize={"sm"}>
                <TabsSelector
                  mt={0}
                  tabs={richTabs}
                  selectedTabIndex={richSelectedTabIndex}
                  setSelectedTabIndex={setRichSelectedTabIndex}
                />
              </Box>
            ) : null}
            {renderContent(chainId)}
          </Stack>
        ) : (
          <SimpleString />
        )}
      </Box>
    </motion.div>
  );
};
