import { Box } from "@chakra-ui/react";
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
}: {
  expectedChainId?: number;
  hideAccount?: boolean;
}) => {
  const { switchChain } = useSwitchChain();

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
                <Box
                  display="flex"
                  py="0"
                  alignItems="center"
                  borderRadius="xl"
                >
                  {chain.unsupported ||
                  (expectedChainId && expectedChainId !== chain.id) ? (
                    <Box mr={!hideAccount ? "2" : undefined}>
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
                      />
                    </Box>
                  ) : (
                    <ChainButton onClick={openChainModal} chain={chain} />
                  )}
                  {!hideAccount && (
                    <AccountButton
                      onClick={openAccountModal}
                      account={account}
                    />
                  )}
                </Box>
              );
            })()}
          </Box>
        ) : null;
      }}
    </RConnectButton.Custom>
  );
};
