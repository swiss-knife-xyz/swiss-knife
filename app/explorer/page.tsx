"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CONTRACT_TABS_STORAGE_KEY } from "@/components/ContractTabs";
import { Layout } from "@/components/Layout";
import ContractStart from "@/components/ContractStart";

const ContractWorkspace = dynamic(() =>
  import("./[chainId]/[address]/ContractPage").then(
    (module) => module.ContractWorkspace
  )
);

export default function ContractPage() {
  const [restoreWorkspace, setRestoreWorkspace] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(CONTRACT_TABS_STORAGE_KEY) ?? "null"
      );
      setRestoreWorkspace(
        saved?.version === 1 &&
          Array.isArray(saved.tabs) &&
          saved.tabs.length > 1
      );
    } catch {
      /* The normal start page remains available without storage. */
    }
  }, []);
  return (
    <Layout minW={0} allowSticky={restoreWorkspace}>
      {restoreWorkspace ? <ContractWorkspace /> : <ContractStart />}
    </Layout>
  );
}
