"use client";

import { Alert, Text, Link, HStack, Center } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

export const NotificationBar = () => {
  return process.env.NEXT_PUBLIC_GITCOIN_GRANTS_ACTIVE === "true" ? (
    <Alert status="info" bg={"blackAlpha.400"}>
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
            <Text>Support on</Text>

            <HStack ml={-0.5} fontWeight="bold">
              <Text>Gitcoin Grants</Text>
              <ExternalLinkIcon />
            </HStack>
          </HStack>
        </Link>
      </Center>
    </Alert>
  ) : null;
};
