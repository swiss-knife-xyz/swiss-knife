import { Box } from "@chakra-ui/react";
import { ConnectButton as RConnectButton } from "@rainbow-me/rainbowkit";

import { ConnectWalletBtn } from "./ConnectWalletBtn";
import { WrongNetworkBtn } from "./WrongNetworkBtn";
import { ChainButton } from "./ChainButton";
import { AccountButton } from "./AccountButton";

// TODO: make mobile responsive
export const ConnectButton = () => {
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
              if (chain.unsupported) {
                return <WrongNetworkBtn onClick={openChainModal} />;
              }

              return (
                <Box
                  display="flex"
                  py="0"
                  alignItems="center"
                  borderRadius="xl"
                >
                  <ChainButton onClick={openChainModal} chain={chain} />
                  <AccountButton onClick={openAccountModal} account={account} />
                </Box>
              );
            })()}
          </Box>
        ) : null;
      }}
    </RConnectButton.Custom>
  );
};
