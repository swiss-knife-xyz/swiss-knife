"use client";

import { Box } from "@chakra-ui/react";
import { HomePageNavBar } from "@/components/HomePage/HomePageNavBar";
import { HeroSection } from "@/components/HomePage/HeroSection";
import { ToolsGrid } from "@/components/HomePage/ToolsGrid";
import { Footer } from "@/components/Footer";
import { TestimonialSection } from "@/components/HomePage/TestimonialSection/Index";

const Home = () => {
  return (
    <Box minH="100vh" bg="bg.900">
      <HomePageNavBar />
      <HeroSection />
      <ToolsGrid />
      <TestimonialSection />
      <Footer />
    </Box>
  );
};

export default Home;
