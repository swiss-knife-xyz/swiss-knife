"use client";

import {
  useCallback,
  useId,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Collapse,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Link,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, CircleAlert } from "lucide-react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import {
  encodeDeployData,
  getAddress,
  type Abi,
  type Address,
  type Chain,
  type Hex,
} from "viem";
import type { JsonFragmentType } from "ethers";
import { chainIdToChain, chainIdToImage } from "@/data/common";
import { bytecodeSize } from "@/lib/solidity/contractSize";
import { InitcodeSize } from "./ContractSize";
import { ReuseConstructorArguments } from "./ReuseConstructorArguments";
import { NetworkSelect } from "@/components/NetworkSelect";
import { useCustomChains } from "@/lib/customChains/store";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { renderInputFields } from "@/components/fnParams/Renderer";
import { IntInput } from "@/components/fnParams/inputs/IntInput";
import { prepareArgs } from "@/lib/convertBooleans";
import { getPublicClient } from "@/lib/publicClient";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";
import type { CompilerBuild } from "./useSolidityCompiler";
import type { DeploymentHistoryController } from "./useDeploymentHistory";
import type { DeploymentRecord } from "@/lib/solidity/deployments";
import type { CompiledContract } from "./types";

function getNetworkOptions() {
  const chains = Object.values(chainIdToChain).filter(
    (chain) =>
      chain.blockExplorers?.default.url && chain.rpcUrls.default.http.length
  );
  return [true, false].map((testnet) => ({
    label: testnet ? "Testnets" : "Mainnets",
    options: chains
      .filter((chain) => !!chain.testnet === testnet)
      .map((chain) => ({
        value: String(chain.id),
        label: chain.name,
        image: chainIdToImage[chain.id],
      })),
  }));
}

type DeploymentRequest = {
  chain: Chain;
  account: Address;
  data: Hex;
  value: bigint;
};
export type DeploymentWallet = {
  account?: Address;
  chainId?: number;
  switchChain(chainId: number): Promise<void>;
  submit(request: DeploymentRequest): Promise<Hex>;
  receipt(
    chainId: number,
    hash: Hex
  ): Promise<{
    status: "success" | "reverted";
    contractAddress: Address | null;
  }>;
};
type Props = {
  contract: CompiledContract;
  build?: CompilerBuild;
  history?: DeploymentHistoryController;
  contractName: string;
  isStale: boolean;
  onBusyChange: (busy: boolean) => void;
  deploymentChainId?: number;
  onDeploymentChainChange?(chainId:number):void;
  libraryPanel?: ReactNode;
  linkingReady?: boolean;
  validateLibraries?():Promise<void>;
};
type Submission = {
  chainId: number;
  explorer?: string;
  contractName: string;
  state: "wallet" | "pending" | "success" | "reverted" | "unknown";
  hash?: Hex;
  address?: Address;
};

export function deploymentData(
  contract: CompiledContract,
  values: Record<number, unknown>
) {
  if (!/^(?:[a-fA-F0-9]{2})+$/.test(contract.bytecode)) {
    throw new Error(
      contract.bytecode
        ? "Link the libraries before deploying this contract."
        : "This contract has no deployable bytecode."
    );
  }
  const constructor = contract.abi.find((item) => item.type === "constructor");
  return encodeDeployData({
    abi: contract.abi as Abi,
    bytecode: `0x${contract.bytecode}`,
    args: prepareArgs(constructor?.inputs, values) ?? [],
  });
}

function isWalletRejection(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 8) return false;
  const details = error as {code?: unknown; name?: string; cause?: unknown};
  return details.code === 4001 || details.code === "ACTION_REJECTED" ||
    details.name === "UserRejectedRequestError" || isWalletRejection(details.cause, depth + 1);
}

function errorMessage(error: unknown) {
  if (isWalletRejection(error)) return "Transaction rejected in wallet.";
  if (error && typeof error === "object") {
    const details = error as {
      shortMessage?: string;
      message?: string;
      code?: number;
      name?: string;
      cause?: unknown;
    };
    if (details.code === 4001 || details.name === "UserRejectedRequestError")
      return "Transaction rejected in wallet.";
    if (details.shortMessage) return details.shortMessage;
    if (details.cause) return errorMessage(details.cause);
    if (details.message) return details.message;
  }
  return "Deployment failed. Try again.";
}

