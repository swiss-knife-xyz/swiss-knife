"use client";

import {
  Box,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { CalldataTree } from "@/components/decodedParams/CalldataTree";
import type { Arg } from "@/types";
import { TraceData } from "./TraceData";

export function TraceReturnValues({
  output,
  outputs,
  chainId,
  resolveAddresses,
}: {
  output: string;
  outputs: Arg[];
  chainId?: number;
  resolveAddresses: boolean;
}) {
  return (
    <Tabs size="sm" isLazy minW={0}>
      <TabList
        borderColor="border.default"
        mb={2}
        aria-label="Return value format"
      >
        <Tab fontSize="xs" px={3}>
          Decoded
        </Tab>
        <Tab fontSize="xs" px={3}>
          Raw
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel p={0}>
          {outputs.length ? (
            <CalldataTree
              rawUnitLabel="Raw"
              resolveAddressMetadata={resolveAddresses}
              args={outputs}
              chainId={chainId}
              showControls={false}
            />
          ) : (
            <Text fontSize="xs" fontFamily="mono">
              ()
            </Text>
          )}
        </TabPanel>
        <TabPanel p={0}>
          <Box minW={0}>
            <TraceData label="Raw return data" value={output} />
          </Box>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
