import { Center, HStack, StackProps } from "@chakra-ui/react";
import Tab from "./Tab";

interface Props extends StackProps {
  tabs: string[];
  selectedTabIndex: number;
  setSelectedTabIndex: (value: number) => void;
  mt?: string | number;
}

export default function TabsSelector({
  tabs,
  selectedTabIndex,
  setSelectedTabIndex,
  mt,
  ...props
}: Props) {
  return (
    <Center flexDir="column">
      <HStack
        mt={mt ?? "1rem"}
        minH="2.75rem"
        px="0.375rem"
        spacing={1}
        bg="whiteAlpha.100"
        borderRadius="lg"
        p={1}
        {...props}
      >
        {tabs.map((t, i) => (
          <Tab
            key={i}
            tabIndex={i}
            selectedTabIndex={selectedTabIndex}
            setSelectedTabIndex={setSelectedTabIndex}
          >
            {t}
          </Tab>
        ))}
      </HStack>
    </Center>
  );
}
