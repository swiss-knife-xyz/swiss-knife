"use client";

import Link from "next/link";
import { Box, Button, Spacer } from "@chakra-ui/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MainContainer from "@/components/MainContainer";
import { getPath } from "@/utils";

export default function Home() {
  return (
    <Box>
      <Navbar />
      <MainContainer>
        <Link href={getPath("constants")}>
          <Button>Constants</Button>
        </Link>
      </MainContainer>
      <Spacer />
      <Footer />
    </Box>
  );
}
