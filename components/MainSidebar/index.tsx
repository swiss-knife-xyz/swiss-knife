import {
  Center,
  Divider,
  Flex,
  HStack,
  IconButton,
  Spacer,
  Text,
  useBreakpointValue,
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

  // Use breakpoint to determine if we're on mobile
  const isMobile = useBreakpointValue({ base: true, md: false });

  const handleMouseEnter = () => {
    if (!isLocked && !isMobile) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isLocked && !isMobile) {
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
      pos={isMobile ? "relative" : expanded ? "sticky" : "absolute"}
      mt={isMobile ? 0 : 4}
      boxShadow={isMobile ? "none" : "0 4px 12px 0 rgba(255, 255, 255, 0.2)"}
      w={isMobile ? "100%" : expanded ? "15rem" : "4rem"}
      flexDir={"column"}
      justifyContent={"space-between"}
      rounded={isMobile ? "none" : "lg"}
      roundedLeft={isMobile ? "none" : "0"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      transition="width 0.3s, position 0.3s"
      zIndex="1"
      borderBottom={isMobile ? "1px solid" : "none"}
      borderColor={isMobile ? "whiteAlpha.200" : "transparent"}
      bg={isMobile ? "blackAlpha.300" : "transparent"}
    >
      <Flex
        p={isMobile ? "2" : "3"}
        flexDir={"column"}
        alignItems={expanded || isMobile ? "flex-start" : "center"}
        as="nav"
        width="100%"
      >
        <HStack
          w="full"
          onClick={handleClick}
          cursor={"pointer"}
          py={isMobile ? 1 : 0}
        >
          <Center w="100%" fontWeight={"bold"}>
            🔨 All Tools
          </Center>
          <Spacer />
          {(expanded || isMobile) && (
            <IconButton
              aria-label="Toggle Navigation"
              icon={expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              alignSelf={expanded ? "flex-end" : "center"}
              mb={isMobile ? 0 : 4}
              variant={"outline"}
              size={isMobile ? "sm" : "md"}
            />
          )}
        </HStack>
        {(expanded || isMobile) && <Divider mt={isMobile ? "2" : "4"} />}
        {(expanded || isMobile) && (
          <Flex
            direction="column"
            w="100%"
            maxH={isMobile ? "200px" : "none"}
            overflowY={isMobile ? "auto" : "visible"}
            pt={2}
          >
            {Object.keys(subdomains).map((key, i) => (
              <NavItem key={i} subdomain={subdomains[key]} />
            ))}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
