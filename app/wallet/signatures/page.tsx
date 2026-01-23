"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, VStack, Flex, Heading } from "@chakra-ui/react";
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
    <VStack>
      <Heading>Signatures</Heading>
      <TabsSelector
        tabs={tabs}
        selectedTabIndex={selectedTabIndex}
        setSelectedTabIndex={handleTabChange}
        mb="1rem"
      />
      {component === SignatureComponent.verify ? (
        <VerifySignatures />
      ) : component === SignatureComponent.sign ? (
        <WalletSignatures />
      ) : null}
    </VStack>
  );
}
