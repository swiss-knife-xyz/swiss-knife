"use client";

import { useState, useCallback, useEffect } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import VerifySignatures from "./components/VerifySignatures";
import WalletSignatures from "./components/WalletSignatures";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { useRouter, usePathname } from "next/navigation";

enum SignatureComponent {
  verify = "verify",
  sign = "sign",
}

export default function Signatures() {
  const [component, setComponent] = useState<SignatureComponent>(
    SignatureComponent.verify
  );
  const router = useRouter();
  const pathname = usePathname();

  const tabs = ["Verify", "Sign"];
  const selectedTabIndex = component === SignatureComponent.verify ? 0 : 1;

  // Handle URL hash changes and initial load
  useEffect(() => {
    const handleRouteChange = () => {
      const hash = window.location.hash.substring(1);
      // Extract just the hash part before any query parameters
      const hashBeforeParams = hash.split("?")[0];
      if (hashBeforeParams === "sign") {
        setComponent(SignatureComponent.sign);
      } else {
        setComponent(SignatureComponent.verify);
      }
    };

    // Set initial tab based on URL hash
    handleRouteChange();

    // Listen for hash changes
    const handleHashChange = () => {
      handleRouteChange();
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const handleTabChange = useCallback(
    (index: number) => {
      const newComponent =
        index === 0 ? SignatureComponent.verify : SignatureComponent.sign;
      setComponent(newComponent);

      // Preserve any existing query parameters
      const currentHash = window.location.hash.substring(1);
      const queryParams = currentHash.includes("?")
        ? currentHash.split("?")[1]
        : "";

      if (newComponent === SignatureComponent.sign) {
        const newHash = queryParams ? `sign?${queryParams}` : "sign";
        router.push(`${pathname}#${newHash}`);
      } else {
        // For verify tab, we don't need to preserve query params as they're not used
        router.push(pathname);
      }
    },
    [router, pathname]
  );

  return (
    <Box maxW="700px" mx="auto" w="full">
      {/* Header */}
      <Box mb={6} textAlign="center">
        <Heading size="lg" color="gray.100" fontWeight="bold" letterSpacing="tight">
          Signatures
        </Heading>
        <Text color="gray.400" fontSize="md" mt={2}>
          Verify or sign messages and typed data
        </Text>
      </Box>

      <Box
        p={5}
        bg="whiteAlpha.50"
        borderRadius="lg"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <TabsSelector
          tabs={tabs}
          selectedTabIndex={selectedTabIndex}
          setSelectedTabIndex={handleTabChange}
          mb={5}
        />
        {component === SignatureComponent.verify ? (
          <VerifySignatures />
        ) : component === SignatureComponent.sign ? (
          <WalletSignatures />
        ) : null}
      </Box>
    </Box>
  );
}
