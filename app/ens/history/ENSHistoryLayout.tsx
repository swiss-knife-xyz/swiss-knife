"use client";

import NextLink from "next/link";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useParams } from "next/navigation";
import { ReactNode, useRef, useState } from "react";
import {
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  HStack,
  Box,
  Text,
  Card,
  CardBody,
  SimpleGrid,
  Center,
  Image,
} from "@chakra-ui/react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

export const ENSHistoryLayout = ({ children }: { children: ReactNode }) => {
  const router = useTopLoaderRouter();
  const params = useParams();

  const ensNameFromParams =
    typeof params.ensName === "string" ? params.ensName : undefined;

  const [ensName, setEnsName] = useState<string>(ensNameFromParams ?? "");
  const [loading, setLoading] = useState(false);

  // Add a debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Define the card data structure
  interface CardData {
    ensName: string;
    description: string;
    useEnsAvatar?: boolean;
  }

  // Array of card data
  const cardsData: CardData[] = [
    {
      ensName: "eternalsafe.eth",
      description: "A decentralized UI for Safe{Wallet}",
      useEnsAvatar: false,
    },
    {
      ensName: "2.horswap.eth",
      description:
        "Open source and censorship resistant interface for the Uniswap protocol",
      useEnsAvatar: false,
    },
    {
      ensName: "vitalik.eth",
      description: "Blogposts by Vitalik Buterin",
      useEnsAvatar: true,
    },
  ];

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Update the input value immediately for UI responsiveness
    setEnsName(value);

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      // This will only run after the user stops typing for 500ms
      // No need to do anything here as we're just preventing re-renders
    }, 500);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault(); // Prevent default paste behavior
    const pastedText = e.clipboardData.getData("text");
    setEnsName(pastedText);
    fetchHistory(pastedText);
  };

  // Add a keyDown handler for the Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchHistory();
    }
  };

  const handleExampleClick = (example: string) => {
    setEnsName(example);
    fetchHistory(example);
  };

  const fetchHistory = (_ensName?: string) => {
    setLoading(true);
    if (_ensName) {
      setEnsName(_ensName);
    }
    _ensName = _ensName ?? ensName;

    setTimeout(() => {
      setLoading(false);
    }, 1_000);

    router.push(`${getPath(subdomains.ENS.base)}history/${_ensName}`);
  };

  return (
    <Box maxW="1200px" w="full" px={4}>
      <Box
        mb={6}
        as={NextLink}
        href={`${getPath(subdomains.ENS.base)}history`}
        _hover={{ textDecoration: "none" }}
      >
        <Heading mt={10} color="custom.pale">
          ENS Domain History
        </Heading>
        <Text mt={2} mb={14} color="whiteAlpha.700">
          Check IPFS content changes, ownership transfers and more over time.
        </Text>
      </Box>
      <Box maxW="1200px" w="full" px={4}>
        <Center>
          <FormControl maxW="40rem">
            <FormLabel fontWeight="medium">ENS Name</FormLabel>
            <HStack spacing={4}>
              <Input
                placeholder="eternalsafe.eth"
                value={ensName}
                onChange={handleInputChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                size="md"
              />
              <Button
                onClick={() => fetchHistory()}
                isLoading={loading}
                colorScheme="blue"
                px={6}
              >
                Fetch
              </Button>
            </HStack>
          </FormControl>
        </Center>

        {!ensNameFromParams && (
          <Box mt={"4rem"} pb={"4rem"}>
            <Heading size="sm" mb={4}>
              or try these examples:
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {cardsData.map((card, index) => (
                <Card
                  key={index}
                  maxW={"20rem"}
                  variant="outline"
                  shadow="sm"
                  bg="blackAlpha.300"
                  cursor="pointer"
                  _hover={{ transform: "translateY(-2px)", shadow: "md" }}
                  transition="all 0.2s"
                  onClick={() => handleExampleClick(card.ensName)}
                >
                  <CardBody display="flex" alignItems="center" p={4}>
                    <Image
                      alt={card.ensName}
                      src={
                        card.useEnsAvatar
                          ? `https://euc.li/${card.ensName}`
                          : `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=https://${card.ensName}.limo`
                      }
                      boxSize="48px"
                      borderRadius="full"
                      mr={4}
                      fallbackSrc="https://placehold.co/48x48/gray/white?text=ENS"
                    />
                    <Box>
                      <Text fontWeight="bold">{card.ensName}</Text>
                      <Text fontSize="sm" color="gray.400">
                        {card.description}
                      </Text>
                    </Box>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </Box>
      {children}
    </Box>
  );
};
