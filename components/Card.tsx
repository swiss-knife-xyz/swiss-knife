import { Box, BoxProps } from "@chakra-ui/react";
import { ReactNode } from "react";

interface CardProps extends BoxProps {
  children: ReactNode;
  variant?: "elevated" | "outline" | "filled" | "interactive";
}

export const Card = ({
  children,
  variant = "elevated",
  ...props
}: CardProps) => {
  const variantStyles = {
    elevated: {
      bg: "bg.subtle",
      border: "1px solid",
      borderColor: "border.subtle",
      boxShadow: "md",
      _hover: {
        borderColor: "border.default",
        transform: "translateY(-2px)",
        boxShadow: "lg",
      },
    },
    outline: {
      bg: "transparent",
      border: "1px solid",
      borderColor: "border.default",
      _hover: {
        borderColor: "border.strong",
      },
    },
    filled: {
      bg: "bg.muted",
      border: "1px solid",
      borderColor: "transparent",
    },
    interactive: {
      bg: "bg.subtle",
      border: "1px solid",
      borderColor: "border.subtle",
      cursor: "pointer",
      _hover: {
        borderColor: "primary.500",
        transform: "translateY(-2px)",
        boxShadow: "lg",
      },
    },
  };

  return (
    <Box
      borderRadius="xl"
      p={6}
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      {...variantStyles[variant]}
      {...props}
    >
      {children}
    </Box>
  );
};

export default Card;
