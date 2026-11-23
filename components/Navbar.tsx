import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Flex,
  HStack,
  useBreakpointValue,
  Heading,
  Image,
  Link as ChakraLink,
  VStack,
  useDisclosure,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { Github, BookOpen, Network } from "lucide-react";
import { baseURL } from "@/config";
import { ToolsMenu } from "./ToolsMenu";
import { NotificationBar } from "./NotificationBar";
import { useAddressBook } from "@/hooks/useAddressBook";

const CustomChainDrawer = dynamic(() =>
  import("./CustomChainModal").then((module) => module.CustomChainModal)
);

export const Navbar = () => {
  const networks = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { openDrawer } = useAddressBook();

  return (
    <VStack w="100%" spacing={0}>
      {/* Main Navbar */}
      <Flex
        w="100%"
        py={3}
        px={{ base: 4, md: 6 }}
        alignItems="center"
        justifyContent="space-between"
        borderBottom="1px solid"
        borderColor="border.subtle"
        bg="bg.base"
      >
        {/* Logo */}
        <Link href={baseURL}>
          <HStack spacing={{ base: "2", sm: "3" }}>
            <Image
              w={{ base: "2rem", sm: "2.5rem" }}
              h={{ base: "2rem", sm: "2.5rem" }}
              alt="icon"
              src="/icon.png"
              rounded="md"
            />
            <Heading
              color="text.primary"
              fontSize={{ base: "lg", sm: "xl", md: "2xl" }}
              fontWeight="semibold"
              letterSpacing="-0.02em"
            >
              ETH.sh
            </Heading>
          </HStack>
        </Link>

        {/* Right side actions */}
        <HStack spacing={3}>
          {/* GitHub link */}
          <ChakraLink
            href="https://github.com/swiss-knife-xyz/swiss-knife"
            isExternal
            display="flex"
            alignItems="center"
            color="text.secondary"
            _hover={{ color: "text.primary" }}
            transition="color 0.2s"
          >
            <Github size={isMobile ? 20 : 22} />
          </ChakraLink>

          <Tooltip label="Custom networks & RPCs" placement="bottom">
            <IconButton
              aria-label="Manage custom networks and RPCs"
              icon={<Network size={isMobile ? 18 : 20} />}
              variant="ghost"
              color="text.secondary"
              _hover={{ color: "text.primary", bg: "bg.emphasis" }}
              onClick={networks.onOpen}
              size="md"
            />
          </Tooltip>

          {/* Address Book */}
          <Tooltip label="Address Book" placement="bottom">
            <IconButton
              aria-label="Open address book"
              icon={<BookOpen size={isMobile ? 18 : 20} />}
              variant="ghost"
              color="text.secondary"
              _hover={{ color: "text.primary", bg: "bg.emphasis" }}
              onClick={openDrawer}
              size="md"
            />
          </Tooltip>

          <ToolsMenu />
        </HStack>
      </Flex>

      {/* Notification Bar */}
      <NotificationBar />

      {networks.isOpen && (
        <CustomChainDrawer
          presentation="drawer"
          isOpen={networks.isOpen}
          onClose={networks.onClose}
          onSaved={() => {}}
        />
      )}
    </VStack>
  );
};
