import { Box, HStack } from "@chakra-ui/react";

interface Props {
  children: React.ReactNode;
  tabIndex: number;
  selectedTabIndex: number;
  setSelectedTabIndex: (value: number) => void;
}

export default function Tab({
  children,
  tabIndex,
  selectedTabIndex,
  setSelectedTabIndex,
}: Props) {
  return (
    <HStack
      fontWeight={tabIndex === selectedTabIndex ? "bold" : "semibold"}
      color={tabIndex === selectedTabIndex ? "white" : "whiteAlpha.700"}
      role="group"
      _hover={{
        color: "whiteAlpha.900",
      }}
      cursor="pointer"
      onClick={() => setSelectedTabIndex(tabIndex)}
    >
      <Box>{children}</Box>
    </HStack>
  );
}
