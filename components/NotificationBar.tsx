"use client";

import {
  Alert,
  Text,
  Link,
  HStack,
  Center,
  useBreakpointValue,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

export const NotificationBar = () => {
  const fontSize = useBreakpointValue({ base: "xs", sm: "sm", md: "xs" });
  const padding = useBreakpointValue({ base: 2, sm: 2, md: 3 });

  return process.env.NEXT_PUBLIC_GITCOIN_GRANTS_ACTIVE === "true" ? (
    <Alert
      status="info"
      bg={"blackAlpha.400"}
      py={padding}
      px={4}
      borderBottom="1px solid"
      borderColor="whiteAlpha.200"
      w="100%"
      borderRadius={0}
      margin={0}
    >
      <Center w="100%">
        <Link
          href={process.env.NEXT_PUBLIC_GITCOIN_GRANTS_LINK}
          isExternal
          _hover={{
            textDecor: "none",
          }}
        >
          <HStack
            position="relative"
            sx={{
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "2px",
                background: "linear-gradient(90deg, #FF0080, #7928CA, #FF0080)",
                backgroundSize: "200% 100%",
                animation: "gradient 3s linear infinite",
                "@keyframes gradient": {
                  "0%": { backgroundPosition: "0% 0%" },
                  "100%": { backgroundPosition: "200% 0%" },
                },
              },
            }}
          >
            <Text fontSize={fontSize}>Donate on</Text>

            <HStack ml={-0.5} fontWeight="bold">
              <Text fontSize={fontSize}>Giveth</Text>
              <ExternalLinkIcon fontSize={fontSize} />
            </HStack>
          </HStack>
        </Link>
      </Center>
    </Alert>
  ) : null;
};
