import { Link as ChakraLink } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

// Animation keyframes for the underline
const underlineAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Highlighted text component with gradient underline
export const HighlightedText = ({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) => (
  <ChakraLink
    href={href}
    position="relative"
    color="white"
    fontWeight="bold"
    textDecoration="none"
    _after={{
      content: '""',
      position: "absolute",
      width: "100%",
      height: "2px",
      bottom: "-2px",
      left: 0,
      background: "linear-gradient(90deg, #e84142, #ff8a8b, #e84142)",
      backgroundSize: "200% 100%",
      transition: "all 0.3s ease",
      transform: "scaleX(0.95)",
      transformOrigin: "bottom right",
      opacity: 0.7,
    }}
    _hover={{
      textDecoration: "none",
      _after: {
        transform: "scaleX(1)",
        transformOrigin: "bottom left",
        opacity: 1,
        animation: `${underlineAnimation} 2s linear infinite`,
      },
    }}
  >
    {children}
  </ChakraLink>
);
