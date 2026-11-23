import React from "react";
import { Blob } from "node:buffer";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { afterEach, expect, it, vi } from "vitest";
import { DeploymentHistory } from "./DeploymentHistory";
import type { DeploymentHistoryController } from "./useDeploymentHistory";
vi.mock("@/utils",()=>({getPath:()=>"http://localhost:3000/explorer/"}));
const record={id:"one",buildId:"build",workspaceId:"workspace",contractName:"Token",sourcePath:"Token.sol",chainId:11155111,account:"0x1111111111111111111111111111111111111111",value:"0",data:"0x6000",constructorArgs:"0x",arguments:"[]",createdAt:1700000000000,updatedAt:1700000000000,revision:1,status:"success",hash:`0x${"ab".repeat(32)}`,address:"0x2222222222222222222222222222222222222222"};
function history(overrides:any={}):DeploymentHistoryController {
  return {activeId:"one",records:[record],ready:true,error:"",hasUnsaved:false,update:vi.fn(),remove:vi.fn().mockResolvedValue(undefined),restore:vi.fn().mockResolvedValue(undefined),getBuild:vi.fn().mockResolvedValue({id:"build",settings:{version:"soljson-v0.8.30+commit.73712a01.js"},input:{language:"Solidity",sources:{"Token.sol":{content:"EXACT DEPLOYED SOURCE"}},settings:{optimizer:{enabled:true,runs:200}}}}),...overrides} as any;
}
afterEach(()=>{cleanup();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
const mount=(data:DeploymentHistoryController)=>render(<ChakraProvider><DeploymentHistory history={data}/></ChakraProvider>);
it("links saved deployments to the correct local tool and chain explorer",()=>{
  mount(history());
  expect(screen.getByText("Confirmed")).toBeTruthy();
  expect(screen.getByRole("link",{name:"Interact"}).getAttribute("href")).toBe(`http://localhost:3000/explorer/11155111/${record.address}`);
  expect(screen.getByRole("link",{name:"Open saved contract on block explorer"}).getAttribute("href")).toBe(`https://sepolia.etherscan.io/address/${record.address}`);
});
it("distinguishes an active wallet prompt from an interrupted request restored after reload",()=>{
  const view=mount(history({records:[{...record,status:"wallet",hash:undefined,address:undefined}]}));
  expect(screen.getByText("Confirm in wallet")).toBeTruthy();
  expect(screen.queryByText(/No transaction hash/)).toBeNull();
  view.rerender(<ChakraProvider><DeploymentHistory history={history({activeId:undefined,records:[{...record,status:"wallet",hash:undefined,address:undefined}]})}/></ChakraProvider>);
  expect(screen.getByText("Check wallet")).toBeTruthy();
});
it("downloads only the exact saved Standard JSON input for verification",async()=>{
  vi.stubGlobal("Blob",Blob);
  let contents:Blob|undefined;
  vi.stubGlobal("URL",{createObjectURL:vi.fn((blob:Blob)=>{contents=blob;return "blob:deployment";}),revokeObjectURL:vi.fn()});
  vi.useFakeTimers({toFake:["setTimeout","clearTimeout"]});
  const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{});
  const data=history();mount(data);
  await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Download Standard JSON"}));});
  expect(contents).toBeTruthy();
  const exported=JSON.parse(await contents!.text());
  const build=await data.getBuild("build");
  expect(exported).toEqual(build.input);
  expect(exported.sources["Token.sol"].content).toBe("EXACT DEPLOYED SOURCE");
  expect(exported.deployment).toBeUndefined();
  expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe("Token-solc-0.8.30-standard-input.json");
  act(()=>vi.runOnlyPendingTimers());
});

it("offers Delete with an Undo action for a deployment entry",async()=>{
  const data=history();mount(data);
  fireEvent.click(screen.getByRole("button",{name:"Delete Token deployment"}));
  await screen.findByText("Deployment removed");
  expect(data.remove).toHaveBeenCalledWith("one");
  fireEvent.click(screen.getByRole("button",{name:"Undo"}));
  await waitFor(()=>expect(data.restore).toHaveBeenCalledWith("one"));
});
it("keeps verification controls outside the collapsed constructor arguments",()=>{
  mount(history({records:[{...record,arguments:'["7"]'}]}));
  const args=screen.getByText("Constructor arguments").closest("details")!;
  expect(args.hasAttribute("open")).toBe(false);
  expect(args.contains(screen.getByRole("button",{name:"Verify on Sourcify"}))).toBe(false);
});

it("reveals an expanded deployment, ignoring nested argument disclosures and collapse",async()=>{
  const original=Object.getOwnPropertyDescriptor(HTMLElement.prototype,"scrollIntoView");
  const scroll=vi.fn();Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:scroll});
  try {
    mount(history({activeId:undefined,records:[{...record,arguments:'["7"]'}]}));
    const details=screen.getByText("Token",{exact:true}).closest("details")!;
    details.open=true;fireEvent(details,new Event("toggle",{bubbles:true}));
    await waitFor(()=>expect(scroll).toHaveBeenCalledTimes(1));
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({block:"nearest"}));
    const args=screen.getByText("Constructor arguments").closest("details")!;
    args.open=true;fireEvent(args,new Event("toggle",{bubbles:true}));
    details.open=false;fireEvent(details,new Event("toggle",{bubbles:true}));
    expect(scroll).toHaveBeenCalledTimes(1);
  } finally {
    if(original)Object.defineProperty(HTMLElement.prototype,"scrollIntoView",original);
    else delete (HTMLElement.prototype as any).scrollIntoView;
  }
});
it("shows an imported deployed address with source attribution and no missing-transaction warning",()=>{
  const imported={...record,hash:undefined,account:undefined,value:undefined,data:undefined,imported:{provider:"etherscan",sourceUrl:`https://sepolia.etherscan.io/address/${record.address}#code`}};
  mount(history({records:[imported]}));
  expect(screen.getByText("Imported")).toBeTruthy();
  expect(screen.queryByRole("button",{name:/Delete .* deployment/})).toBeNull();
  expect(screen.getByRole("link",{name:"Interact"}).getAttribute("href")).toContain(record.address);
  expect(screen.getByRole("link",{name:/Source verified on Etherscan/}).getAttribute("href")).toBe(imported.imported.sourceUrl);
  expect(screen.queryByText(/No transaction hash/)).toBeNull();
  expect(screen.queryByRole("button",{name:/Verify on/})).toBeNull();
  expect(screen.queryByRole("link",{name:/deployment transaction/})).toBeNull();
});
