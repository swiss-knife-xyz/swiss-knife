import {
  Center,
  Divider,
  Flex,
  HStack,
  IconButton,
  Spacer,
  Text,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { NavItem } from "./NavItem";
import subdomains from "@/subdomains";
import { useState } from "react";

interface MainSidebarProps {
  isNavExpanded: boolean;
  toggleNav: () => void;
}

export const MainSidebar = ({ isNavExpanded, toggleNav }: MainSidebarProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const handleMouseEnter = () => {
    if (!isLocked) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isLocked) {
      setIsHovered(false);
    }
  };

  const handleClick = () => {
    setIsLocked(!isLocked);
    toggleNav();
  };

  const expanded = isLocked || isHovered || isNavExpanded;

  return (
    <Flex
      pos={expanded ? "sticky" : "absolute"}
      mt={4}
      boxShadow={"0 4px 12px 0 rgba(255, 255, 255, 0.2)"}
      w={expanded ? "15rem" : "4rem"}
      flexDir={"column"}
      justifyContent={"space-between"}
      rounded={"lg"}
      roundedLeft={"0"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      transition="width 0.3s, position 0.3s" // Add transition for width and position
    >
      <Flex
        p="3"
        flexDir={"column"}
        alignItems={expanded ? "flex-start" : "center"}
        as="nav"
      >
        <HStack w="full" onClick={handleClick} cursor={"pointer"}>
          <Center w="100%" fontWeight={"bold"}>
            🔨 All Tools
          </Center>
          <Spacer />
          {expanded && (
            <IconButton
              aria-label="Toggle Navigation"
              icon={expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              alignSelf={expanded ? "flex-end" : "center"}
              mb={4}
              variant={"outline"}
            />
          )}
        </HStack>
        {expanded && <Divider mt="4" />}
        {expanded &&
          Object.keys(subdomains).map((key, i) => (
            <NavItem key={i} subdomain={subdomains[key]} />
          ))}
      </Flex>
    </Flex>
  );
};
