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
  const showWrongNetwork =
    (!userAddress && writeButtonType === WriteButtonType.Write) ||
    (writeButtonType !== WriteButtonType.SimulateOnTenderly &&
      chain &&
      chain.id !== chainId);

  return (
    <HStack
      bg="bg.muted"
      rounded="lg"
      spacing={0}
      border="1px solid"
      borderColor="border.strong"
    >
      {showWrongNetwork ? (
        <ConnectButton expectedChainId={chainId} hideAccount transparentWrongNetwork />
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
          variant="ghost"
          color={!isError ? "text.primary" : "red.300"}
          _hover={{ bg: "whiteAlpha.100" }}
        >
          {writeButtonType}
        </Button>
      )}
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label="Options"
          icon={<ChevronDownIcon />}
          variant="ghost"
          size={"xs"}
          color="text.secondary"
          borderLeftWidth="1px"
          borderLeftColor="border.strong"
          borderLeftRadius={0}
          _hover={{ bg: "whiteAlpha.100" }}
          _active={{ bg: "whiteAlpha.200" }}
        />
        <MenuList
          bg="bg.subtle"
          borderColor="border.default"
          boxShadow="lg"
          rounded="lg"
          py={1}
        >
          <MenuItem
            color="text.primary"
            bg="transparent"
            _hover={{ bg: "bg.emphasis" }}
            onClick={() => {
              setWriteButtonType(WriteButtonType.Write);
              setIsError(false);
            }}
          >
            Write
          </MenuItem>
          <MenuItem
            color="text.primary"
            bg="transparent"
            _hover={{ bg: "bg.emphasis" }}
            onClick={() => {
              setWriteButtonType(WriteButtonType.CallAsViewFn);
              setIsError(false);
            }}
          >
            Call as View Fn
          </MenuItem>
          <MenuItem
            color="text.primary"
            bg="transparent"
            _hover={{ bg: "bg.emphasis" }}
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
