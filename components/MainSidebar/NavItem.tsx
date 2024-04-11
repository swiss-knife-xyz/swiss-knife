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
}: {
  subdomain: Subdomain;
  isBaseActive: boolean;
  onToggle: () => void;
  displayCollapse: boolean;
  isOpen: boolean;
}) => (
  <Box
    p={3}
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
    <HStack>
      {displayCollapse ? (
        <Text fontSize={"xl"} fontWeight={"bold"} cursor={"pointer"}>
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Text>
      ) : null}
      <Text>{subdomain.base}</Text>
    </HStack>
  </Box>
);

export const NavItem = ({ subdomain }: { subdomain: Subdomain }) => {
  const pathname = usePathname();

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
    <Flex mt={3} flexDir={"column"} alignItems={"flex-start"} w="100%">
      {displayCollapse ? (
        <BaseNavItem
          subdomain={subdomain}
          isBaseActive={isBaseActive}
          onToggle={onToggle}
          displayCollapse={displayCollapse}
          isOpen={isOpen}
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
          />
        </Link>
      )}
      <Collapse in={isOpen} animateOpacity style={{ width: "100%" }}>
        {displayCollapse ? (
          <Box
            ml={5}
            pl={4}
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
                  p={2}
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
                  {path}
                </Box>
              </Link>
            ))}
          </Box>
        ) : null}
      </Collapse>
    </Flex>
  );
};
