import { useRouter, usePathname } from "next/navigation";
import { Box, Flex, Center, Heading } from "@chakra-ui/react";
import { getPath } from "@/utils";

export interface SidebarItem {
  name: string;
  path: string;
  exactPathMatch?: boolean;
}

export interface SidebarItemProps extends SidebarItem {
  subdomain: string;
}

const SidebarItem = ({
  name,
  subdomain,
  path,
  exactPathMatch,
}: SidebarItemProps) => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Box my={1} onClick={() => router.push(`${getPath(subdomain)}${path}`)}>
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
        bg={
          (
            exactPathMatch
              ? pathname === `${getPath(subdomain)}${path}`
              : pathname.includes(path)
          )
            ? "blue.200"
            : undefined
        }
        color={
          (
            exactPathMatch
              ? pathname === `${getPath(subdomain)}${path}`
              : pathname.includes(path)
          )
            ? "gray.700"
            : undefined
        }
      >
        {name}
      </Flex>
    </Box>
  );
};

export const Sidebar = ({
  heading,
  items,
  subdomain,
  exactPathMatch,
}: {
  heading: string;
  items: SidebarItem[];
  subdomain: string;
  exactPathMatch?: boolean;
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
          <SidebarItem
            key={item.name}
            subdomain={subdomain}
            exactPathMatch={exactPathMatch}
            {...item}
          />
        ))}
      </Box>
    </Flex>
  );
};
