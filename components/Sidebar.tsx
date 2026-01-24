import { usePathname } from "next/navigation";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { Box, Flex, Center, Heading, Icon, VStack } from "@chakra-ui/react";
import { getPath } from "@/utils";
import { useState } from "react";

export interface SidebarItem {
  name: string;
  path: string;
  exactPathMatch?: boolean;
  icon?: React.ComponentType;
}

export interface SidebarItemProps extends SidebarItem {
  subdomain: string;
  isRelativePath?: boolean;
}

const SidebarItem = ({
  name,
  subdomain,
  path,
  exactPathMatch,
  isRelativePath,
  icon,
}: SidebarItemProps) => {
  const router = useTopLoaderRouter();
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  const fullPath = `${getPath(subdomain, isRelativePath)}${path}`;
  const isActive = exactPathMatch
    ? pathname === fullPath
    : pathname.startsWith(fullPath) &&
      (pathname === fullPath || pathname[fullPath.length] === "/");

  return (
    <Box
      w="full"
      onClick={() =>
        router.push(`${getPath(subdomain, isRelativePath)}${path}`)
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Flex
        align="center"
        p="3"
        mx="2"
        borderRadius="lg"
        cursor="pointer"
        position="relative"
        transition="all 0.2s ease"
        bg={
          isActive
            ? "whiteAlpha.200"
            : isHovered
              ? "whiteAlpha.100"
              : "transparent"
        }
        color={isActive ? "white" : isHovered ? "gray.200" : "gray.400"}
        fontWeight={isActive ? "semibold" : "medium"}
        borderLeft="3px solid"
        borderLeftColor={isActive ? "blue.400" : "transparent"}
        _hover={{
          transform: "translateX(2px)",
        }}
      >
        {icon && (
          <Icon
            as={icon}
            mr={3}
            fontSize="md"
            color={isActive ? "blue.300" : "gray.500"}
            transition="color 0.2s ease"
          />
        )}
        <Box fontSize="sm" whiteSpace="nowrap">
          {name}
        </Box>
      </Flex>
    </Box>
  );
};

export const Sidebar = ({
  heading,
  items,
  subdomain,
  exactPathMatch,
  isRelativePath,
  showBorders = true,
  showHeading = true,
}: {
  heading: string;
  items: SidebarItem[];
  subdomain: string;
  exactPathMatch?: boolean;
  isRelativePath?: boolean;
  showBorders?: boolean;
  showHeading?: boolean;
}) => {
  return (
    <Flex w="220px" flexDir={"column"} py={"2rem"} minH="100vh">
      <VStack spacing={4} align="stretch">
        <Center
          pb="1rem"
          mb="1rem"
          borderBottom="1px solid"
          borderBottomColor="whiteAlpha.200"
        >
          <Heading
            size="md"
            bgGradient="linear(to-r, white, white)"
            bgClip="text"
            fontWeight="bold"
            textAlign="center"
          >
            {heading}
          </Heading>
        </Center>

        <VStack spacing={1} align="stretch" px={2}>
          {items.map((item) => (
            <SidebarItem
              key={item.name}
              subdomain={subdomain}
              exactPathMatch={exactPathMatch}
              isRelativePath={isRelativePath}
              {...item}
            />
          ))}
        </VStack>
      </VStack>
    </Flex>
  );
};
