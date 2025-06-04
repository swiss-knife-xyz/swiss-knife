"use client";

import { useState } from "react";
import { Button, VStack, Flex, Heading } from "@chakra-ui/react";
import VerifySignatures from "./components/VerifySignatures";
import WalletSignatures from "./components/WalletSignatures";
import TabsSelector from "@/components/Tabs/TabsSelector";

enum SignatureComponent {
  verify = "verify",
  sign = "sign",
}

export default function Signatures() {
  const [component, setComponent] = useState<SignatureComponent>(
    SignatureComponent.verify
  );

  const tabs = ["Verify", "Sign"];
  const selectedTabIndex = component === SignatureComponent.verify ? 0 : 1;

  const handleTabChange = (index: number) => {
    setComponent(
      index === 0 ? SignatureComponent.verify : SignatureComponent.sign
    );
  };

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
