import type { LibraryReference } from "@/lib/solidity/libraries";
export interface CompilerError {
  type?: string;
  severity: string;
  formattedMessage: string;
  message?: string;
  errorCode?: string;
  sourceLocation?: { file: string; start: number; end: number };
}

export interface ContractOutput {
  abi: any[];
  evm: {
    bytecode: {
      object: string;
      linkReferences?: Record<string, Record<string, {start:number;length:number}[]>>;
    };
    deployedBytecode: {
      object: string;
      linkReferences?: Record<string, Record<string, {start:number;length:number}[]>>;
    };
  };
}

export interface CompiledContract {
  requiredLibraries?: LibraryReference[];
  sourcePath: string;
  name: string;
  abi: any[];
  bytecode: string;
  deployedBytecode: string;
}

export interface CompileOutput {
  errors?: CompilerError[];
  contracts?: {
    [fileName: string]: {
      [contractName: string]: ContractOutput;
    };
  };
}

export interface CompileResult {
  error?: string;
  contracts?: {
    [contractName: string]: CompiledContract;
  };
  warnings?: CompilerError[];
  diagnostics?: CompilerError[];
}

export interface WorkerMessage {
  libraryReferences?: Record<string, Record<string, LibraryReference[]>>;
  id?: number;
  type?: "ready" | "load-error";
  success?: boolean;
  output?: CompileOutput;
  error?: string;
}
