import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { decodeAbiParameters, encodeAbiParameters } from "viem";
import {
  ContractDeploymentForm,
  deploymentData,
  type DeploymentWallet,
} from "./ContractDeployment";

vi.mock("wagmi", () => ({
  useAccount: () => ({}),
  useSwitchChain: () => ({}),
  useWalletClient: () => ({}),
}));
vi.mock("@/utils", () => ({
  getPath: () => "http://localhost:3000/explorer/",
}));
vi.mock("@/components/fnParams/Renderer", () => ({
  renderInputFields: ({ input, value, onChange }: any) => (
    <input aria-label={input.name} value={value ?? ""} onChange={onChange} />
  ),
}));
vi.mock("@/components/fnParams/inputs/IntInput", () => ({
  IntInput: ({ input, value, onChange }: any) => (
    <input aria-label={input.name} value={value} onChange={onChange} />
  ),
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
}));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({
    options,
    selectedOption,
    setSelectedOption,
    ariaLabel,
    isDisabled,
  }: any) => (
    <select
      aria-label={ariaLabel}
      disabled={isDisabled}
      value={selectedOption?.value ?? ""}
      onChange={(e) =>
        setSelectedOption(
          options
            .flatMap((group: any) => group.options)
            .find((option: any) => option.value === e.target.value)
        )
      }
    >
      {options
        .flatMap((group: any) => group.options)
        .map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
    </select>
  ),
}));

const account = "0x1111111111111111111111111111111111111111" as const;
const address = "0x2222222222222222222222222222222222222222" as const;
const hash = `0x${"ab".repeat(32)}` as const;
const emptyContract = {
  name: "Counter",
  sourcePath: "Counter.sol",
  abi: [],
  bytecode: "60006000",
  deployedBytecode: "00",
};
function walletFixture(
  overrides: Partial<DeploymentWallet> = {}
): DeploymentWallet {
  return {
    account,
    chainId: 11155111,
    switchChain: vi.fn().mockResolvedValue(undefined),
    submit: vi.fn().mockResolvedValue(hash),
    receipt: vi
      .fn()
      .mockResolvedValue({ status: "success", contractAddress: address }),
    ...overrides,
  };
}
function mount(wallet = walletFixture(), props: Record<string, any> = {}) {
  const onBusyChange = vi.fn();
  const view = render(
    <ChakraProvider>
      <ContractDeploymentForm
        contract={emptyContract}
        contractName="Counter"
        isStale={false}
        onBusyChange={onBusyChange}
        wallet={wallet}
        {...props}
      />
    </ChakraProvider>
  );
  return { ...view, onBusyChange, wallet };
}
afterEach(cleanup);

