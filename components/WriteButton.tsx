import { memo } from "react";
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

const WriteButtonComponent = ({
  isError,
  userAddress,
  writeButtonType,
  chain,
  chainId,
  writeFunction,
  callAsReadFunction,
  simulateOnTenderly,
  encodeCalldata,
  onHistoricalQuery,
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
  encodeCalldata?: () => void;
  onHistoricalQuery?: () => void;
  isDisabled: boolean;
  loading: boolean;
  setWriteButtonType: (writeButtonType: WriteButtonType) => void;
  setIsError: (isError: boolean) => void;
}) => {
  const historical = writeButtonType === WriteButtonType.CallAtBlock || writeButtonType === WriteButtonType.CallAtTime;
  const showWrongNetwork =
    (!userAddress && writeButtonType === WriteButtonType.Write) ||
    (!historical && writeButtonType !== WriteButtonType.SimulateOnTenderly &&
      writeButtonType !== WriteButtonType.EncodeCalldata &&
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
        <ConnectButton expectedChainId={chainId} hideAccount transparentWrongNetwork embedded />
      ) : (
        <Button
          px={4}
          h={{ base: 10, md: 8 }}
          onClick={
            historical ? onHistoricalQuery : writeButtonType === WriteButtonType.Write
              ? writeFunction
              : writeButtonType === WriteButtonType.CallAsViewFn
              ? () => callAsReadFunction()
              : writeButtonType === WriteButtonType.SimulateOnTenderly
              ? simulateOnTenderly
              : encodeCalldata
          }
          isDisabled={isDisabled}
          isLoading={loading}
          size={"sm"}
          title={historical ? writeButtonType : "write"}
          aria-label={historical ? writeButtonType : undefined}
          variant="ghost"
          borderLeftRadius="lg"
          borderRightRadius={0}
          color={!isError ? "text.primary" : "red.300"}
          _hover={{ bg: "whiteAlpha.100" }}
        >
          {historical ? (writeButtonType === WriteButtonType.CallAtBlock ? "Call at Block" : "Call at Time") : writeButtonType}
        </Button>
      )}
      <Menu isLazy>
        <MenuButton
          as={IconButton}
          h={{ base: 10, md: 8 }}
          minW={{ base: 9, md: 6 }}
          aria-label="Options"
          icon={<ChevronDownIcon />}
          variant="ghost"
          size={"xs"}
          color="text.secondary"
          borderLeftWidth="1px"
          borderLeftColor="border.strong"
          borderLeftRadius={0}
          borderRightRadius="lg"
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
          {encodeCalldata && (
            <MenuItem
              color="text.primary"
              bg="transparent"
              _hover={{ bg: "bg.emphasis" }}
              onClick={() => {
                setWriteButtonType(WriteButtonType.EncodeCalldata);
                setIsError(false);
              }}
            >
              Encode Calldata
            </MenuItem>
          )}
          {onHistoricalQuery && [WriteButtonType.CallAtBlock, WriteButtonType.CallAtTime].map(option => (
            <MenuItem key={option} color="text.primary" bg="transparent" _hover={{ bg: "bg.emphasis" }} onClick={() => {
              setWriteButtonType(option);
              setIsError(false);
            }}>{option}</MenuItem>
          ))}
        </MenuList>
      </Menu>
    </HStack>
  );
};

export const WriteButton = memo(WriteButtonComponent);
