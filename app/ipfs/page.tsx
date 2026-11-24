"use client";

import { Suspense } from "react";
import { createParser, useQueryState } from "nuqs";
import {
  Avatar,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ExternalLink, Box as PackageIcon, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { PUBLIC_IPFS_GATEWAYS } from "@/lib/ipfs";
import { IPFS_EXAMPLES, ipfsContentUrl, parseIPFSInput } from "./input";

const ipfsInputParser = createParser({
  parse: (value) => value,
  serialize: (value: string) => {
    const content = parseIPFSInput(value);
    return content ? content.cid + content.suffix : value;
  },
}).withDefault("");

export default function IPFSGateways() {
  return (
    <Suspense
      fallback={
        <Box role="status" p={8}>
          Loading IPFS gateways…
        </Box>
      }
    >
      <IPFSGatewaysContent />
    </Suspense>
  );
}

function IPFSGatewaysContent() {
  const [input, setInput] = useQueryState("cid", ipfsInputParser);
  const content = parseIPFSInput(input);
  const invalid = Boolean(input.trim() && !content);

  return (
    <Layout minW={0}>
      <Box maxW="800px" mx="auto" w="full" pb={10}>
        <HStack spacing={3} mb={3}>
          <Icon as={PackageIcon} boxSize={7} color="primary.400" />
          <Heading as="h1" textStyle="h1">
            IPFS Gateways
          </Heading>
        </HStack>
        <Text color="text.secondary" fontSize="sm" mb={8}>
          Paste IPFS hash and view across public gateways
        </Text>

        <FormControl isInvalid={invalid}>
          <FormLabel htmlFor="ipfs-input" fontSize="sm">
            IPFS hash or URL
          </FormLabel>
          <InputGroup>
            <Input
              id="ipfs-input"
              autoFocus
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="CID, ipfs://… or a gateway URL"
              fontFamily="mono"
              fontSize="sm"
              h={12}
              pr={12}
              bg="bg.subtle"
              borderColor="border.default"
              focusBorderColor="primary.400"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            {input && (
              <InputRightElement h={12}>
                <IconButton
                  aria-label="Clear IPFS input"
                  icon={<X size={15} />}
                  variant="ghost"
                  size="sm"
                  onClick={() => setInput("")}
                />
              </InputRightElement>
            )}
          </InputGroup>
          <FormErrorMessage>
            Enter a valid IPFS CID or a URL containing one.
          </FormErrorMessage>
        </FormControl>
        <HStack mt={2} spacing={1} flexWrap="wrap">
          <Text fontSize="xs" color="text.tertiary" mr={1}>
            Examples
          </Text>
          {IPFS_EXAMPLES.map((example) => (
            <Button
              key={example.label}
              size="xs"
              variant="ghost"
              color="primary.400"
              onClick={() => setInput(example.value)}
            >
              {example.label}
            </Button>
          ))}
        </HStack>

        <Box as="section" aria-labelledby="gateway-heading" mt={8}>
          <HStack justify="space-between" mb={3}>
            <Heading
              as="h2"
              id="gateway-heading"
              fontSize="sm"
              fontWeight="medium"
              color="text.secondary"
            >
              Public gateways
            </Heading>
          </HStack>
          <VStack
            spacing={0}
            align="stretch"
            border="1px solid"
            borderColor="border.default"
            rounded="lg"
            overflow="hidden"
          >
            {PUBLIC_IPFS_GATEWAYS.map((gateway) => {
              const href = content
                ? ipfsContentUrl(gateway.url, content)
                : gateway.website;
              return (
                <Link
                  key={gateway.name}
                  href={href}
                  isExternal
                  aria-label={
                    content
                      ? `Open content via ${gateway.name}`
                      : `Visit ${gateway.name}`
                  }
                  px={{ base: 3, sm: 5 }}
                  py={4}
                  borderBottom="1px solid"
                  borderColor="border.default"
                  _last={{ borderBottom: 0 }}
                  _hover={{ bg: "bg.muted", textDecoration: "none" }}
                  _focusVisible={{
                    outline: "2px solid",
                    outlineColor: "primary.400",
                    outlineOffset: "-2px",
                  }}
                >
                  <HStack justify="space-between" spacing={4}>
                    <Avatar
                      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(gateway.faviconDomain ?? new URL(gateway.website).hostname)}&sz=64`}
                      name={gateway.name}
                      boxSize={6}
                      borderRadius="sm"
                      bg="transparent"
                      flexShrink={0}
                      alignSelf="flex-start"
                      icon={
                        <Icon
                          as={PackageIcon}
                          boxSize={5}
                          color="text.secondary"
                        />
                      }
                    />
                    <Box minW={0} flex={1}>
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color="text.primary"
                      >
                        {gateway.name}
                      </Text>
                      {gateway.note && (
                        <Text mt={1} fontSize="xs" color="text.secondary">
                          {gateway.note}
                        </Text>
                      )}
                      <Text
                        mt={1}
                        fontSize="xs"
                        fontFamily="mono"
                        color="text.secondary"
                        overflowWrap="anywhere"
                      >
                        {content
                          ? href
                          : `${gateway.url.replace("https://", "")}{CID}`}
                      </Text>
                    </Box>
                    <HStack spacing={2} flexShrink={0} color="text.secondary">
                      <Text
                        fontSize="xs"
                        display={{ base: "none", sm: "block" }}
                      >
                        {content ? "Open" : "Website"}
                      </Text>
                      <ExternalLink size={15} aria-hidden="true" />
                    </HStack>
                  </HStack>
                </Link>
              );
            })}
          </VStack>
          {content && (
            <Text mt={3} fontSize="xs" color="text.tertiary">
              Links open in a new tab. If one gateway is unavailable, try
              another.
            </Text>
          )}
        </Box>
      </Box>
    </Layout>
  );
}
