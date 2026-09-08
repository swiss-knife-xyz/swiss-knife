"use client";

import { Box } from "@chakra-ui/react";
import { HomePageNavBar } from "@/components/HomePage/HomePageNavBar";
import { HeroSection } from "@/components/HomePage/HeroSection";
import { ToolsGrid } from "@/components/HomePage/ToolsGrid";
import { TestimonialSection } from "@/components/HomePage/TestimonialSection";
import { SupportersPage } from "@/components/HomePage/SupportersPage";
import { Footer } from "@/components/Footer";

const Home = () => {
  return (
    <Box minH="100vh" bg="bg.900">
      <HomePageNavBar />
      <HeroSection />
      <ToolsGrid />
      <TestimonialSection />
      <SupportersPage />
      <Footer />
    </Box>
  );
};

export default Home;
