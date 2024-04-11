import { ReactNode } from "react";
import { Box, Container, Spacer, Flex, HStack } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MainSidebar } from "@/components/MainSidebar";

interface LayoutParams {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutParams) => {
  return (
    <Box display={"flex"} flexDir={"column"} minHeight="100vh">
      <Box flexGrow={1}>
        <HStack alignItems={"flex-start"}>
          <MainSidebar />
          <Box w="100%">
            <Navbar />
            <Container mt={12} h="100%" minW="70vw">
              <Flex
                flexDir={"column"}
                mt="0.5rem"
                p="4"
                h="full"
                border="1px"
                borderColor={"whiteAlpha.700"}
                borderStyle={"dotted"}
                rounded={"lg"}
              >
                {children}
              </Flex>
            </Container>
          </Box>
        </HStack>
      </Box>
      <Footer />
    </Box>
  );
};
