"use client";

import { use } from "react";

import { Box } from "@chakra-ui/react";
import { ExplorerGridBase } from "@/components/explorer/ExplorerGridBase";
import { txExplorers } from "@/data/txExplorers";
import { ExplorerType } from "@/types";

const Tx = ({
  params,
}: {
  params: Promise<{
    tx: string;
  }>;
}) => {
  const { tx } = use(params);
  return (
    <Box w="full" maxW="1200px" mx="auto">
      <ExplorerGridBase
        explorersData={txExplorers}
        explorerType={ExplorerType.TX}
        addressOrTx={tx}
      />
    </Box>
  );
};

export default Tx;
