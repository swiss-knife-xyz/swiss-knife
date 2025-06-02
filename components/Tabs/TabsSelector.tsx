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
        minH="3rem"
        px="1.5rem"
        spacing={"8"}
        bg="blackAlpha.400"
        border="1px solid"
        borderColor={"whiteAlpha.500"}
        borderRadius="xl"
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
