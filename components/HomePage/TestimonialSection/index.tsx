import {
  Avatar,
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CheckCircleIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import { LeftDash } from "../ToolsGrid/ToolsGridHeading/LeftDash";
import { RightDash } from "../ToolsGrid/ToolsGridHeading/RightDash";
import testimonials from "./testimonials.json";

type Testimonial = {
  name: string;
  handle: string;
  avatar: string;
  text: string;
  verified: boolean;
  tweetUrl: string;
};

const testimonialRows = [
  (testimonials as Testimonial[]).slice(
    0,
    Math.ceil((testimonials as Testimonial[]).length / 2)
  ),
  (testimonials as Testimonial[]).slice(
    Math.ceil((testimonials as Testimonial[]).length / 2)
  ),
];

const TestimonialCard = ({
  name,
  handle,
  avatar,
  text,
  verified,
  tweetUrl,
}: Testimonial) => {
  return (
    <Box
      as="a"
      href={tweetUrl}
      target="_blank"
      rel="noopener noreferrer"
      flex="0 0 auto"
      w={{ base: "280px", md: "340px" }}
      minH={{ base: "180px", md: "196px" }}
      p={{ base: 4, md: 5 }}
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="rgba(255, 255, 255, 0.045)"
      boxShadow="0 20px 60px rgba(0, 0, 0, 0.22)"
      transition="background 0.2s ease, border-color 0.2s ease, transform 0.2s ease"
      _hover={{
        bg: "rgba(255, 255, 255, 0.075)",
        borderColor: "whiteAlpha.300",
        transform: "translateY(-2px)",
      }}
      _focusVisible={{
        outline: "none",
        boxShadow: "0 0 0 3px rgba(96, 165, 250, 0.5)",
      }}
    >
      <VStack align="stretch" spacing={4} h="full">
        <HStack spacing={3} align="center">
          <Avatar size="sm" src={avatar} name={name} />
          <Box minW={0} flex="1">
            <HStack spacing={1.5} minW={0}>
              <Text
                color="white"
                fontWeight="semibold"
                fontSize="sm"
                noOfLines={1}
              >
                {name}
              </Text>
              {verified && (
                <Icon as={CheckCircleIcon} color="blue.300" boxSize={3.5} />
              )}
            </HStack>
            <Text color="gray.400" fontSize="xs" noOfLines={1}>
              {handle}
            </Text>
          </Box>
          <Icon as={ExternalLinkIcon} color="gray.500" boxSize={3.5} />
        </HStack>

        <Text
          color="gray.200"
          fontSize={{ base: "sm", md: "md" }}
          lineHeight="1.55"
          noOfLines={4}
        >
          {text}
        </Text>
      </VStack>
    </Box>
  );
};

const TestimonialRow = ({
  row,
  direction,
}: {
  row: Testimonial[];
  direction: "left" | "right";
}) => {
  const duplicated = [...row, ...row];

  return (
    <Box
      overflow="hidden"
      py={2}
      sx={{
        "@keyframes testimonial-scroll-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "@keyframes testimonial-scroll-right": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        "&:hover .testimonial-track": {
          animationPlayState: "paused",
        },
        "@media (prefers-reduced-motion: reduce)": {
          ".testimonial-track": {
            animation: "none",
            transform: "translateX(0)",
          },
        },
      }}
    >
      <Flex
        className="testimonial-track"
        gap={{ base: 4, md: 6 }}
        w="max-content"
        willChange="transform"
        animation={`testimonial-scroll-${direction} ${
          direction === "left" ? "42s" : "48s"
        } linear infinite`}
      >
        {duplicated.map((testimonial, index) => (
          <TestimonialCard
            key={`${direction}-${testimonial.tweetUrl}-${index}`}
            {...testimonial}
          />
        ))}
      </Flex>
    </Box>
  );
};

export const TestimonialSection = () => {
  return (
    <Box
      as="section"
      bg="bg.900"
      py={{ base: 12, md: 16 }}
      overflow="hidden"
      aria-labelledby="testimonials-heading"
    >
      <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
        <Flex
          alignItems="center"
          justifyContent="center"
          width="100%"
          mb={{ base: 8, md: 10 }}
        >
          <LeftDash />
          <Heading
            id="testimonials-heading"
            as="h2"
            size={{ base: "lg", md: "xl" }}
            color="white"
            textAlign="center"
          >
            Testimonials
          </Heading>
          <RightDash />
        </Flex>

        <VStack spacing={{ base: 3, md: 4 }} align="stretch">
          <TestimonialRow row={testimonialRows[0]} direction="left" />
          <TestimonialRow row={testimonialRows[1]} direction="right" />
        </VStack>
      </Container>
    </Box>
  );
};
