import {
  Button,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { WriteButtonType } from "./fnParams/ReadWriteFunction";
import { Chain } from "viem";
import { ConnectButton } from "./ConnectButton";
import { JsonFragmentType } from "ethers";
import { ChevronDownIcon } from "@chakra-ui/icons";

export const WriteButton = ({
  isError,
  userAddress,
  writeButtonType,
  chain,
  chainId,
  writeFunction,
  callAsReadFunction,
  simulateOnTenderly,
  isDisabled,
  loading,
  setWriteButtonType,
  setIsError,
}: {
  isError: boolean;
  userAddress: string | undefined;
  writeButtonType: WriteButtonType;
  chain: Chain | undefined;
  chainId: number;
  writeFunction: () => void;
  callAsReadFunction: () => void;
  simulateOnTenderly: () => void;
  isDisabled: boolean;
  loading: boolean;
  setWriteButtonType: (writeButtonType: WriteButtonType) => void;
  setIsError: (isError: boolean) => void;
}) => {
  return (
    <HStack bg={!isError ? "blue.200" : "red.200"} rounded="lg" spacing={0}>
      {(!userAddress && writeButtonType === WriteButtonType.Write) ||
      (chain && chain.id !== chainId) ? (
        <ConnectButton expectedChainId={chainId} hideAccount />
      ) : (
        <Button
          px={4}
          onClick={
            writeButtonType === WriteButtonType.Write
              ? writeFunction
              : writeButtonType === WriteButtonType.CallAsViewFn
              ? () => callAsReadFunction()
              : simulateOnTenderly
          }
          isDisabled={isDisabled}
          isLoading={loading}
          size={"sm"}
          title={"write"}
          colorScheme={!isError ? "blue" : "red"}
        >
          {writeButtonType}
        </Button>
      )}
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label="Options"
          icon={<ChevronDownIcon />}
          variant="outline"
          size={"xs"}
          color="blue.800"
          borderLeftColor="blue.800"
          borderLeftRadius={0}
        />
        <MenuList bg="gray.800">
          <MenuItem
            color="white"
            bg="gray.800"
            _hover={{ bg: "gray.700" }}
            onClick={() => {
              setWriteButtonType(WriteButtonType.Write);
              setIsError(false);
            }}
          >
            Write
          </MenuItem>
          <MenuItem
            color="white"
            bg="gray.800"
            _hover={{ bg: "gray.700" }}
            onClick={() => {
              setWriteButtonType(WriteButtonType.CallAsViewFn);
              setIsError(false);
            }}
          >
            Call as View Fn
          </MenuItem>
          <MenuItem
            color="white"
            bg="gray.800"
            _hover={{ bg: "gray.700" }}
            onClick={() => {
              setWriteButtonType(WriteButtonType.SimulateOnTenderly);
              setIsError(false);
            }}
          >
            Simulate on Tenderly
          </MenuItem>
        </MenuList>
      </Menu>
    </HStack>
  );
};
