"use client";

import { ExplorerGridBase } from "@/components/explorer/ExplorerGridBase";
import { addressExplorers } from "@/data/addressExplorers";
import { ExplorerType } from "@/types";

const Address = ({
  params: { address },
}: {
  params: {
    address: string;
  };
}) => {
  return (
    <ExplorerGridBase
      explorersData={addressExplorers}
      explorerType={ExplorerType.ADDRESS}
      addressOrTx={address}
    />
  );
};

export default Address;
