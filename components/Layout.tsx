import { ReactNode } from "react";
import { Box, Container, Spacer, Flex } from "@chakra-ui/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface LayoutParams {
  children: ReactNode;
}

export default function Layout({ children }: LayoutParams) {
  return (
    <Box>
      <Navbar />
      <Container mt="8" minW="70vw">
        <Flex
          flexDir={"column"}
          mt="0.5rem"
          p="4"
          minH="70vh"
          border="1px"
          borderColor={"custom.pale"}
          rounded={"lg"}
        >
          {children}
        </Flex>
      </Container>
      <Spacer />
      <Footer />
    </Box>
  );
}