function ConstructorField({
  input,
  index,
  value,
  chainId,
  setValues,
  setInvalid,
}: {
  input: JsonFragmentType;
  index: number;
  value: any;
  chainId: number;
  setValues: Dispatch<SetStateAction<Record<number, any>>>;
  setInvalid: Dispatch<SetStateAction<Record<number, boolean>>>;
}) {
  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setValues((current) =>
        Object.is(current[index], next)
          ? current
          : { ...current, [index]: next }
      );
    },
    [index, setValues]
  );
  const onInvalid = useCallback(
    (invalid: boolean) => {
      setInvalid((current) =>
        current[index] === invalid ? current : { ...current, [index]: invalid }
      );
    },
    [index, setInvalid]
  );
  return renderInputFields({
    input: { ...input, name: input.name || `param_${index}` },
    value,
    chainId,
    onChange,
    setFunctionIsDisabled: onInvalid,
    isError: false,
    onKeyDown: () => {},
    allowBytesBuilder: true,
    immediateUpdates: true,
  });
}

export function ContractDeploymentForm({
  contract,
  contractName,
  isStale,
  onBusyChange,
  build,
  history,
  wallet,
  deploymentChainId,
  onDeploymentChainChange,
  libraryPanel,
  linkingReady = true,
  validateLibraries,
}: Props & { wallet: DeploymentWallet }) {
  useCustomChains();
  const networkOptions = getNetworkOptions();
  const [fallbackChainId, setFallbackChainId] = useState(11155111);
  const chainId=deploymentChainId ?? fallbackChainId;
  const setChainId=onDeploymentChainChange ?? setFallbackChainId;
  const [preparing,setPreparing]=useState(false);
  const [values, setValues] = useState<Record<number, any>>({});
  const [reuseVersion, setReuseVersion] = useState(0);
  const [constructorOpen, setConstructorOpen] = useState(true);
  const constructorPanelId = useId();
  const constructorBoxRef = useRef<HTMLDivElement>(null);
  const revealConstructor = useRef(false);
  const [invalid, setInvalid] = useState<Record<number, boolean>>({});
  const [value, setValue] = useState("0");
  const [valueInvalid, setValueInvalid] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [draftSubmission, setSubmission] = useState<Submission>();
  const [recordId, setRecordId] = useState<string>();
  const savedRecord = recordId ? (history?.getRecord?.(recordId) ?? history?.records.find(record => record.id === recordId)) : undefined;
  const submission: Submission | undefined = draftSubmission && savedRecord ? {
    ...draftSubmission, state: savedRecord.status === "rejected" ? "unknown" : savedRecord.status,
    hash:savedRecord.hash, address:savedRecord.address,
  } : draftSubmission;
  useEffect(() => {
    if (savedRecord?.deletedAt && savedRecord.status !== "wallet" && savedRecord.status !== "pending") {
      setSubmission(undefined);
      setRecordId(undefined);
    }
  }, [savedRecord?.deletedAt, savedRecord?.status]);
  const lock = useRef(false);
  const mounted = useRef(true);
  const receiptRef = useRef(wallet.receipt);
  receiptRef.current = wallet.receipt;
  const constructor = contract.abi.find((item) => item.type === "constructor");
  const [initcode, setInitcode] = useState<{bytes: number | null; values: typeof values; bytecode: string} | null>(null);
  const hasConstructorArgs = !!constructor?.inputs?.length;
  const invalidArgs = Object.values(invalid).some(Boolean);
  useEffect(() => {
    if (!hasConstructorArgs) return;
    const timer = setTimeout(() => {
      let bytes: number | null = null;
      if (!invalidArgs) {
        try { bytes = bytecodeSize(deploymentData(contract, values)); } catch { /* Incomplete inputs or unlinked libraries. */ }
      }
      setInitcode({bytes, values, bytecode: contract.bytecode});
    }, 200);
    return () => clearTimeout(timer);
  }, [contract, values, invalidArgs, hasConstructorArgs]);
  const chain = chainIdToChain[chainId];
  const needsSwitch = !!wallet.account && wallet.chainId !== chainId;
  const busy =
    preparing || switching ||
    submission?.state === "wallet" ||
    submission?.state === "pending";
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onBusyChange(false);
    };
  }, [onBusyChange]);
  useEffect(() => {
    setError("");
  }, [chainId, values, value, wallet.account, wallet.chainId]);

  useEffect(() => {
    if (history || submission?.state !== "pending" || !submission.hash) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const poll = async () => {
      try {
        const receipt = await receiptRef.current(
          submission.chainId,
          submission.hash!
        );
        if (!cancelled)
          setSubmission({
            ...submission,
            state: receipt.status,
            address: receipt.contractAddress ?? undefined,
          });
      } catch {
        if (cancelled) return;
        if (++attempts >= 90) {
          setSubmission({ ...submission, state: "unknown" });
          return;
        }
        timer = setTimeout(poll, 4000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [submission, history]);

  const deploy = async () => {
    if (lock.current || busy || !wallet.account || !chain || isStale || (!needsSwitch && !linkingReady)) return;
    lock.current = true;
    setError("");
    let journal: DeploymentRecord | undefined;
    let sentHash: Hex | undefined;
    try {
      if (needsSwitch) {
        setSwitching(true);
        await wallet.switchChain(chainId);
        return;
      }
      const data = deploymentData(contract, values);
      const amount =
        constructor?.stateMutability === "payable" ? BigInt(value) : 0n;
      if (amount < 0n || amount >= 2n ** 256n)
        throw new Error("Enter a valid transaction value.");
      if(validateLibraries) {
        setPreparing(true);
        await validateLibraries();
        if(!mounted.current) return;
      }
      const snapshot: Submission = {
        chainId,
        explorer: chain.blockExplorers?.default.url,
        contractName,
        state: "wallet",
      };
      setSubmission(snapshot);
      if (history) {
        if (!build) throw new Error("Compile the current contract before deploying.");
        journal = await history.prepare({build,contract,chainId,account:wallet.account,data,value:amount,
          args:prepareArgs(constructor?.inputs,values) ?? []});
        if (!mounted.current) {
          await history.update(journal.id,{status:"rejected",error:"Cancelled before requesting wallet confirmation."});
          return;
        }
        setRecordId(journal.id);
      }
      const hash = await wallet.submit({
        chain,
        account: wallet.account,
        data,
        value: amount,
      });
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash))
        throw new Error(
          "No transaction hash returned. Check your wallet before trying again."
        );
      sentHash = hash;
      // Persist even if the form unmounted while the wallet was open.
      if (journal && history) await history.update(journal.id,{status:"pending",hash,error:undefined});
      if (mounted.current)
        setSubmission({ ...snapshot, hash, state: "pending" });
    } catch (error) {
      const message = errorMessage(error);
      if (journal && history && !sentHash) {
        await history.update(journal.id,{status:message === "Transaction rejected in wallet." ? "rejected" : "unknown",error:message}).catch(()=>{});
      }
      if (mounted.current) {
        setError(message);
        if (!sentHash) setSubmission(undefined);
      }
    } finally {
      lock.current = false;
      if (mounted.current) {setSwitching(false);setPreparing(false);}
    }
  };

  const historyOwnsSubmission = !!submission && !!history && !savedRecord?.deletedAt;
  if (historyOwnsSubmission && busy && !error) return null;

  return (
    <Box
      borderTopWidth={historyOwnsSubmission ? 0 : "1px"}
      borderColor="border.default"
      mt={historyOwnsSubmission ? 0 : 5}
      pt={historyOwnsSubmission ? 0 : 4}
    >
      {!submission && (
        <VStack inert={busy ? true : undefined} minW={0} align="stretch" spacing={4}>
          {!!constructor?.inputs?.length && (
            <Box
              borderWidth="1px"
              borderColor="border.default"
              as="fieldset"
              ref={constructorBoxRef}
              borderRadius="lg"
              px={3}
              pb={constructorOpen ? 3 : 2}
              minW={0}
            >
              <Box as="legend" px={2} w="full">
                <Flex align="center" gap={2} wrap="wrap">
                  <Button variant="unstyled" display="inline-flex" alignItems="center" gap={1.5}
                    h="auto" minW={0} fontWeight="normal" fontSize="sm" color="text.secondary"
                    aria-expanded={constructorOpen} aria-controls={constructorPanelId}
                    onClick={() => { revealConstructor.current = !constructorOpen; setConstructorOpen(open => !open); }}>
                    {constructorOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Constructor parameters
                  </Button>
                  <Box aria-hidden="true" flex={1} minW={4} borderTopWidth="1px" borderColor="border.default" />
                  {history && <ReuseConstructorArguments
                    inputs={constructor.inputs}
                    history={history}
                    disabled={busy || isStale}
                    onReuse={(next) => { revealConstructor.current = !constructorOpen; setConstructorOpen(true); setValues(next); setInvalid({}); setReuseVersion(version => version + 1); setError(""); }}
                  />}
                </Flex>
              </Box>
              <Collapse in={constructorOpen} animateOpacity onAnimationComplete={() => {
                if (!constructorOpen || !revealConstructor.current) return;
                revealConstructor.current = false;
                constructorBoxRef.current?.scrollIntoView?.({
                  behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
                  block: "nearest",
                });
              }}>
              <VStack id={constructorPanelId} align="stretch" spacing={0}>
                {constructor.inputs.map(
                  (input: JsonFragmentType, index: number) => (
                    <Box
                      key={`${index}:${reuseVersion}`}
                      minW={0}
                      w="full"
                      pt={4}
                      pb={index === constructor.inputs.length - 1 ? 0 : 4}
                      borderBottomWidth={index === constructor.inputs.length - 1 ? 0 : "1px"}
                      borderColor="border.default"
                    >
                      <ConstructorField
                        input={input}
                        index={index}
                        value={values[index]}
                        chainId={chainId}
                        setValues={setValues}
                        setInvalid={setInvalid}
                      />
                    </Box>
                  )
                )}
              </VStack>
              </Collapse>
            </Box>
          )}
          {hasConstructorArgs && <InitcodeSize bytes={initcode?.bytes ?? null} pending={initcode?.values !== values || initcode?.bytecode !== contract.bytecode} />}
          <FormControl>
            <FormLabel fontSize="sm">Deployment network</FormLabel>
            <NetworkSelect
              ariaLabel="Deployment network"
              options={networkOptions}
              chainId={chainId}
              onChange={setChainId}
              isDisabled={busy}
              controlProps={{ h: 10, minH: 10, fontSize: "sm" }}
              boxProps={{ minW: 0, w: "full" }}
            />
          </FormControl>
          {libraryPanel}
          {constructor?.stateMutability === "payable" && (
            <IntInput
              input={{
                name: `Value (${chain.nativeCurrency.symbol})`,
                type: "uint256",
              }}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              setFunctionIsDisabled={setValueInvalid}
              defaultEthFormatIndex={1}
            />
          )}
          <Button
            variant="primary"
            w="full"
            h={10}
            onClick={deploy}
            isLoading={switching || preparing}
            loadingText={preparing ? "Checking libraries…" : "Switching…"}
            isDisabled={
              !wallet.account ||
              !!(history && !history.ready) ||
              !contract.bytecode ||
              (!needsSwitch && !linkingReady) ||
              isStale ||
              (!needsSwitch &&
                (Object.values(invalid).some(Boolean) || valueInvalid))
            }
          >
            {needsSwitch ? "Switch Chain" : "Deploy"}
          </Button>
          {isStale && (
            <Text fontSize="xs" color="warning.text">
              Compile the current source before deploying.
            </Text>
          )}
        </VStack>
      )}
      {submission && (!history || savedRecord?.deletedAt) && (
        <VStack align="stretch" spacing={3} role="status">
          <HStack spacing={2} flexWrap="wrap">
            {submission.state === "wallet" || submission.state === "pending" ? (
              <Spinner size="sm" color="primary.300" />
            ) : submission.state === "success" ? (
              <CheckCircle2
                size={18}
                color="var(--chakra-colors-success-text)"
              />
            ) : (
              <CircleAlert size={18} />
            )}
            <Text fontSize="sm" fontWeight="500">
              {submission.state === "wallet"
                ? "Awaiting wallet confirmation"
                : submission.state === "pending"
                  ? "Transaction submitted"
                  : submission.state === "success"
                    ? "Deployment confirmed"
                    : submission.state === "reverted"
                      ? "Deployment reverted"
                      : "Confirmation unavailable"}
            </Text>
            {submission.hash && submission.explorer && (
              <IconButton
                as={Link}
                href={`${submission.explorer}/tx/${submission.hash}`}
                isExternal
                aria-label="Open deployment transaction"
                icon={<ArrowUpRight size={16} />}
                size="xs"
                variant="ghost"
              />
            )}
          </HStack>
          {submission.address && (
            <Box>
              <Flex
                justify="space-between"
                gap={2}
                wrap="wrap"
                align="center"
                mb={2}
              >
                <Text fontSize="xs" color="text.secondary">
                  {submission.contractName}
                </Text>
                <Link
                  href={`${getPath(subdomains.CONTRACT.base)}${submission.chainId}/${submission.address}`}
                  isExternal
                  fontSize="xs"
                  color="primary.300"
                >
                  Interact with the contract ↗
                </Link>
              </Flex>
              <HStack spacing={1} align="start">
                <Text
                  fontFamily="mono"
                  fontSize="sm"
                  overflowWrap="anywhere"
                  minW={0}
                >
                  {submission.address}
                </Text>
                <CopyToClipboard
                  aria-label="Copy deployed contract address"
                  textToCopy={submission.address}
                  size="xs"
                  flexShrink={0}
                />
                {submission.explorer && (
                  <IconButton
                    as={Link}
                    href={`${submission.explorer}/address/${submission.address}`}
                    isExternal
                    aria-label="Open deployed contract on block explorer"
                    icon={<ArrowUpRight size={15} />}
                    size="xs"
                    variant="ghost"
                    flexShrink={0}
                  />
                )}
              </HStack>
            </Box>
          )}
          {submission.state === "unknown" && (
            <Text fontSize="xs" color="text.secondary">
              Check the transaction explorer before trying again.
            </Text>
          )}
          {!busy && (
            <Button
              size="sm"
              alignSelf="center"
              onClick={() => setSubmission(undefined)}
            >
              Start another deployment
            </Button>
          )}
        </VStack>
      )}
      {submission && history && !savedRecord?.deletedAt && !busy && <Flex justify="center">
        <Button size="sm" onClick={()=>{setSubmission(undefined);setRecordId(undefined);}}>Start another deployment</Button>
      </Flex>}
      {error && (
        <Alert status="error" rounded="md" mt={3} fontSize="sm">
          <AlertIcon />
          <Text overflowWrap="anywhere">{error}</Text>
        </Alert>
      )}
    </Box>
  );
}

export function ContractDeployment(props: Props) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: client } = useWalletClient();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const wallet: DeploymentWallet = {
    account: hydrated ? address : undefined,
    chainId: hydrated ? chainId : undefined,
    switchChain: async (id) => {
      await switchChainAsync({ chainId: id });
    },
    submit: async (request) => {
      if (!client) throw new Error("Connect a wallet first.");
      const [liveChainId, addresses] = await Promise.all([
        client.getChainId(),
        client.getAddresses(),
      ]);
      if (
        liveChainId !== request.chain.id ||
        !addresses[0] ||
        getAddress(addresses[0]) !== getAddress(request.account)
      )
        throw new Error(
          "Wallet account or network changed. Try again on the selected network."
        );
      return client.sendTransaction(request);
    },
    receipt: async (id, hash) => {
      const receipt = await getPublicClient(id, {
        timeout: 10000,
      }).getTransactionReceipt({ hash });
      return {
        status: receipt.status,
        contractAddress: receipt.contractAddress ?? null,
      };
    },
  };
  return <ContractDeploymentForm {...props} wallet={wallet} />;
}
