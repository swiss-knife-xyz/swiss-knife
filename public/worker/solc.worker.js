importScripts(
  "https://binaries.soliditylang.org/bin/soljson-v0.8.30+commit.73712a01.js"
);

self.addEventListener("message", function (e) {
  const { code } = e.data;

  try {
    const input = {
      language: "Solidity",
      sources: {
        "contract.sol": {
          content: code,
        },
      },
      settings: {
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.deployedBytecode"],
          },
        },
      },
    };

    const output = JSON.parse(
      Module.cwrap("solidity_compile", "string", ["string", "number"])(
        JSON.stringify(input),
        0
      )
    );

    self.postMessage({ success: true, output });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
});
