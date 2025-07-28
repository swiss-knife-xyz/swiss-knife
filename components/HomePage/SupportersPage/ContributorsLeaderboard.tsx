import { Box, Flex, Heading, Avatar, Text, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td, Link, Badge } from "@chakra-ui/react";
import { LeftDash } from "../ToolsGrid/ToolsGridHeading/LeftDash";
import { RightDash } from "../ToolsGrid/ToolsGridHeading/RightDash";

type Contributor = {
  rank: number;
  name: string;
  ensName?: string;
  avatar: string;
  amount: number;
  currency: string;
  profileLink: string;
  isVerified?: boolean;
};

const contributors: Contributor[] = [
  {
    rank: 1,
    name: "vitalik.eth",
    ensName: "vitalik.eth",
    avatar: "/avatars/vitalik.jpg",
    amount: 10.5,
    currency: "ETH",
    profileLink: "https://etherscan.io/address/vitalik.eth",
    isVerified: true
  },
  {
    rank: 2,
    name: "sassal.eth",
    ensName: "sassal.eth",
    avatar: "/avatars/sassal.jpg",
    amount: 7.8,
    currency: "ETH",
    profileLink: "https://etherscan.io/address/sassal.eth",
    isVerified: true
  },
  {
    rank: 3,
    name: "0xabcdef...1234",
    avatar: "/avatars/default.png",
    amount: 5.2,
    currency: "ETH",
    profileLink: "https://etherscan.io/address/0xabcdef1234"
  },
  {
    rank: 4,
    name: "tayvano.eth",
    ensName: "tayvano.eth",
    avatar: "/avatars/tayvano.jpg",
    amount: 4.9,
    currency: "ETH",
    profileLink: "https://etherscan.io/address/tayvano.eth",
    isVerified: true
  },
  {
    rank: 5,
    name: "0xghijk...5678",
    avatar: "/avatars/default.png",
    amount: 3.1,
    currency: "ETH",
    profileLink: "https://etherscan.io/address/0xghijk5678"
  },
];

const ContributorRow = ({ contributor }: { contributor: Contributor }) => {
  return (
    <Tr 
      _hover={{ bg: "whiteAlpha.50" }}
      transition="background 0.2s"
    >
      <Td>
        <Flex align="center">
          <Box 
            bg={contributor.rank <= 3 ? "yellow.400" : "whiteAlpha.200"} 
            color={contributor.rank <= 3 ? "black" : "white"} 
            w={8} 
            h={8} 
            borderRadius="full" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            fontWeight="bold"
            mr={3}
          >
            {contributor.rank}
          </Box>
          <HStack spacing={3}>
            <Avatar 
              size="sm" 
              src={contributor.avatar} 
              name={contributor.name}
              border={contributor.isVerified ? "2px solid" : "none"}
              borderColor={contributor.isVerified ? "blue.400" : "transparent"}
            />
            <VStack align="start" spacing={0}>
              <Text fontWeight="medium">
                {contributor.ensName || contributor.name}
              </Text>
              {contributor.ensName && (
                <Text fontSize="xs" color="gray.400">
                  {contributor.name}
                </Text>
              )}
            </VStack>
          </HStack>
        </Flex>
      </Td>
      <Td>
        <Badge 
          colorScheme="green" 
          px={2} 
          py={1} 
          borderRadius="md"
          fontSize="sm"
        >
          {contributor.amount.toFixed(2)} {contributor.currency}
        </Badge>
      </Td>
      <Td textAlign="right">
        <Link 
          href={contributor.profileLink} 
          isExternal
          color="blue.400"
          _hover={{ textDecoration: "none", color: "blue.300" }}
        >
          View Profile
        </Link>
      </Td>
    </Tr>
  );
};

export const ContributorsLeaderboard = () => {
  return (
    <Box w="full" mt={{ base: 12, md: 16 }} mb={{ base: 12, md: 16 }}>
      <Flex alignItems="center" justifyContent="center" width="100%" mb={{ base: 6, md: 12 }}>
        <LeftDash />
        <Heading
          as="h2"
          size={{ base: "lg", md: "xl" }}
          color="white"
          textAlign="center"
          bgGradient="linear(to-r, white, custom.base)"
          bgClip="text"
        >
          Top Contributors
        </Heading>
        <RightDash />
      </Flex>

      <Box 
        bg="whiteAlpha.50" 
        borderRadius="xl" 
        border="1px solid" 
        borderColor="whiteAlpha.200" 
        overflow="hidden"
        px={{ base: 4, md: 0 }}
      >
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th color="whiteAlpha.800">Contributor</Th>
              <Th color="whiteAlpha.800">Amount</Th>
              <Th textAlign="right" color="whiteAlpha.800">Profile</Th>
            </Tr>
          </Thead>
          <Tbody>
            {contributors.map((contributor) => (
              <ContributorRow key={contributor.rank} contributor={contributor} />
            ))}
          </Tbody>
        </Table>
      </Box>

      <Text mt={4} textAlign="center" color="whiteAlpha.600" fontSize="sm">
        Thank you to all our amazing contributors! 🙌
      </Text>
    </Box>
  );
};