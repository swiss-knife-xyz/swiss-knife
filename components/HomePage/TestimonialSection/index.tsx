import { Box, Flex, Heading, Avatar, Text, HStack, VStack, useBreakpointValue, Icon } from "@chakra-ui/react";
import { LeftDash } from "../ToolsGrid/ToolsGridHeading/LeftDash";
import { RightDash } from "../ToolsGrid/ToolsGridHeading/RightDash";
import { FaCheckCircle } from "react-icons/fa";
import testimonials from "./testimonials.json";
import { useEffect, useRef } from "react";

type TestimonialCardProps = {
  name: string;
  handle: string;
  avatar: string;
  text: string;
  verified: boolean;
  tweetUrl: string;
};

const TestimonialCard = ({ name, handle, avatar, text, verified, tweetUrl }: TestimonialCardProps) => {
  const cardWidth = useBreakpointValue({ base: "280px", md: "350px" });
  const fontSizeMd = useBreakpointValue({ base: "sm", md: "md" }); 
  const fontSizeSm = useBreakpointValue({ base: "xs", md: "sm" }); 

  return (
    <Box
      as="a"
      href={tweetUrl}
      target="_blank"
      rel="noopener noreferrer"
      p={{ base: 3, md: 4 }} 
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
      boxShadow="md"
      cursor="pointer"
      maxW={cardWidth}
      minW={cardWidth}
      _hover={{
        bg: "whiteAlpha.100",
        transform: "translateY(-2px)",
        boxShadow: "lg",
        transition: "all 0.2s",
      }}
      transition="all 0.2s"
    >
      <HStack spacing={3} mb={2} align="center">
        <Avatar size={{ base: "sm", md: "md" }} src={avatar} name={name} /> 
        <VStack align="start" spacing={0}>
          <HStack spacing={1}>
            <Text color="gray.100" fontWeight="bold" fontSize={fontSizeMd}>{name}</Text>
            {verified && <Icon as={FaCheckCircle} color="blue.400" boxSize={3} />} 
          </HStack>
          <Text color="gray.400" fontSize={fontSizeSm}>{handle}</Text>
        </VStack>
      </HStack>
      <Text color="gray.300" fontSize={fontSizeMd} whiteSpace="pre-wrap">{text}</Text>
    </Box>
  );
};

const CarouselRow = ({ testimonials, direction = "left" }: { testimonials: TestimonialCardProps[], direction?: "left" | "right" }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const speed = useBreakpointValue({ base: 0.3, md: 0.5 });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    let animationId: number;
    let position = 0;
    const rowWidth = row.scrollWidth / 2;

    const animate = () => {
      // Ensure speed is defined and is a number
      const effectiveSpeed = typeof speed === "number" ? speed : 0.5;
      position += (direction === "left" ? -1 : 1) * effectiveSpeed;

      if (direction === "left" && position <= -rowWidth) {
        position = 0;
      } else if (direction === "right" && position >= 0) {
        position = -rowWidth;
      }
      
      row.style.transform = `translateX(${position}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [direction, speed]);

  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <Flex 
      ref={rowRef}
      gap={{ base: 4, md: 6 }}
      py={2}
      w="max-content"
    >
      {duplicatedTestimonials.map((t, i) => (
        <TestimonialCard key={`${direction}-${i}`} {...t} />
      ))}
    </Flex>
  );
};

export const TestimonialSection = () => {
  const halfLength = Math.ceil(testimonials.length / 2);
  const topRowTestimonials = testimonials.slice(0, halfLength);
  const bottomRowTestimonials = testimonials.slice(halfLength);

  return (
    <Box w="full" mt={{ base: 12, md: 16 }} mb={{ base: 12, md: 16 }} overflow="hidden">
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
          Testimonials
        </Heading>
        <RightDash />
      </Flex>
      
      <Box position="relative" overflow="hidden" mb={{ base: 4, md: 6 }}>
        <CarouselRow testimonials={topRowTestimonials} direction="left" />
      </Box>
      
      <Box position="relative" overflow="hidden">
        <CarouselRow testimonials={bottomRowTestimonials} direction="right" />
      </Box>
    </Box>
  );
};