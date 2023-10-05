"use client";

import { ExplorerGridBase } from "@/components/explorer/ExplorerGridBase";
import { txExplorers } from "@/data/txExplorers";
import { ExplorerType } from "@/types";

const Tx = ({
  params: { tx },
}: {
  params: {
    tx: string;
  };
}) => {
  return (
    <ExplorerGridBase
      explorersData={txExplorers}
      explorerType={ExplorerType.TX}
      addressOrTx={tx}
    />
  );
};

export default Tx;
