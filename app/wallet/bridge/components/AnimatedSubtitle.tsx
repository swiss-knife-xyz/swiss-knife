import { Box, useBreakpointValue } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useEffect, useState, useMemo } from "react";

// Animation keyframes
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeDown = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-20px); }
`;

const blink = keyframes`
  from, to { opacity: 1; }
  50% { opacity: 0; }
`;

export const AnimatedSubtitle = () => {
  const phrases = useMemo(
    () => [
      "Wallet from one Browser to another",
      "Mobile Wallet to any Desktop dapp",
      "Warpcast Wallet to any Desktop dapp",
    ],
    []
  );

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Responsive values
  const fontSize = useBreakpointValue({ base: "sm", sm: "xl", md: "2xl" });
  const containerHeight = useBreakpointValue({
    base: "auto",
    md: "60px",
  });
  const minWidth = useBreakpointValue({
    base: "auto",
    md: "400px",
  });
  const marginRight = useBreakpointValue({ base: 1, md: 2 });
  const textAlign = useBreakpointValue({ base: "center", md: "left" }) as
    | "center"
    | "left";
  const containerPadding = useBreakpointValue({ base: 2, md: 3 });

  // Typing effect
  useEffect(() => {
    if (!isTyping) return;

    const currentPhrase = phrases[currentPhraseIndex];

    if (displayText.length < currentPhrase.length) {
      const typingTimer = setTimeout(() => {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1));
      }, 50); // Adjust typing speed here

      return () => clearTimeout(typingTimer);
    } else {
      // Finished typing, wait before transitioning
      const pauseTimer = setTimeout(() => {
        setIsTyping(false);
        setIsAnimating(true);
      }, 1000); // Wait 1 second after typing completes

      return () => clearTimeout(pauseTimer);
    }
  }, [displayText, currentPhraseIndex, isTyping, phrases]);

  // Handle transition to next phrase
  useEffect(() => {
    if (!isAnimating) return;

    const transitionTimer = setTimeout(() => {
      setDisplayText("");
      setCurrentPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
      setIsTyping(true);
      setIsAnimating(false);
    }, 500); // Duration of fade animation

    return () => clearTimeout(transitionTimer);
  }, [isAnimating, phrases.length]);

  return (
    <Box
      fontSize={fontSize}
      fontWeight={"bold"}
      minHeight={containerHeight}
      position="relative"
      display="flex"
      flexDirection="row"
      alignItems="center"
      justifyContent={textAlign === "center" ? "center" : "flex-start"}
      width="100%"
      py={containerPadding}
      textAlign={textAlign}
      flexWrap="wrap"
    >
      <Box
        mr={marginRight}
        display="inline-flex"
        alignItems="center"
        whiteSpace="nowrap"
      >
        Connect
      </Box>
      <Box
        position="relative"
        minHeight="2em"
        minWidth={minWidth}
        display="inline-flex"
        alignItems="center"
        height="100%"
        flexGrow={1}
        flexShrink={1}
      >
        <Box
          position="absolute"
          top="50%"
          left={0}
          transform="translateY(-50%)"
          animation={isAnimating ? `${fadeDown} 0.5s forwards` : "none"}
          visibility={isAnimating ? "visible" : "hidden"}
          whiteSpace={{ base: "normal", md: "nowrap" }}
          width="100%"
          lineHeight={{ base: "1.5", md: "normal" }}
        >
          {phrases[currentPhraseIndex]}
        </Box>

        <Box
          position="absolute"
          top="50%"
          left={0}
          transform="translateY(-50%)"
          animation={isAnimating ? `${fadeUp} 0.5s forwards` : "none"}
          visibility={!isAnimating ? "visible" : "hidden"}
          whiteSpace={{ base: "normal", md: "nowrap" }}
          width="100%"
          lineHeight={{ base: "1.5", md: "normal" }}
        >
          {displayText}
          {isTyping && (
            <Box as="span" animation={`${blink} 1s step-end infinite`}>
              |
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
