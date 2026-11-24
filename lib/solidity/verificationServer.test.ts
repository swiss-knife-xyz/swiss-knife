import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { CompilerDeploymentVerification } from "./verificationServer";
import { MemoryJobStore } from "../verification/store";
import { normalizeInput } from "../verification/normalize";
import { verificationIdentity } from "./verificationInput";
const address="0x2222222222222222222222222222222222222222",hash=`0x${"ab".repeat(32)}`,bytecode="60006000";
const source=normalizeInput({language:"Solidity",sources:{"Token.sol":{content:"// SPDX-License-Identifier: MIT\npragma solidity ^0.8.30; contract Token {constructor(uint amount){}}"}},settings:{optimizer:{enabled:true,runs:1000}}},"Token.sol:Token","v0.8.30+commit.73712a01","00".repeat(31)+"07","3");
const sourceId=createHash("sha256").update(verificationIdentity(source,bytecode)).digest("hex");
function fixture(){
  let now=100000,posts=0,verified=false,lose=false,input=`0x${bytecode}${source.constructorArguments}`;
  const key="PRIVATE_TEST_COMPILER_KEY";
  const fetcher:typeof fetch=async(url,init)=>{
    const parsed=new URL(String(url));assert.equal(parsed.hostname,"api.etherscan.io");assert.equal(parsed.searchParams.get("apikey"),key);
    if(init?.method==="POST"){
      posts++;const form=new URLSearchParams(String(init.body));
      assert.equal(form.get("contractname"),"Token.sol:Token");assert.equal(form.get("compilerversion"),source.compilerVersion);
      assert.deepEqual(JSON.parse(form.get("sourceCode")!),JSON.parse(source.sourceCode));assert.equal(form.get("constructorArguments"),source.constructorArguments);
      if(lose)throw new Error(key);
      return Response.json({status:"1",result:"verification-guid-123"});
    }
    if(parsed.searchParams.get("action")==="getsourcecode")return Response.json({status:"1",result:[{SourceCode:verified?"published":""}]});
    return Response.json({status:verified?"1":"0",result:verified?"Pass - Verified":"Pending in queue"});
  };
  const service=new CompilerDeploymentVerification({key:()=>key,store:new MemoryJobStore(()=>now),now:()=>now,fetch:fetcher,
    client:()=>({getTransaction:async()=>({to:null,input:input as `0x${string}`}),getTransactionReceipt:async()=>({status:"success",contractAddress:address})})});
  const request=(change:Record<string,unknown>={},origin="http://localhost:3000")=>new Request("http://localhost:3000/api/solidity/verification",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({operation:"submit",chainId:11155111,address,hash,sourceId,source,bytecode,...change})});
  const status=()=>request({operation:"status",source:undefined,bytecode:undefined});
  return {service,request,status,posts:()=>posts,verify:()=>{verified=true;now+=6000;},lose:()=>{lose=true;},mismatch:()=>{input="0xdead";},advance:()=>{now+=6000;},key};
}
test("submits the saved compiler input and exact constructor data, then polls without another submission",async()=>{
  const f=fixture();let response=await f.service.handle(f.request());assert.equal((await response.json()).state,"pending");assert.equal(f.posts(),1);
  f.advance();response=await f.service.handle(f.request());assert.equal((await response.json()).state,"pending");assert.equal(f.posts(),1);
  f.verify();response=await f.service.handle(f.status());assert.ok(["verified","already_verified"].includes((await response.json()).state));assert.equal(f.posts(),1);
});
test("rejects mismatched deployment calldata and tampered source identity before submitting",async()=>{
  const f=fixture();f.mismatch();let response=await f.service.handle(f.request());assert.equal((await response.json()).error,"SOURCE_MISMATCH");assert.equal(f.posts(),0);
  response=await f.service.handle(f.request({sourceId:"f".repeat(64)}));assert.equal(response.status,400);assert.equal(f.posts(),0);
});
test("rejects cross-origin calls, key-bearing requests and remote source URLs",async()=>{
  const f=fixture();assert.equal((await f.service.handle(f.request({},"https://evil.example"))).status,400);
  assert.equal((await f.service.handle(f.request({apiKey:"do-not-accept-client-keys"}))).status,400);
  const remote={...source,sourceCode:JSON.stringify({language:"Solidity",sources:{"Token.sol":{urls:["https://private.example/source"]}},settings:{}})};
  const response=await f.service.handle(f.request({source:remote}));assert.equal((await response.json()).state,"failed");assert.equal(f.posts(),0);
});
test("lost responses do not expose the key or automatically resend source",async()=>{
  const f=fixture();f.lose();const response=await f.service.handle(f.request());const text=await response.text();assert.ok(!text.includes(f.key));assert.equal(JSON.parse(text).state,"unknown");
  f.advance();await f.service.handle(f.status());assert.equal(f.posts(),1);
});
