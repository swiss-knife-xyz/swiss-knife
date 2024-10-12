import { ReactNode } from "react";
import { Box, Container, Flex, HStack } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MainSidebar } from "@/components/MainSidebar";

interface LayoutParams {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutParams) => {
  return (
    <Box display="flex" flexDir="column" minHeight="100vh">
      <Box flexGrow={1} overflow="hidden">
        <HStack alignItems="flex-start" spacing={0}>
          <MainSidebar />
          <Flex flexDir="column" flexGrow={1} overflow="hidden">
            <Navbar />
            <Box overflowX="auto" flexGrow={1}>
              <Container mt={12} minW="max-content" px={4}>
                <Flex
                  flexDir="column"
                  mt="0.5rem"
                  p="4"
                  border="1px"
                  borderColor="whiteAlpha.700"
                  borderStyle="dotted"
                  rounded="lg"
                >
                  {children}
                </Flex>
              </Container>
            </Box>
          </Flex>
        </HStack>
      </Box>
      <Footer />
    </Box>
  );
};
