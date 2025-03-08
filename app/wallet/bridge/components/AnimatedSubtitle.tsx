import { Box } from "@chakra-ui/react";
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
      fontSize={"2xl"}
      fontWeight={"bold"}
      height="60px"
      position="relative"
      display="flex"
    >
      <Box mr={2}>Connect</Box>
      <Box position="relative" height="100%" minWidth="400px">
        <Box
          position="absolute"
          animation={isAnimating ? `${fadeDown} 0.5s forwards` : "none"}
          visibility={isAnimating ? "visible" : "hidden"}
          whiteSpace="nowrap"
          width="100%"
        >
          {phrases[currentPhraseIndex]}
        </Box>

        <Box
          position="absolute"
          animation={isAnimating ? `${fadeUp} 0.5s forwards` : "none"}
          visibility={!isAnimating ? "visible" : "hidden"}
          whiteSpace="nowrap"
          width="100%"
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
