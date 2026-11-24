import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { AUTO_COMPILE_DELAY, useSolidityCompiler } from "./useSolidityCompiler";
import { inlineDiagnostics } from "@/lib/solidity/diagnostics";
import { syncDiagnosticMarkers } from "./diagnosticMarkers";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: { id: number; sources: Record<string, { content: string }> }[] = [];
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(data: (typeof this.messages)[number]) {
    this.messages.push(data);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: unknown) {
    act(() => this.onmessage?.(new MessageEvent("message", { data })));
  }
  finish(index = 0, output: unknown = { contracts: {} }) {
    this.emit({ id: this.messages[index].id, success: true, output });
  }
}
const source = (content = "contract Counter {}", workspaceId = "one") => ({
  workspaceId,
  workspace: {
    files: [{ id: workspaceId + "-file", name: "Counter.sol", content }],
    activeFileId: workspaceId + "-file",
    openFileIds: [workspaceId + "-file"],
  } satisfies SolidityWorkspace,
  paused: false,
  autoCompile: true,
});
const tick = (ms = AUTO_COMPILE_DELAY) => act(() => vi.advanceTimersByTime(ms));
beforeEach(() => {
  vi.useFakeTimers();
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function mount(props: Parameters<typeof useSolidityCompiler>[0] = source()) {
  const hook = renderHook((input) => useSolidityCompiler(input), {
    initialProps: props,
  });
  const worker = FakeWorker.instances[0];
  worker.emit({ type: "ready" });
  return { ...hook, worker };
}
it("auto-compiles by default only after typing settles and avoids duplicate work", () => {
  const { worker, rerender, result } = mount({
    ...source(),
    autoCompile: undefined,
  });
  tick(AUTO_COMPILE_DELAY - 1);
  expect(worker.messages).toHaveLength(0);
  rerender(source("contract Counter {uint a;}"));
  tick(300);
  rerender(source("contract Counter {uint amount;}"));
  tick(AUTO_COMPILE_DELAY - 1);
  expect(worker.messages).toHaveLength(0);
  tick(1);
  expect(worker.messages).toHaveLength(1);
  expect(result.current.isCompiling).toBe(true);
  worker.finish();
  tick(5000);
  expect(worker.messages).toHaveLength(1);
  expect(result.current.result).toEqual({ contracts: {}, warnings: [] });
});
it("keeps one request in flight, coalesces edits and rejects stale errors", () => {
  const { worker, rerender, result } = mount();
  tick();
  rerender(source("contract Counter {uint a;}"));
  tick();
  rerender(source("contract Counter {uint b;}"));
  tick();
  expect(worker.messages).toHaveLength(1);
  worker.finish(0, {
    errors: [
      {
        severity: "error",
        formattedMessage: "OLD ERROR",
        sourceLocation: { file: "Counter.sol", start: 0, end: 3 },
      },
    ],
  });
  expect(result.current.result).toBeNull();
  expect(worker.messages).toHaveLength(2);
  expect(worker.messages[1].sources["Counter.sol"].content).toContain("uint b");
  worker.finish(1);
  expect(result.current.result?.error).toBeUndefined();
  expect(result.current.isCompiling).toBe(false);
});
it("waits for the latest debounce when an obsolete compile finishes during typing", () => {
  const { worker, rerender } = mount();
  tick();
  rerender(source("contract Counter {uint next;}"));
  tick(100);
  worker.finish();
  expect(worker.messages).toHaveLength(1);
  tick(AUTO_COMPILE_DELAY - 101);
  expect(worker.messages).toHaveLength(1);
  tick(1);
  expect(worker.messages).toHaveLength(2);
});
it("discards results across workspace switches without locking navigation", () => {
  const { worker, rerender, result } = mount();
  tick();
  rerender(source("contract Other {}", "two"));
  tick();
  worker.finish();
  expect(result.current.result).toBeNull();
  expect(worker.messages).toHaveLength(2);
  worker.finish(1);
  expect(result.current.diagnosticBuild?.input.workspaceId).toBe("two");
});
it("turns off queued auto-compilation while retaining explicit Compile", () => {
  const { worker, rerender, result } = mount();
  rerender({ ...source(), autoCompile: false });
  tick(5000);
  expect(worker.messages).toHaveLength(0);
  act(() => result.current.compile());
  expect(worker.messages).toHaveLength(1);
  worker.finish();
  rerender({ ...source("contract Changed {}"), autoCompile: false });
  tick(5000);
  expect(worker.messages).toHaveLength(1);
  expect(result.current.stale).toBe(true);
  expect(result.current.diagnosticBuild).toBeNull();
  act(() => result.current.compile());
  worker.finish(1);
  expect(result.current.stale).toBe(false);
});
it("pauses checks while deployment is pending, preserving its build until resumed", () => {
  const { worker, rerender, result } = mount();
  tick();
  worker.finish();
  const build = result.current.result;
  rerender({ ...source("contract Changed {}"), paused: true });
  tick(5000);
  expect(worker.messages).toHaveLength(1);
  expect(result.current.result).toBe(build);
  rerender(source("contract Changed {}"));
  tick();
  expect(worker.messages).toHaveLength(2);
  rerender({ ...source("contract Changed {}"), paused: true });
  worker.finish(1);
  expect(result.current.result).toBe(build);
  rerender(source("contract Changed {}"));
  tick();
  expect(worker.messages).toHaveLength(2);
  // Resume reuses the finished immutable build instead of compiling it again.
  expect(result.current.result).not.toBe(build);
  expect(result.current.stale).toBe(false);
});
it("marks dependency edits stale, clears their diagnostics and skips unrelated edits", () => {
  const props = source('import "./Base.sol"; contract Counter {}');
  props.workspace.files.push(
    { id: "base", name: "Base.sol", content: "contract Base {}" },
    { id: "other", name: "Other.sol", content: "contract Other {}" }
  );
  const { worker, rerender, result } = mount(props);
  tick();
  worker.finish();
  const unrelated = {
    ...props,
    workspace: {
      ...props.workspace,
      files: props.workspace.files.map((file) =>
        file.id === "other"
          ? { ...file, content: "contract Elsewhere {}" }
          : file
      ),
    },
  };
  rerender(unrelated);
  tick();
  expect(worker.messages).toHaveLength(1);
  expect(result.current.stale).toBe(false);
  rerender({
    ...props,
    workspace: {
      ...props.workspace,
      files: props.workspace.files.map((file) =>
        file.id === "base" ? { ...file, content: "broken" } : file
      ),
    },
  });
  expect(result.current.stale).toBe(true);
  expect(result.current.diagnosticBuild).toBeNull();
  tick();
  expect(worker.messages).toHaveLength(2);
});
it("times out a stuck compiler, supports retry and cleans workers/timers on unmount", () => {
  const { worker, result, unmount } = mount();
  tick();
  tick(30000);
  expect(worker.terminated).toBe(true);
  expect(result.current.state).toBe("failed");
  expect(result.current.error).toContain("timed out");
  act(() => result.current.reload());
  const next = FakeWorker.instances[1];
  next.emit({ type: "ready" });
  tick();
  expect(next.messages).toHaveLength(1);
  unmount();
  expect(next.terminated).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it("maps UTF-8 compiler ranges to exact Monaco positions and keeps severities", () => {
  const content = '// ⚡ café\r\ncontract C { string s = unicode"😀"; bad; }';
  const start = new TextEncoder().encode(
    content.slice(0, content.indexOf("bad"))
  ).length;
  const markers = inlineDiagnostics(content, "C.sol", [
    {
      severity: "error",
      formattedMessage: "long error",
      message: "Undeclared identifier.",
      errorCode: "7576",
      sourceLocation: { file: "C.sol", start, end: start + 3 },
    },
    {
      severity: "warning",
      formattedMessage: "warning",
      sourceLocation: { file: "C.sol", start: 0, end: 2 },
    },
    {
      severity: "error",
      formattedMessage: "other file",
      sourceLocation: { file: "Other.sol", start: 0, end: 2 },
    },
    {
      severity: "error",
      formattedMessage: "no position",
      sourceLocation: { file: "C.sol", start: -1, end: -1 },
    },
  ]);
  expect(markers).toHaveLength(2);
  expect(markers[0]).toMatchObject({
    severity: "error",
    message: "Undeclared identifier.",
    code: "7576",
    startLineNumber: 2,
    startColumn: content.split("\n")[1].indexOf("bad") + 1,
  });
  expect(markers[0].endColumn - markers[0].startColumn).toBe(3);
  expect(markers[1].severity).toBe("warning");
});
it("only marks matching source models and clears markers after edits or a fix", () => {
  const props = source("bad");
  const { worker, result, rerender } = mount(props);
  tick();
  worker.finish(0, {
    errors: [
      {
        severity: "error",
        formattedMessage: "error",
        sourceLocation: { file: "Counter.sol", start: 0, end: 3 },
      },
    ],
  });
  const model = {
    uri: { scheme: "ethsh-solidity", path: "/one-file" },
    getValue: () => "bad",
    validateRange: (range: unknown) => range,
  };
  const setModelMarkers = vi.fn();
  const monaco = {
    MarkerSeverity: { Error: 8, Warning: 4 },
    editor: {
      getModels: () => [model, { uri: { scheme: "inmemory" } }],
      setModelMarkers,
    },
  };
  syncDiagnosticMarkers(
    monaco as never,
    props.workspace,
    result.current.diagnosticBuild
  );
  expect(setModelMarkers.mock.calls[0][2][0].severity).toBe(8);
  rerender(source("contract Fixed {}"));
  syncDiagnosticMarkers(
    monaco as never,
    props.workspace,
    result.current.diagnosticBuild
  );
  expect(setModelMarkers.mock.lastCall?.[2]).toEqual([]);
  tick();
  worker.finish(1);
  model.getValue = () => "contract Fixed {}";
  syncDiagnosticMarkers(
    monaco as never,
    source("contract Fixed {}").workspace,
    result.current.diagnosticBuild
  );
  expect(setModelMarkers.mock.lastCall?.[2]).toEqual([]);
});

it("invalidates results and the compilation cache when compiler settings change", () => {
  const props = source();
  const { worker, rerender, result } = mount(props);
  tick();
  worker.finish();
  expect(result.current.stale).toBe(false);
  rerender({
    ...props,
    workspace: {
      ...props.workspace,
      compilerSettings: {
        version: "soljson-v0.8.30+commit.73712a01.js",
        optimizer: true,
        runs: 1000,
        evmVersion: "paris",
        viaIR: true,
      },
    },
  } as Parameters<typeof useSolidityCompiler>[0]);
  expect(result.current.stale).toBe(true);
  expect(result.current.build?.input.settings.runs).toBe(200);
  tick();
  expect(worker.messages).toHaveLength(2);
  expect(worker.messages[1]).toMatchObject({
    input: {
      settings: {
        optimizer: { enabled: true, runs: 1000 },
        evmVersion: "paris",
        viaIR: true,
      },
    },
  });
  worker.finish(1);
  expect(result.current.stale).toBe(false);
});
it("terminates an old compiler on version changes and ignores its late response", () => {
  const props = source();
  const { worker, rerender, result } = mount(props);
  tick();
  rerender({
    ...props,
    workspace: {
      ...props.workspace,
      compilerSettings: {
        version: "soljson-v0.8.24+commit.e11b9ed9.js",
        optimizer: false,
        runs: 200,
        evmVersion: "default",
        viaIR: false,
      },
    },
  } as Parameters<typeof useSolidityCompiler>[0]);
  expect(worker.terminated).toBe(true);
  expect(result.current.state).toBe("loading");
  worker.finish();
  expect(result.current.result).toBeNull();
  const next = FakeWorker.instances[1];
  next.emit({ type: "ready" });
  tick();
  expect(next.messages).toHaveLength(1);
  next.finish();
  expect(result.current.state).toBe("ready");
  expect(result.current.stale).toBe(false);
});

function twoTabs() {
  return {workspaceId:"tabs", paused:false, autoCompile:true, workspace:{
    files:[{id:"a",name:"A.sol",content:'import "./Base.sol"; contract A {}'},
      {id:"b",name:"B.sol",content:"contract B {}"},
      {id:"base",name:"Base.sol",content:"contract Base {}"}],
    activeFileId:"a",openFileIds:["a","b"],
  }};
}
it("restores each tab's build and diagnostics immediately without another worker request",()=>{
  const props=twoTabs();const {worker,rerender,result}=mount(props);
  tick();worker.finish();const a=result.current.result;
  rerender({...props,workspace:{...props.workspace,activeFileId:"b"}});
  tick();worker.finish(1);const b=result.current.result;
  rerender(props);
  expect(result.current.result).toBe(a);
  expect(result.current.compiledFileName).toBe("A.sol");
  expect(result.current.stale).toBe(false);
  expect(result.current.diagnosticBuild?.input.entryId).toBe("a");
  expect(result.current.isCompiling).toBe(false);
  rerender({...props,workspace:{...props.workspace,activeFileId:"b"}});
  expect(result.current.result).toBe(b);
  tick(5000);expect(worker.messages).toHaveLength(2);
});
it("invalidates a cached tab when an imported source changes while another tab is active",()=>{
  const props=twoTabs();const {worker,rerender,result}=mount(props);
  tick();worker.finish();
  rerender({...props,workspace:{...props.workspace,activeFileId:"b"}});
  tick();worker.finish(1);
  const edited={...props,workspace:{...props.workspace,files:props.workspace.files.map(f=>f.id==="base"?{...f,content:"contract ChangedBase {}"}:f)}};
  rerender({...edited,workspace:{...edited.workspace,activeFileId:"b"}});
  expect(result.current.stale).toBe(false);
  rerender(edited);expect(result.current.stale).toBe(true);
  expect(result.current.diagnosticBuild).toBeNull();
  tick();expect(worker.messages).toHaveLength(3);
  expect(worker.messages[2].sources["Base.sol"].content).toContain("ChangedBase");
});
it("reuses offscreen work when returning to a tab while another compilation is running",()=>{
  const props=twoTabs();const {worker,rerender,result}=mount(props);
  tick();
  rerender({...props,workspace:{...props.workspace,activeFileId:"b"}});tick();
  worker.finish();expect(worker.messages).toHaveLength(2);
  rerender(props);
  expect(result.current.compiledFileName).toBe("A.sol");
  expect(result.current.stale).toBe(false);
  expect(result.current.isCompiling).toBe(false);
  worker.finish(1);
  expect(result.current.compiledFileName).toBe("A.sol");
  tick(5000);expect(worker.messages).toHaveLength(2);
});
it("keeps explicit Compile as a forced rebuild even when the active tab is cached",()=>{
  const {worker,result}=mount();tick();worker.finish();
  act(()=>result.current.compile());
  expect(worker.messages).toHaveLength(2);
  expect(result.current.isCompiling).toBe(true);
  worker.finish(1);expect(result.current.isCompiling).toBe(false);
});
it("does not restore missing-import errors after a previously missing file is added",()=>{
  const props=twoTabs();props.workspace.files[0].content='import "./Missing.sol"; contract A {}';
  const {worker,rerender,result}=mount(props);tick();
  worker.finish(0,{errors:[{severity:"error",formattedMessage:"Source missing"}]});
  rerender({...props,workspace:{...props.workspace,activeFileId:"b"}});tick();worker.finish(1);
  rerender({...props,workspace:{...props.workspace,files:[...props.workspace.files,
    {id:"missing",name:"Missing.sol",content:"contract Missing {}"}]}});
  expect(result.current.diagnosticBuild).toBeNull();tick();
  expect(worker.messages).toHaveLength(3);
  expect(worker.messages[2].sources["Missing.sol"]).toBeTruthy();
});
it("isolates cached builds across workspaces and restores them on returning",()=>{
  const one=source();const {worker,rerender,result}=mount(one);tick();worker.finish();
  const first=result.current.result;
  rerender(source("contract Other {}","two"));expect(result.current.result).toBeNull();
  tick();worker.finish(1);
  rerender(one);expect(result.current.result).toBe(first);
  expect(result.current.stale).toBe(false);tick();expect(worker.messages).toHaveLength(2);
});
it("restores the original build immediately after undoing source edits",()=>{
  const props=source();const {worker,rerender,result}=mount(props);tick();worker.finish();
  const original=result.current.result;
  rerender(source("contract Edited {}"));tick();worker.finish(1);
  rerender(props);
  expect(result.current.result).toBe(original);expect(result.current.stale).toBe(false);
  tick();expect(worker.messages).toHaveLength(2);
});
it("evicts old builds rather than growing the session cache indefinitely",()=>{
  const files=Array.from({length:11},(_,i)=>({id:`file-${i}`,name:`C${i}.sol`,content:`contract C${i} {}`}));
  const props={workspaceId:"many",paused:false,workspace:{files,activeFileId:files[0].id,openFileIds:files.map(f=>f.id)}};
  const {worker,rerender,result}=mount(props);tick();worker.finish();
  for(let i=1;i<files.length;i++) {
    rerender({...props,workspace:{...props.workspace,activeFileId:files[i].id}});
    tick();worker.finish(i);
  }
  rerender({...props,workspace:{...props.workspace,activeFileId:files[1].id}});
  expect(result.current.stale).toBe(false);tick();expect(worker.messages).toHaveLength(11);
  rerender(props);expect(result.current.stale).toBe(true);
  tick();expect(worker.messages).toHaveLength(12);
});
it("does not let an old cached success hide a failed explicit rebuild",()=>{
  const {worker,result}=mount();tick();worker.finish();
  act(()=>result.current.compile());
  worker.emit({id:worker.messages[1].id,success:false,error:"Compiler crashed"});
  expect(result.current.result?.error).toBe("Compiler crashed");
  act(()=>result.current.compile());expect(worker.messages).toHaveLength(3);
  worker.finish(2);expect(result.current.result?.error).toBeUndefined();
});
