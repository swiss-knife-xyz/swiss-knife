import { Button, ButtonProps } from "@chakra-ui/react";

interface DarkButtonProps extends ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "dark";
}

export const DarkButton = ({
  variant = "dark",
  ...rest
}: DarkButtonProps) => (
  <Button
    variant={variant}
    color="white"
    bg="whiteAlpha.50"
    _hover={{
      bg: "whiteAlpha.200",
      borderColor: "whiteAlpha.400",
    }}
    border="1px solid"
    borderColor="whiteAlpha.200"
    borderRadius="lg"
    fontWeight="medium"
    transition="all 0.2s"
    {...rest}
  >
    {rest.children}
  </Button>
);

// Export Button component with all variants for new usage
export { Button };
