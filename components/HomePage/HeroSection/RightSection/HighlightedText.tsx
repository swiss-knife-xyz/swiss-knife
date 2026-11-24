import { Link as ChakraLink } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

// Animation keyframes for the underline
const underlineAnimation = keyframes`
  0% { background-position: 0% 100%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 100%; }
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
    color="white"
    fontWeight="bold"
    textDecoration="none"
    backgroundImage="linear-gradient(90deg, rgba(232, 65, 66, 0.7), rgba(255, 138, 139, 0.7), rgba(232, 65, 66, 0.7))"
    backgroundSize="200% 2px"
    backgroundPosition="0% 100%"
    backgroundRepeat="no-repeat"
    paddingBottom="2px"
    sx={{
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
      "@media (prefers-reduced-motion: reduce)": {
        animation: "none !important",
      },
    }}
    _hover={{
      textDecoration: "none",
      backgroundImage: "linear-gradient(90deg, #e84142, #ff8a8b, #e84142)",
      animation: `${underlineAnimation} 2s linear infinite`,
    }}
  >
    {children}
  </ChakraLink>
);
