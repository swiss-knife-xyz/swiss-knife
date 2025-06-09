import { Box, useBreakpointValue, Flex } from "@chakra-ui/react";
import { ConnectButton as RConnectButton } from "@rainbow-me/rainbowkit";

import { ConnectWalletBtn } from "./ConnectWalletBtn";
import { WrongNetworkBtn } from "./WrongNetworkBtn";
import { ChainButton } from "./ChainButton";
import { AccountButton } from "./AccountButton";
import { useSwitchChain } from "wagmi";
import { chainIdToChain } from "@/data/common";

// TODO: make mobile responsive
export const ConnectButton = ({
  expectedChainId,
  hideAccount,
  hideChain,
}: {
  expectedChainId?: number;
  hideAccount?: boolean;
  hideChain?: boolean;
}) => {
  const { switchChain } = useSwitchChain();
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Only hide account if explicitly requested
  const shouldHideAccount = hideAccount;
  const shouldHideChain = hideChain;

  // Determine if we should show a compact version of the buttons
  const isCompact = isMobile;

  return (
    <RConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready: boolean = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return ready ? (
          <Box hidden={!ready}>
            {(() => {
              if (!connected) {
                return <ConnectWalletBtn onClick={openConnectModal} />;
              }

              return (
                <Flex
                  py="0"
                  alignItems="center"
                  borderRadius="xl"
                  flexWrap="nowrap"
                  justifyContent="flex-end"
                  maxW="100%"
                  width="auto"
                >
                  {chain.unsupported ||
                  (expectedChainId && expectedChainId !== chain.id) ? (
                    <Box mr={!shouldHideAccount ? "2" : undefined} w="auto">
                      <WrongNetworkBtn
                        txt={
                          expectedChainId
                            ? `Switch to ${chainIdToChain[expectedChainId]?.name}`
                            : undefined
                        }
                        onClick={() => {
                          if (!expectedChainId) {
                            openChainModal();
                          } else {
                            switchChain({ chainId: expectedChainId });
                          }
                        }}
                        isCompact={isCompact}
                      />
                    </Box>
                  ) : (
                    <Box
                      mr={2}
                      flex={isMobile ? "1" : "initial"}
                      hidden={shouldHideChain}
                    >
                      <ChainButton
                        onClick={openChainModal}
                        chain={chain}
                        isCompact={isCompact}
                      />
                    </Box>
                  )}
                  {!shouldHideAccount && (
                    <Box flex={isMobile ? "1" : "initial"}>
                      <AccountButton
                        onClick={openAccountModal}
                        account={account}
                        isCompact={isCompact}
                      />
                    </Box>
                  )}
                </Flex>
              );
            })()}
          </Box>
        ) : null;
      }}
    </RConnectButton.Custom>
  );
};
