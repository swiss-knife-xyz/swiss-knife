"use client";

import Link from "next/link";
import { Box, Button, Spacer } from "@chakra-ui/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MainContainer from "@/components/MainContainer";

export default function Home() {
  return (
    <Box>
      <Navbar />
      <MainContainer>
        <Link href="/constants">
          <Button>Constants</Button>
        </Link>
      </MainContainer>
      <Spacer />
      <Footer />
    </Box>
  );
}
