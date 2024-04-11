import { useState } from "react";
import { Center, Divider, Flex, Text } from "@chakra-ui/react";
import { HamburgerIcon, Search2Icon } from "@chakra-ui/icons";
import { NavItem } from "./NavItem";
import subdomains from "@/subdomains";

export const MainSidebar = () => {
  const [isNavExpanded, _] = useState(true);

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
        <Center mt="5" w="100%" fontWeight={"bold"}>
          🔨 All Tools
        </Center>
        <Divider mt="4" />
        {Object.keys(subdomains).map((key, i) => (
          <NavItem key={i} subdomain={subdomains[key]} />
        ))}
      </Flex>
    </Flex>
  );
};
