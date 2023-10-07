"use client";

import { useRouter, usePathname } from "next/navigation";
import { Box, Flex, HStack, Center, Heading } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

interface NavItemProps {
  name: string;
  path: string;
}
const LinkItems: Array<NavItemProps> = [
  { name: "ETH", path: "eth" },
  { name: "Hexadecimal", path: "hexadecimal" },
  { name: "Keccak256", path: "keccak256" },
];

const NavItem = ({ name, path }: NavItemProps) => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Box
      my={1}
      onClick={() => router.push(`${getPath(subdomains.CONVERTER)}${path}`)}
    >
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        _hover={{
          bg: "blue.200",
          color: "gray.700",
        }}
        bg={pathname.includes(path) ? "blue.200" : undefined}
        color={pathname.includes(path) ? "gray.700" : undefined}
      >
        {name}
      </Flex>
    </Box>
  );
};

const SidebarContent = () => {
  return (
    <Box py={"3rem"} borderRight="1px" borderColor={"whiteAlpha.400"} h="full">
      <Center
        pb="1rem"
        borderBottom="1px"
        borderColor={"whiteAlpha.400"}
        roundedLeft={"lg"}
      >
        <Heading size="lg" px="4" color={"green.200"}>
          Converters
        </Heading>
      </Center>
      <Box mt="1rem">
        {LinkItems.map((link) => (
          <NavItem key={link.name} name={link.name} path={link.path} />
        ))}
      </Box>
    </Box>
  );
};

const ConverterLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack>
        <SidebarContent />
        <Center flexDir={"column"} w="full">
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};

export default ConverterLayout;
