import {
  Avatar,
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Link,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { LeftDash } from "../ToolsGrid/ToolsGridHeading/LeftDash";
import { RightDash } from "../ToolsGrid/ToolsGridHeading/RightDash";
import contributors from "./data/contributors.json";

type Contributor = {
  rank: number;
  login: string;
  avatar: string;
  contributions: number;
  profileUrl: string;
};

const contributorData = contributors as Contributor[];
const totalContributions = contributorData.reduce(
  (total, contributor) => total + contributor.contributions,
  0
);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en").format(value);

const RankBadge = ({ rank }: { rank: number }) => {
  const isTopThree = rank <= 3;

  return (
    <Flex
      align="center"
      justify="center"
      flex="0 0 auto"
      boxSize={8}
      borderRadius="md"
      bg={isTopThree ? "whiteAlpha.300" : "whiteAlpha.100"}
      border="1px solid"
      borderColor={isTopThree ? "whiteAlpha.400" : "whiteAlpha.200"}
      color="white"
      fontSize="sm"
      fontWeight="bold"
    >
      {rank}
    </Flex>
  );
};

const ContributorCard = ({
  rank,
  login,
  avatar,
  contributions,
  profileUrl,
}: Contributor) => {
  return (
    <Link
      href={profileUrl}
      isExternal
      _hover={{ textDecoration: "none" }}
      _focusVisible={{
        outline: "none",
        boxShadow: "0 0 0 3px rgba(96, 165, 250, 0.5)",
      }}
    >
      <HStack
        align="center"
        spacing={3}
        minH="72px"
        p={3}
        bg="rgba(255, 255, 255, 0.045)"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="md"
        transition="background 0.2s ease, border-color 0.2s ease, transform 0.2s ease"
        _hover={{
          bg: "rgba(255, 255, 255, 0.075)",
          borderColor: "whiteAlpha.300",
          transform: "translateY(-2px)",
        }}
      >
        <RankBadge rank={rank} />
        <Avatar size="sm" src={avatar} name={login} />
        <Box minW={0} flex="1">
          <HStack spacing={1.5} minW={0}>
            <Text
              color="white"
              fontWeight="semibold"
              fontSize="sm"
              noOfLines={1}
            >
              {login}
            </Text>
            <ExternalLinkIcon color="gray.500" boxSize={3} />
          </HStack>
          <Text color="gray.400" fontSize="xs">
            {formatNumber(contributions)} contribution
            {contributions === 1 ? "" : "s"}
          </Text>
        </Box>
      </HStack>
    </Link>
  );
};

export const ContributorsLeaderboard = () => {
  return (
    <Box
      as="section"
      bg="bg.800"
      py={{ base: 12, md: 16 }}
      aria-labelledby="contributors-heading"
    >
      <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
        <Flex
          alignItems="center"
          justifyContent="center"
          width="100%"
          mb={{ base: 6, md: 8 }}
        >
          <LeftDash />
          <Heading
            id="contributors-heading"
            as="h2"
            size={{ base: "lg", md: "xl" }}
            color="white"
            textAlign="center"
          >
            Top Contributors
          </Heading>
          <RightDash />
        </Flex>

        <VStack spacing={{ base: 5, md: 6 }} align="stretch">
          <Flex
            justify="center"
            align="center"
            gap={3}
            wrap="wrap"
            color="gray.400"
            fontSize={{ base: "sm", md: "md" }}
            textAlign="center"
          >
            <Text>
              Real GitHub contribution counts from{" "}
              <Link
                href="https://github.com/swiss-knife-xyz/swiss-knife"
                isExternal
                color="blue.300"
                fontWeight="semibold"
                _hover={{ color: "blue.200", textDecoration: "none" }}
              >
                swiss-knife-xyz/swiss-knife
              </Link>
              .
            </Text>
            <Badge
              colorScheme="blue"
              variant="subtle"
              borderRadius="md"
              px={2}
              py={1}
            >
              {formatNumber(totalContributions)} total listed
            </Badge>
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
            {contributorData.map((contributor) => (
              <ContributorCard key={contributor.login} {...contributor} />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
};
