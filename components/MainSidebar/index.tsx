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

interface MainSidebarProps {
  isNavExpanded: boolean;
  toggleNav: () => void;
}

export const MainSidebar = ({ isNavExpanded, toggleNav }: MainSidebarProps) => {
  return (
    <Flex
      pos={"sticky"}
      mt={4}
      boxShadow={"0 4px 12px 0 rgba(255, 255, 255, 0.2)"}
      w={isNavExpanded ? "15rem" : "4rem"}
      flexDir={"column"}
      justifyContent={"space-between"}
      rounded={"lg"}
      roundedLeft={"0"}
    >
      <Flex
        p="3"
        flexDir={"column"}
        alignItems={isNavExpanded ? "flex-start" : "center"}
        as="nav"
      >
        <HStack w="full" onClick={toggleNav} cursor={"pointer"}>
          <Center w="100%" fontWeight={"bold"}>
            🔨 All Tools
          </Center>
          <Spacer />
          {isNavExpanded && (
            <IconButton
              aria-label="Toggle Navigation"
              icon={isNavExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              alignSelf={isNavExpanded ? "flex-end" : "center"}
              mb={4}
              variant={"outline"}
            />
          )}
        </HStack>
        {isNavExpanded && <Divider mt="4" />}
        {isNavExpanded &&
          Object.keys(subdomains).map((key, i) => (
            <NavItem key={i} subdomain={subdomains[key]} />
          ))}
      </Flex>
    </Flex>
  );
};
