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
  const isSelected = tabIndex === selectedTabIndex;

  return (
    <HStack
      px={4}
      py={2}
      fontWeight="medium"
      fontSize="sm"
      color={isSelected ? "white" : "whiteAlpha.700"}
      bg={isSelected ? "whiteAlpha.200" : "transparent"}
      borderRadius="md"
      role="group"
      _hover={{
        color: "white",
        bg: isSelected ? "whiteAlpha.200" : "whiteAlpha.100",
      }}
      cursor="pointer"
      onClick={() => setSelectedTabIndex(tabIndex)}
      transition="all 0.2s"
    >
      <Box>{children}</Box>
    </HStack>
  );
}
