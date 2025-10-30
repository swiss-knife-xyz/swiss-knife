export interface CompilerError {
  severity: string;
  formattedMessage: string;
}

export interface ContractOutput {
  abi: any[];
  evm: {
    bytecode: {
      object: string;
    };
    deployedBytecode: {
      object: string;
    };
  };
}

export interface CompiledContract {
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
}

export interface WorkerMessage {
  success: boolean;
  output?: CompileOutput;
  error?: string;
}
