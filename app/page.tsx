"use client";

import { Box, Spacer } from "@chakra-ui/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MainContainer from "@/components/MainContainer";

export default function Home() {
  return (
    <Box>
      <Navbar />
      <MainContainer>Hello</MainContainer>
      <Spacer />
      <Footer />
    </Box>
  );
}
