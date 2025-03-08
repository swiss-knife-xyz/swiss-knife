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
          href={getPath(subdomain.base)}
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
      <Collapse in={isOpen} animateOpacity style={{ width: "100%" }}>
        {displayCollapse ? (
          <Box
            ml={isMobile ? 3 : 5}
            pl={isMobile ? 2 : 4}
            borderLeft={"1px solid"}
            borderColor={"whiteAlpha.300"}
          >
            {subdomain.paths.map((path, i) => (
              <Link
                key={i}
                href={`${getPath(subdomain.base)}${path}`}
                style={{
                  width: "100%",
                }}
              >
                <Box
                  mt={1}
                  p={isMobile ? 1 : 2}
                  w="100%"
                  bg={
                    isBaseActive &&
                    (pathname.includes(path) ||
                      window.location.href.includes(path))
                      ? "whiteAlpha.100"
                      : ""
                  }
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
            ))}
          </Box>
        ) : null}
      </Collapse>
    </Flex>
  );
};
