import { Box } from "@chakra-ui/react";

export const BackgroundBlur = () => {
  return (
    <Box
      position="absolute"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bgImage="url('/icon.png')"
      bgSize="cover"
      bgPosition="center"
      filter="blur(100px) opacity(0.15)"
      zIndex="0"
    />
  );
};
