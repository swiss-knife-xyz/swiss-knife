import { Button, ButtonProps } from "@chakra-ui/react";

interface DarkButtonProps extends ButtonProps {}

export const DarkButton = ({ ...rest }: DarkButtonProps) => (
  <Button
    color="white"
    bg={"blackAlpha.400"}
    _hover={{
      bg: "blackAlpha.100",
    }}
    border="1px solid"
    borderColor={"whiteAlpha.500"}
    {...rest}
  >
    {rest.children}
  </Button>
);
