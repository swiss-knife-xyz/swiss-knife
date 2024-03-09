import { ReactNode } from "react";
import { Box, Container, Spacer, Flex } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface LayoutParams {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutParams) => {
  return (
    <Box display={"flex"} flexDir={"column"} minHeight="100vh">
      <Box flexGrow={1}>
        <Navbar />
        <Container mt="8" minW="70vw">
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
      <Footer />
    </Box>
  );
};