it("defaults to Sepolia and requires a connected wallet", () => {
  const { wallet } = mount(walletFixture({ account: undefined }));
  expect(
    (screen.getByLabelText("Deployment network") as HTMLSelectElement).value
  ).toBe("11155111");
  expect(
    (
      screen.getByRole("button", {
        name: "Deploy",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  expect(wallet.submit).not.toHaveBeenCalled();
});

it("switches the network without automatically deploying", async () => {
  const { wallet } = mount(walletFixture({ chainId: 1 }));
  fireEvent.click(screen.getByRole("button", { name: "Switch Chain" }));
  await waitFor(() =>
    expect(wallet.switchChain).toHaveBeenCalledWith(11155111)
  );
  expect(wallet.submit).not.toHaveBeenCalled();
});

it("encodes nested constructor tuples, arrays and booleans exactly", () => {
  const inputs = [
    {
      name: "settings",
      type: "tuple",
      components: [
        { name: "enabled", type: "bool" },
        { name: "amounts", type: "uint256[]" },
      ],
    },
  ];
  const contract = {
    ...emptyContract,
    abi: [{ type: "constructor", inputs, stateMutability: "nonpayable" }],
  };
  const data = deploymentData(contract, { 0: ["true", ["3", "7"]] });
  expect(data).toBe(
    `0x${contract.bytecode}${encodeAbiParameters(inputs, [[true, [3n, 7n]]]).slice(2)}`
  );
});

it("validates constructor values before opening the wallet", async () => {
  const { wallet } = mount(undefined, {
    contract: {
      ...emptyContract,
      abi: [
        {
          type: "constructor",
          inputs: [{ name: "owner", type: "address" }],
          stateMutability: "nonpayable",
        },
      ],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
  await screen.findByRole("alert");
  expect(wallet.submit).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("owner"), {
    target: { value: account },
  });
  fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
  await screen.findByText("Deployment confirmed");
  const request = vi.mocked(wallet.submit).mock.calls[0][0];
  expect(
    decodeAbiParameters(
      [{ type: "address" }],
      `0x${request.data.slice(2 + emptyContract.bytecode.length)}`
    )
  ).toEqual([account]);
});

it("submits only once and automatically displays the confirmed address and correct links", async () => {
  let resolveReceipt!: (value: any) => void;
  const receipt = new Promise<any>((resolve) => {
    resolveReceipt = resolve;
  });
  const { wallet } = mount(
    walletFixture({ receipt: vi.fn().mockReturnValue(receipt) })
  );
  const button = screen.getByRole("button", { name: "Deploy" });
  fireEvent.click(button);
  fireEvent.click(button);
  await screen.findByText("Transaction submitted");
  expect(wallet.submit).toHaveBeenCalledTimes(1);
  expect(vi.mocked(wallet.submit).mock.calls[0][0]).toMatchObject({
    chain: { id: 11155111 },
    account,
    data: "0x60006000",
    value: 0n,
  });
  expect(
    screen
      .getByRole("link", { name: "Open deployment transaction" })
      .getAttribute("href")
  ).toBe(`https://sepolia.etherscan.io/tx/${hash}`);
  resolveReceipt({ status: "success", contractAddress: address });
  await screen.findByText("Deployment confirmed");
  expect(screen.getByText(address)).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: /Interact with the contract/ })
      .getAttribute("href")
  ).toBe(`http://localhost:3000/explorer/11155111/${address}`);
  expect(
    screen
      .getByRole("link", { name: "Open deployed contract on block explorer" })
      .getAttribute("href")
  ).toBe(`https://sepolia.etherscan.io/address/${address}`);
});

it("unlocks after wallet rejection", async () => {
  const { onBusyChange } = mount(
    walletFixture({ submit: vi.fn().mockRejectedValue({ code: 4001 }) })
  );
  fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
  await screen.findByText("Transaction rejected in wallet.");
  expect(
    (
      screen.getByRole("button", {
        name: "Deploy",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(false);
  await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
});

it("blocks deploying stale source and missing bytecode", () => {
  mount(undefined, { isStale: true });
  expect(
    (
      screen.getByRole("button", {
        name: "Deploy",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  expect(
    screen.getByText("Compile the current source before deploying.")
  ).toBeTruthy();
  expect(() => deploymentData({ ...emptyContract, bytecode: "" }, {})).toThrow(
    "no deployable bytecode"
  );
  expect(() =>
    deploymentData({ ...emptyContract, bytecode: "__$unresolved$__" }, {})
  ).toThrow("Link the libraries");
});

it("encodes transaction value only for payable constructors and shows reverts", async () => {
  const { wallet } = mount(
    walletFixture({
      receipt: vi
        .fn()
        .mockResolvedValue({ status: "reverted", contractAddress: null }),
    }),
    {
      contract: {
        ...emptyContract,
        abi: [{ type: "constructor", inputs: [], stateMutability: "payable" }],
      },
    }
  );
  fireEvent.change(screen.getByLabelText("Value (ETH)"), {
    target: { value: "42" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
  await screen.findByText("Deployment reverted");
  expect(vi.mocked(wallet.submit).mock.calls[0][0].value).toBe(42n);
  expect(
    screen.queryByRole("link", { name: /Interact with the contract/ })
  ).toBeNull();
});

function historyFixture(overrides:Record<string,any>={}) {
  return {ready:true,records:[],prepare:vi.fn().mockResolvedValue({id:"journal"}),update:vi.fn().mockResolvedValue({}),...overrides} as any;
}
function savedBuild() {
  return {input:{workspaceId:"one",key:"build",entry:"Counter.sol",entryId:"file",files:[{id:"file",name:"Counter.sol",content:"contract Counter{}"}],settings:{version:"soljson-v0.8.30+commit.73712a01.js",optimizer:false,runs:200,viaIR:false,evmVersion:"default"},sources:{"Counter.sol":{content:"contract Counter{}"}},fingerprint:"build"},result:{contracts:{"Counter.sol:Counter":emptyContract}}};
}
it("does not open the wallet if the exact build cannot be journaled first",async()=>{
  const history=historyFixture({prepare:vi.fn().mockRejectedValue(new Error("Storage full. No transaction sent."))});
  const {wallet}=mount(undefined,{history,build:savedBuild()});
  fireEvent.click(screen.getByRole("button",{name:"Deploy"}));
  await screen.findByText("Storage full. No transaction sent.");
  expect(wallet.submit).not.toHaveBeenCalled();
  expect(history.prepare).toHaveBeenCalledWith(expect.objectContaining({data:"0x60006000",account,chainId:11155111,value:0n,build:savedBuild()}));
});
it("persists a returned hash even if navigation unmounted the form while the wallet was open",async()=>{
  let resolve!:(value:any)=>void;
  const history=historyFixture();
  const wallet=walletFixture({submit:vi.fn(()=>new Promise<any>(done=>{resolve=done;}))});
  const view=mount(wallet,{history,build:savedBuild()});
  fireEvent.click(screen.getByRole("button",{name:"Deploy"}));
  await waitFor(()=>expect(wallet.submit).toHaveBeenCalledOnce());
  view.unmount();resolve(hash);
  await waitFor(()=>expect(history.update).toHaveBeenCalledWith("journal",{status:"pending",hash,error:undefined}));
});
it("records wallet rejection separately from an on-chain revert and allows a fresh attempt",async()=>{
  const history=historyFixture();
  mount(walletFixture({submit:vi.fn().mockRejectedValue({shortMessage:"User rejected the request.",cause:{name:"UserRejectedRequestError",code:4001}})}),{history,build:savedBuild()});
  fireEvent.click(screen.getByRole("button",{name:"Deploy"}));
  await screen.findByText("Transaction rejected in wallet.");
  expect(history.update).toHaveBeenCalledWith("journal",{status:"rejected",error:"Transaction rejected in wallet."});
  expect((screen.getByRole("button",{name:"Deploy"}) as HTMLButtonElement).disabled).toBe(false);
});

it("updates initcode size with encoded constructor arguments and warns only above the reference limit", async () => {
  const contract = {...emptyContract, bytecode:"60".repeat(49056), abi:[{type:"constructor",stateMutability:"nonpayable",inputs:[{name:"data",type:"bytes"}]}]};
  const {wallet} = mount(undefined, {contract});
  fireEvent.change(screen.getByLabelText("data"), {target:{value:"0x11"}});
  await screen.findByText("49,152 / 49,152 B");
  expect(screen.queryByText(/bytes over EIP-3860/)).toBeNull();
  fireEvent.change(screen.getByLabelText("data"), {target:{value:`0x${"11".repeat(33)}`}});
  await screen.findByText("49,184 / 49,152 B");
  expect(screen.getByText(/32 bytes over EIP-3860/)).toBeTruthy();
  expect(wallet.submit).not.toHaveBeenCalled();
  expect((screen.getByRole("button",{name:"Deploy"}) as HTMLButtonElement).disabled).toBe(false);
});

it("keeps constructor values when the parameter box is collapsed and reopened", async () => {
  const contract={...emptyContract,abi:[{type:"constructor",stateMutability:"nonpayable",inputs:[{name:"label",type:"string"}]}]};
  mount(undefined,{contract});
  fireEvent.change(screen.getByLabelText("label"),{target:{value:"My token"}});
  const toggle=screen.getByRole("button",{name:"Constructor parameters"});
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect((screen.getByLabelText("label") as HTMLInputElement).value).toBe("My token");
});

it("scrolls the constructor box into view after reopening, but not on initial render", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype,"scrollIntoView");
  const scroll=vi.fn();
  Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:scroll});
  try {
    mount(undefined,{contract:{...emptyContract,abi:[{type:"constructor",inputs:[{name:"amount",type:"uint256"}]}]}});
    expect(scroll).not.toHaveBeenCalled();
    const toggle=screen.getByRole("button",{name:"Constructor parameters"});
    fireEvent.click(toggle);
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    await waitFor(()=>expect(scroll).toHaveBeenCalledWith({behavior:"smooth",block:"nearest"}));
  } finally {
    if (descriptor) Object.defineProperty(HTMLElement.prototype,"scrollIntoView",descriptor);
    else delete (HTMLElement.prototype as any).scrollIntoView;
  }
});

it("blocks unresolved library configurations and rechecks code before requesting the wallet",async()=> {
  const validation=vi.fn().mockRejectedValue(new Error("Library code disappeared. Check the selected network."));
  const history=historyFixture();const wallet=walletFixture();
  const view=mount(wallet,{history,build:savedBuild(),linkingReady:false,validateLibraries:validation});
  expect((screen.getByRole("button",{name:"Deploy"}) as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<ChakraProvider><ContractDeploymentForm contract={emptyContract} contractName="Counter" isStale={false} onBusyChange={()=>{}} wallet={wallet} history={history} build={savedBuild() as any} linkingReady validateLibraries={validation}/></ChakraProvider>);
  fireEvent.click(screen.getByRole("button",{name:"Deploy"}));
  await screen.findByText("Library code disappeared. Check the selected network.");
  expect(history.prepare).not.toHaveBeenCalled();expect(wallet.submit).not.toHaveBeenCalled();
});
