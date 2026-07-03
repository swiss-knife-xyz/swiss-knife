import { usePathname } from "next/navigation";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { Box, Flex, Center, Heading, Icon, VStack } from "@chakra-ui/react";
import { getPath } from "@/utils";

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

  const fullPath = `${getPath(subdomain, isRelativePath)}${path}`;
  const targetPath = new URL(fullPath, "https://eth.sh").pathname;
  const rewrittenTargetPath = `/${subdomain}/${path}`;
  const activePaths = Array.from(new Set([targetPath, rewrittenTargetPath]));
  const isActive = activePaths.some((activePath) =>
    exactPathMatch
      ? pathname === activePath
      : pathname.startsWith(activePath) &&
        (pathname === activePath || pathname[activePath.length] === "/")
  );

  return (
    <Flex
      as="button"
      type="button"
      align="center"
      alignSelf="stretch"
      appearance="none"
      textAlign="left"
      px="3"
      py="2.5"
      mx="2"
      minH="44px"
      borderRadius="md"
      cursor="pointer"
      position="relative"
      bg={isActive ? "bg.muted" : "transparent"}
      color={isActive ? "text.primary" : "text.secondary"}
      fontWeight="medium"
      border="1px solid"
      borderColor={isActive ? "border.default" : "transparent"}
      boxShadow={isActive ? "inset 0 1px 0 rgba(255, 255, 255, 0.04)" : "none"}
      transitionProperty="background-color, border-color, color, box-shadow"
      transitionDuration="fast"
      transitionTimingFunction="ease-out"
      aria-current={isActive ? "page" : undefined}
      onClick={() =>
        router.push(`${getPath(subdomain, isRelativePath)}${path}`)
      }
      _hover={{
        bg: isActive ? "bg.muted" : "whiteAlpha.50",
        borderColor: isActive ? "whiteAlpha.200" : "whiteAlpha.100",
        color: "text.primary",
      }}
      _focusVisible={{
        boxShadow: isActive
          ? "0 0 0 1px var(--chakra-colors-primary-400), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
          : "0 0 0 1px var(--chakra-colors-primary-400)",
      }}
    >
      {icon && (
        <Icon
          as={icon}
          mr={3}
          fontSize="md"
          color={isActive ? "text.primary" : "text.tertiary"}
          transition="color 0.15s ease-out"
        />
      )}
      <Box as="span" fontSize="sm" whiteSpace="nowrap">
        {name}
      </Box>
    </Flex>
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
    <Flex
      w="220px"
      flexDir={"column"}
      py={showHeading ? "2rem" : 4}
      minH="100vh"
    >
      <VStack spacing={4} align="stretch">
        {showHeading && (
          <Center
            pb="1rem"
            mb="1rem"
            borderBottom={showBorders ? "1px solid" : "none"}
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
        )}

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
