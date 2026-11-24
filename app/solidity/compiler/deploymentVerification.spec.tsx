import React, { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { afterEach, expect, it, vi } from "vitest";
import { DeploymentVerification } from "./DeploymentVerification";
import type { DeploymentBuild, DeploymentRecord } from "@/lib/solidity/deployments";
const mocks=vi.hoisted(()=>({sourcify:vi.fn(),etherscan:vi.fn(),id:vi.fn(),status:vi.fn()}));
vi.mock("@/lib/solidity/verificationClient",()=>({verificationSourceId:mocks.id,submitDeploymentSourcify:mocks.sourcify,deploymentEtherscanVerification:mocks.etherscan}));
vi.mock("@/lib/verification/providers",()=>({ProviderClient:class{status=mocks.status;}}));
const record:DeploymentRecord={id:"one",buildId:"build",workspaceId:"workspace",contractName:"Token",sourcePath:"Token.sol",chainId:11155111,account:"0x1111111111111111111111111111111111111111",value:"0",data:"0x6000",constructorArgs:"0x",arguments:"[]",createdAt:1,updatedAt:1,revision:1,status:"success",hash:`0x${"ab".repeat(32)}`,address:"0x2222222222222222222222222222222222222222"};
const build:DeploymentBuild={id:"build",workspaceId:"workspace",entry:"Token.sol",settings:{version:"soljson-v0.8.30+commit.73712a01.js",optimizer:true,runs:1000,evmVersion:"paris",viaIR:false},input:{language:"Solidity",sources:{"Token.sol":{content:"// SPDX-License-Identifier: MIT\ncontract Token{}"}},settings:{optimizer:{enabled:true,runs:1000},evmVersion:"paris",outputSelection:{"*":{"*":["abi","evm.bytecode","evm.deployedBytecode"]}}}},contract:{name:"Token",sourcePath:"Token.sol",abi:[],bytecode:"6000",deployedBytecode:"00"}};
const show=(item=record,getBuild=vi.fn().mockResolvedValue(build),saveProgress?:any)=>{
  const view=render(<ChakraProvider><StrictMode><DeploymentVerification record={item} getBuild={getBuild} saveProgress={saveProgress}/></StrictMode></ChakraProvider>);return {...view,getBuild};
};
afterEach(()=>{cleanup();vi.resetAllMocks();});
it("waits for an explicit provider choice and reuses the shared status component",async()=>{
  mocks.id.mockResolvedValue("identity");mocks.sourcify.mockResolvedValue({state:"verified"});
  const {getBuild}=show();expect(getBuild).not.toHaveBeenCalled();expect(mocks.sourcify).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Verify on Sourcify"}));
  await screen.findByText("Source verified on Sourcify");
  expect(mocks.sourcify).toHaveBeenCalledTimes(1);expect(mocks.etherscan).not.toHaveBeenCalled();
  expect(mocks.sourcify).toHaveBeenCalledWith(11155111,record.address,expect.objectContaining({contractName:"Token.sol:Token",compilerVersion:"v0.8.30+commit.73712a01",creationTransactionHash:record.hash,licenseType:"3"}));
  expect(screen.getByRole("link",{name:"View contract on Sourcify"}).getAttribute("href")).toBe(`https://repo.sourcify.dev/11155111/${record.address}`);
});
it("submits the saved Standard JSON and original arguments to the Etherscan flow",async()=>{
  mocks.id.mockResolvedValue("identity");mocks.etherscan.mockResolvedValue({state:"already_verified"});
  show();fireEvent.click(screen.getByRole("button",{name:"Verify on Etherscan"}));
  await screen.findByText("Source verified on Etherscan");
  expect(mocks.etherscan).toHaveBeenCalledTimes(1);
  const request=mocks.etherscan.mock.calls[0][0];expect(request).toMatchObject({operation:"submit",hash:record.hash,address:record.address,bytecode:"6000",sourceId:"identity",retry:false});
  expect(JSON.parse(request.source.sourceCode)).toEqual(build.input);
  expect(request.source.constructorArguments).toBe("");expect(mocks.sourcify).not.toHaveBeenCalled();
});
it("does not offer verification before confirmation or for unsupported networks",()=>{
  const pending=show({...record,status:"pending",address:undefined});expect(screen.queryByRole("button",{name:/Verify on/})).toBeNull();expect(pending.getBuild).not.toHaveBeenCalled();pending.unmount();
  show({...record,chainId:-1});expect(screen.queryByRole("button",{name:/Verify on/})).toBeNull();
});
it("fails locally if the immutable saved build cannot be loaded",async()=>{
  show(record,vi.fn().mockRejectedValue(new Error("Saved build unavailable")));
  fireEvent.click(screen.getByRole("button",{name:"Verify on Sourcify"}));
  await screen.findByText("Saved build unavailable");expect(mocks.sourcify).not.toHaveBeenCalled();expect(mocks.etherscan).not.toHaveBeenCalled();
});

it("restores confirmed verification after reload without fetching source or submitting",async()=>{
  const {getBuild}=show({...record,verification:{sourcify:{state:"verified",sourceId:"identity",updatedAt:1}}});
  await screen.findByText("Source verified on Sourcify");
  expect(getBuild).not.toHaveBeenCalled();expect(mocks.sourcify).not.toHaveBeenCalled();expect(mocks.status).not.toHaveBeenCalled();
});
it("resumes a saved Sourcify job by GUID without another submission",async()=>{
  mocks.status.mockResolvedValue({state:"verified"});
  const {getBuild}=show({...record,verification:{sourcify:{state:"pending",guid:"saved-guid",sourceId:"identity",updatedAt:1}}});
  await screen.findByText("Source verified on Sourcify");
  expect(mocks.status).toHaveBeenCalledWith("sourcify","11155111",record.address,"saved-guid");
  expect(getBuild).not.toHaveBeenCalled();expect(mocks.sourcify).not.toHaveBeenCalled();
});
it("resumes the saved Etherscan server job without uploading the input again",async()=>{
  mocks.etherscan.mockResolvedValue({state:"verified"});
  const {getBuild}=show({...record,verification:{etherscan:{state:"pending",sourceId:"identity",updatedAt:1}}});
  await screen.findByText("Source verified on Etherscan");
  expect(mocks.etherscan.mock.calls[0][0]).toMatchObject({operation:"status",sourceId:"identity"});
  expect(mocks.etherscan.mock.calls[0][0].source).toBeUndefined();expect(getBuild).not.toHaveBeenCalled();
});
it("does not resubmit an interrupted upload, but allows an explicit retry",async()=>{
  mocks.id.mockResolvedValue("identity");mocks.status.mockResolvedValue({state:"unknown"});mocks.sourcify.mockResolvedValue({state:"verified"});
  show({...record,verification:{sourcify:{state:"submitting",sourceId:"identity",updatedAt:1}}});
  await screen.findByText(/submission response was lost/i);expect(mocks.sourcify).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Retry verification"}));
  await screen.findByText("Source verified on Sourcify");expect(mocks.sourcify).toHaveBeenCalledTimes(1);
});
it("persists submission intent before POST and saves the verified result",async()=>{
  mocks.id.mockResolvedValue("identity");const events:string[]=[];
  const save=vi.fn(async(_provider:any,progress:any)=>{events.push(progress.state);});
  mocks.sourcify.mockImplementation(async()=>{events.push("post");return {state:"verified"};});
  show(record,vi.fn().mockResolvedValue(build),save);
  fireEvent.click(screen.getByRole("button",{name:"Verify on Sourcify"}));
  await screen.findByText("Source verified on Sourcify");
  await waitFor(()=>expect(events).toEqual(["submitting","post","verified"]));
  expect(save).toHaveBeenLastCalledWith("sourcify",expect.objectContaining({state:"verified",sourceId:"identity"}));
});
it("replaces the Sourcify button in place before the remaining Etherscan button",async()=>{
  mocks.id.mockResolvedValue("identity");mocks.sourcify.mockResolvedValue({state:"pending",guid:"job"});
  show();fireEvent.click(screen.getByRole("button",{name:"Verify on Sourcify"}));
  const progress=await screen.findByText("Verifying source on Sourcify…");
  const etherscan=screen.getByRole("button",{name:"Verify on Etherscan"});
  expect(progress.compareDocumentPosition(etherscan)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
