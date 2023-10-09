import { useRouter, usePathname } from "next/navigation";
import { Box, Flex, Center, Heading } from "@chakra-ui/react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

export interface SidebarItemProps {
  name: string;
  path: string;
}

const SidebarItem = ({ name, path }: SidebarItemProps) => {
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

export const Sidebar = ({
  heading,
  items,
}: {
  heading: string;
  items: SidebarItemProps[];
}) => {
  return (
    <Flex
      flex={1}
      flexDir={"column"}
      py={"3rem"}
      borderRight="1px"
      borderColor={"whiteAlpha.400"}
    >
      <Center
        pb="1rem"
        borderBottom="1px"
        borderColor={"whiteAlpha.400"}
        roundedLeft={"lg"}
      >
        <Heading size="lg" px="4" color={"green.200"}>
          {heading}
        </Heading>
      </Center>
      <Box mt="1rem">
        {items.map((item) => (
          <SidebarItem key={item.name} name={item.name} path={item.path} />
        ))}
      </Box>
    </Flex>
  );
};
