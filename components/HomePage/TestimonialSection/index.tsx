import { Box, Flex, Heading, Grid, Avatar, Text, HStack, VStack, useBreakpointValue, Icon } from "@chakra-ui/react";
import { LeftDash } from "../ToolsGrid/ToolsGridHeading/LeftDash";
import { RightDash } from "../ToolsGrid/ToolsGridHeading/RightDash";
import { FaCheckCircle } from "react-icons/fa";
import testimonials from "./testimonials.json"; // Adjust path as needed

type TestimonialCardProps = {
  name: string;
  handle: string;
  avatar: string;
  text: string;
  verified: boolean;
  tweetUrl: string;
};

const TestimonialCard = ({ name, handle, avatar, text, verified, tweetUrl }: TestimonialCardProps) => (
  <Box
    as="a"
    href={tweetUrl}
    target="_blank"
    rel="noopener noreferrer"
    p={4}
    bg="whiteAlpha.50"
    borderRadius="lg"
    border="1px solid"
    borderColor="whiteAlpha.200"
    boxShadow="md"
    cursor="pointer"
    maxW="350px"
    _hover={{
      bg: "whiteAlpha.100",
      transform: "translateY(-2px)",
      boxShadow: "lg",
      transition: "all 0.2s",
    }}
    transition="all 0.2s"
  >
    <HStack spacing={3} mb={2} align="center">
      <Avatar size="md" src={avatar} name={name} />
      <VStack align="start" spacing={0}>
        <HStack spacing={1}>
          <Text color="gray.100" fontWeight="bold" fontSize="md">{name}</Text>
          {verified && <Icon as={FaCheckCircle} color="blue.400" boxSize={4} />}
        </HStack>
        <Text color="gray.400" fontSize="sm">{handle}</Text>
      </VStack>
    </HStack>
    <Text color="gray.300" fontSize="md" whiteSpace="pre-wrap">{text}</Text>
  </Box>
);

export const TestimonialSection = () => {
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Box w="full" mt={16} mb={16}>
      <Flex alignItems="center" justifyContent="center" width="100%" mb={{ base: 8, md: 12 }}>
        <LeftDash />
        <Heading
          as="h2"
          size={{ base: "lg", md: "xl" }}
          color="white"
          textAlign="center"
          bgGradient="linear(to-r, white, custom.base)"
          bgClip="text"
        >
          Testimonials
        </Heading>
        <RightDash />
      </Flex>
      {isMobile ? (
        <Flex overflowX="auto" gap={6} px={2} py={2} w="full" pb={4}>
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </Flex>
      ) : (
        <Grid
          templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }}
          gap={8}
          px={2}
          w="full"
        >
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </Grid>
      )}
    </Box>
  );
};