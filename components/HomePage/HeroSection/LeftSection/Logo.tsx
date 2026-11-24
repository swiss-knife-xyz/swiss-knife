import { Box, Image } from "@chakra-ui/react";

export const Logo = () => {
  return (
    <Box
      p={2}
      position="relative"
      isolation="isolate"
      _before={{
        content: '""',
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: { base: "180vw", md: "1100px", lg: "1300px" },
        height: { base: "1000px", md: "1100px", lg: "1200px" },
        background:
          "radial-gradient(ellipse closest-side, rgba(232, 94, 65, 0.36) 0%, rgba(232, 94, 65, 0.2) 22%, rgba(232, 94, 65, 0.085) 45%, rgba(232, 94, 65, 0.025) 70%, transparent 100%)",
        pointerEvents: "none",
        zIndex: -1,
      }}
      borderRadius={{ base: "1rem", sm: "1.25rem", md: "1.5rem" }}
    >
      <Image
        src="/logo.svg"
        alt="ETH.sh Logo"
        boxSize={{ base: "11rem", sm: "13.75rem", md: "15rem" }}
        objectFit="contain"
        borderRadius={{ base: "0.75rem", sm: "1rem", md: "1.25rem" }}
      />
    </Box>
  );
};
