import { Button } from "@chakra-ui/react";

type LoadingButtonProps = {
  onClick: (() => void) | undefined;
  disabled: boolean;
  isLoading: boolean;
  loadingText: string;
  defaultText: string;
};

const LoadingButton = ({
  onClick,
  disabled,
  isLoading,
  loadingText,
  defaultText,
}: LoadingButtonProps) => (
  <Button colorScheme="blue" onClick={onClick} disabled={disabled}>
    {isLoading ? (
      <>
        <div className="loading" />
        {loadingText}
      </>
    ) : (
      defaultText
    )}
  </Button>
);

export default LoadingButton;
