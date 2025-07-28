import { Box, Flex, Heading, Avatar, Text, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td, Badge, Link, SimpleGrid, useBreakpointValue, IconButton } from "@chakra-ui/react";
import { LeftDash } from "../ToolsGrid/ToolsGridHeading/LeftDash";
import { RightDash } from "../ToolsGrid/ToolsGridHeading/RightDash";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useState } from "react";
import contributors from "./data/contributors.json";

const ContributorRow = ({ contributor }: { contributor: any }) => {
  return (
    <Tr _hover={{ bg: "whiteAlpha.50" }} transition="background 0.2s">
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
          <Link 
            href={contributor.profileLink} 
            isExternal
            _hover={{ textDecoration: "none" }}
            display="flex"
            alignItems="center"
          >
            <Avatar 
              size="sm" 
              src={contributor.avatar} 
              name={contributor.name}
              border={contributor.isVerified ? "2px solid" : "none"}
              borderColor={contributor.isVerified ? "blue.400" : "transparent"}
              mr={3}
            />
            <Text fontWeight="medium">{contributor.name}</Text>
          </Link>
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
    </Tr>
  );
};

const ContributorTable = ({ contributors, title, showNavigation, onPrev, onNext, currentView }: 
  { 
    contributors: any[], 
    title?: string,
    showNavigation?: boolean,
    onPrev?: () => void,
    onNext?: () => void,
    currentView?: number
  }) => (
  <Box 
    bg="whiteAlpha.50" 
    borderRadius="xl" 
    border="1px solid" 
    borderColor="whiteAlpha.200" 
    overflow="hidden"
    flex={1}
  >
    <Flex justify="space-between" align="center" p={4}>
      <Heading size="md" color="whiteAlpha.800">
        {title}
      </Heading>
      {showNavigation && (
        <HStack spacing={2}>
          <IconButton
            aria-label="Previous contributors"
            icon={<ChevronLeftIcon />}
            onClick={onPrev}
            isDisabled={currentView === 0}
            size="sm"
            variant="ghost"
          />
          <IconButton
            aria-label="Next contributors"
            icon={<ChevronRightIcon />}
            onClick={onNext}
            isDisabled={currentView === 1}
            size="sm"
            variant="ghost"
          />
        </HStack>
      )}
    </Flex>
    <Table variant="simple">
      <Thead>
        <Tr>
          <Th color="whiteAlpha.800">Contributor</Th>
          <Th color="whiteAlpha.800">Amount</Th>
        </Tr>
      </Thead>
      <Tbody>
        {contributors.map((contributor) => (
          <ContributorRow key={contributor.rank} contributor={contributor} />
        ))}
      </Tbody>
    </Table>
  </Box>
);

export const ContributorsLeaderboard = () => {
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const [mobileViewIndex, setMobileViewIndex] = useState(0); // 0 for top 1-10, 1 for 11-20
  const top10 = contributors.slice(0, 10);
  const next10 = contributors.slice(10, 20);

  const handlePrev = () => setMobileViewIndex(0);
  const handleNext = () => setMobileViewIndex(1);

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

      {isDesktop ? (
        <SimpleGrid columns={2} spacing={6}>
          <ContributorTable contributors={top10} title="1-10" />
          <ContributorTable contributors={next10} title="11-20" />
        </SimpleGrid>
      ) : (
        <ContributorTable 
          contributors={mobileViewIndex === 0 ? top10 : next10} 
          title={mobileViewIndex === 0 ? "1-10" : "1-20"}
          showNavigation={true}
          onPrev={handlePrev}
          onNext={handleNext}
          currentView={mobileViewIndex}
        />
      )}

      <Text mt={4} textAlign="center" color="whiteAlpha.600" fontSize="sm">
        Thank you to all our amazing contributors! 🙌
      </Text>
    </Box>
  );
};