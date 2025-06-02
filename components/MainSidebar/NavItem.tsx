import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  Flex,
  useDisclosure,
  Text,
  Collapse,
  HStack,
  Box,
  useBreakpointValue,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { Subdomain } from "@/subdomains";
import { getPath } from "@/utils";

const BaseNavItem = ({
  subdomain,
  isBaseActive,
  onToggle,
  displayCollapse,
  isOpen,
  isMobile = false,
}: {
  subdomain: Subdomain;
  isBaseActive: boolean;
  onToggle: () => void;
  displayCollapse: boolean;
  isOpen: boolean;
  isMobile?: boolean;
}) => (
  <Box
    p={isMobile ? 2 : 3}
    w="100%"
    bg={isBaseActive ? "whiteAlpha.100" : ""}
    _hover={{
      textDecor: "none",
      bg: "whiteAlpha.100",
    }}
    cursor={"pointer"}
    onClick={onToggle}
    rounded={"lg"}
  >
    <HStack spacing={isMobile ? 1 : 2}>
      {displayCollapse ? (
        <Text
          fontSize={isMobile ? "md" : "xl"}
          fontWeight={"bold"}
          cursor={"pointer"}
        >
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Text>
      ) : null}
      <Text fontSize={isMobile ? "sm" : "md"}>{subdomain.base}</Text>
    </HStack>
  </Box>
);

export const NavItem = ({ subdomain }: { subdomain: Subdomain }) => {
  const pathname = usePathname();
  const isMobile = useBreakpointValue({ base: true, md: false }) || false;

  const { isOpen, onToggle } = useDisclosure();
  const [isBaseActive, setIsBaseActive] = React.useState(false);

  const displayCollapse =
    subdomain.paths.length > 0 && subdomain.base !== "explorer";

  React.useEffect(() => {
    setIsBaseActive(
      pathname.includes(subdomain.base) ||
        window.location.href.includes(subdomain.base)
    );
  }, [pathname]);

  return (
    <Flex
      mt={isMobile ? 1 : 3}
      flexDir={"column"}
      alignItems={"flex-start"}
      w="100%"
    >
      {displayCollapse ? (
        <BaseNavItem
          subdomain={subdomain}
          isBaseActive={isBaseActive}
          onToggle={onToggle}
          displayCollapse={displayCollapse}
          isOpen={isOpen}
          isMobile={isMobile}
        />
      ) : (
        <Link
          href={getPath(subdomain.base, subdomain.isRelativePath)}
          style={{
            width: "100%",
          }}
        >
          <BaseNavItem
            subdomain={subdomain}
            isBaseActive={isBaseActive}
            onToggle={onToggle}
            displayCollapse={displayCollapse}
            isOpen={isOpen}
            isMobile={isMobile}
          />
        </Link>
      )}
      {displayCollapse && isOpen && (
        <Collapse in={isOpen} animateOpacity style={{ width: "100%" }}>
          <Flex flexDir={"column"} pl={5} mt={1}>
            {subdomain.paths.map((path, i) => {
              const isPathActive =
                pathname.includes(`${subdomain.base}/${path}`) ||
                window.location.href.includes(`${subdomain.base}/${path}`);

              return (
                <Link
                  key={i}
                  href={`${getPath(
                    subdomain.base,
                    subdomain.isRelativePath
                  )}${path}`}
                  style={{
                    width: "100%",
                    padding: "6px 0",
                  }}
                >
                  <Box
                    mt={1}
                    p={isMobile ? 1 : 2}
                    w="100%"
                    bg={isBaseActive && isPathActive ? "whiteAlpha.100" : ""}
                    _hover={{
                      textDecor: "none",
                      bg: "whiteAlpha.100",
                    }}
                    cursor={"pointer"}
                    rounded={"lg"}
                  >
                    <Text fontSize={isMobile ? "xs" : "sm"}>{path}</Text>
                  </Box>
                </Link>
              );
            })}
          </Flex>
        </Collapse>
      )}
    </Flex>
  );
};
