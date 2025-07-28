import { Box, Flex, Heading, Grid, Avatar, Text, HStack, VStack, useBreakpointValue, Icon } from "@chakra-ui/react";
import { LeftDash } from "../ToolsGrid/ToolsGridHeading/LeftDash";
import { RightDash } from "../ToolsGrid/ToolsGridHeading/RightDash";
import { FaCheckCircle } from "react-icons/fa";

const testimonials = [
  {
    name: "Patrick Collins",
    handle: "@PatrickAlphaC",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/danny.jpg", // Replace with real or local avatar
    text: "Wow this is sick!!",
    verified: true,
    tweetUrl: "https://x.com/PatrickAlphaC/status/1926682922943123471",
  },
  {
    name: "Rosco Kalis",
    handle: "@RoscoKalis",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/guilherme.jpg",
    text: "@apoorveth's 7702 Beat tracks chains, wallets and app support.",
    verified: true,
    tweetUrl: "https://x.com/RoscoKalis/status/1942538335697986011",
  },
  {
    name: "ambire.eth",
    handle: "@AmbireWallet",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/webbae.jpg",
    text: "My favorite website lately. It shows chains, wallets, and apps supporting the latest from Ethereum Pectra upgrade. Have a try!",
    verified: true,
    tweetUrl: "https://twitter.com/WebIsBae/status/1234567890",
  },
  {
    name: "Blank",
    handle: "@elefantoz",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/fayaz.jpg",
    text: "Congrats! @swissknifexyz is one of the most (if not the most) useful tool out there",
    verified: false,
    tweetUrl: "https://x.com/elefantoz/status/1928184382872814030",
    },
{
    name: "ross",
    handle: "@z0r0zzz",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/jesse.jpg",
    text: "anyways @swissknifexyz goatd",
    verified: true,
    tweetUrl: "https://x.com/z0r0zzz/status/1946239228012265488",
  },
  {
    name: "Papa Wheelie",
    handle: "@mrpapawheelie",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/rj.jpg",
    text: `Blockchain BALLS-DEEP DEV TOOLS I swear by (and you probably should too):\n🔪 SwissKnife → https://swiss-knife.xyz\ <br>Decode calldata instantly + jump into any chain’s top contract tools. A must-have for sleuths and giga nerds with an obsession for swords and blockchain code.`,
    verified: true,
    tweetUrl: "https://x.com/mrpapawheelie/status/1914828235915059344",
  },
  {
    name: "noah.eth",
    handle: "@NoahMarconi",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/mikael.jpg",
    text: "s/o to @apoorvlathey for swiss-knife.xyz makes life so much easier on multiple fronts",
    verified: true,
    tweetUrl: "https://x.com/NoahMarconi/status/1899581634254348580",
  },
  {
    name: "gabidev.eth",
    handle: "@GabiDev98",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/razvan.jpg",
    text: "Thanks for your work on swiss-knife, it's daily for me.",
    verified: true,
    tweetUrl: "https://x.com/GabiDev98/status/1899013266350756173",
  },
  {
    name: "Pedro Gomes",
    handle: "@pedrouid",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/mikael.jpg",
    text: `Once again @apoorveth showcases the power of @WalletConnect Network 🔥\nConnect your @coinbase smart wallet or your @farcaster_xyz wallet to ANY app! 👀\nThanks to WalletConnect these wallets can now connect everywhere… try it below 👇`,
    verified: true,
    tweetUrl: "https://x.com/pedrouid/status/1898868851439513869",
  },
  {
    name: "zodomo.eth (🌍,💻)",
    handle: "@0xZodomo",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/razvan.jpg",
    text: "This is something I've desperately needed and didn't know it cause I've just been jumping through many hoops to do this",
    verified: true,
    tweetUrl: "https://x.com/0xZodomo/status/1898803223802102017",
  },
  {
    name: "noah.eth",
    handle: "@NoahMarconi",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/mikael.jpg",
    text: "s/o to @apoorvlathey for swiss-knife.xyz makes life so much easier on multiple fronts",
    verified: true,
    tweetUrl: "https://x.com/NoahMarconi/status/1899581634254348580",
  },
  {
    name: "gabidev.eth",
    handle: "@GabiDev98",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/razvan.jpg",
    text: "Thanks for your work on swiss-knife, it's daily for me.",
    verified: true,
    tweetUrl: "https://x.com/GabiDev98/status/1899013266350756173",
  },
  {
    name: "Pedro Gomes",
    handle: "@pedrouid",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/mikael.jpg",
    text: `Once again @apoorveth showcases the power of @WalletConnect Network 🔥\nConnect your @coinbase smart wallet or your @farcaster_xyz wallet to ANY app! 👀\nThanks to WalletConnect these wallets can now connect everywhere… try it below 👇`,
    verified: true,
    tweetUrl: "https://x.com/pedrouid/status/1898868851439513869",
  },
  {
    name: "zodomo.eth (🌍,💻)",
    handle: "@0xZodomo",
    avatar: "https://pbs.twimg.com/profile_images/1234567890/razvan.jpg",
    text: "This is something I've desperately needed and didn't know it cause I've just been jumping through many hoops to do this",
    verified: true,
    tweetUrl: "https://x.com/0xZodomo/status/1898803223802102017",
  },
];

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
    p={1}
    bg="whiteAlpha.50"
    borderRadius="lg"
    border="1px solid"
    borderColor="whiteAlpha.200"
    boxShadow="md"
    cursor="pointer"
    maxW="250px"
    _hover={{
      bg: "whiteAlpha.100",
      transform: "translateY(-2px)",
      boxShadow: "lg",
      transition: "all 0.2s",
    }}
    transition="all 0.2s"
  >
    <HStack spacing={0} mb={0} align="center">
      <Avatar size="2xs" src={avatar} name={name} />
      <VStack align="start" spacing={0}>
        <HStack spacing={0}>
          <Text color="gray.100" fontWeight="bold" fontSize="2xs">{name}</Text>
          {verified && <Icon as={FaCheckCircle} color="blue.400" boxSize={2} />}
        </HStack>
        <Text color="gray.400" fontSize="2xs">{handle}</Text>
      </VStack>
    </HStack>
    <Text
      color="gray.300"
      fontSize="2xs"
      whiteSpace="pre-line"
      noOfLines={2}
    >
      {text}
    </Text>
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
      <VStack spacing={4} mb={8} w="full">
        <Text fontSize={{ base: "lg", md: "2xl" }} color="gray.200" fontWeight="semibold" textAlign="center">
          Trusted by 2500+ developers
        </Text>
        <HStack spacing={-2} justify="center">
          {/* Replace these with your actual avatar URLs and names */}
          <Avatar src="https://example.com/avatar1.jpg" name="User 1" />
          <Avatar src="https://example.com/avatar2.jpg" name="User 2" />
          <Avatar src="https://example.com/avatar3.jpg" name="User 3" />
          <Avatar src="https://example.com/avatar4.jpg" name="User 4" />
          <Avatar src="https://example.com/avatar5.jpg" name="User 5" />
          <Avatar src="https://example.com/avatar6.jpg" name="User 6" />
          <Avatar src="https://example.com/avatar7.jpg" name="User 7" />
          <Avatar src="https://example.com/avatar8.jpg" name="User 8" />
          <Avatar src="https://example.com/avatar9.jpg" name="User 9" />
          <Avatar src="https://example.com/avatar10.jpg" name="User 10" />
          <Avatar src="https://example.com/avatar11.jpg" name="User 11" />
          <Avatar src="https://example.com/avatar12.jpg" name="User 12" />
        </HStack>
      </VStack>
      <Flex
        overflowX="auto"
        flexWrap="nowrap"
        sx={{
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
        w="full"
        pb={4}
      >
        <Grid
          templateRows={{ base: '1fr', md: 'repeat(2, 1fr)' }}
          autoFlow="column"
          gap={6}
          minW="600px"
        >
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </Grid>
      </Flex>
    </Box>
  );
};
