<img alt="ETH.sh Logo" src=".github/logo.png" />

All your EVM tools in one place: https://eth.sh/

## List of Tools

1. [Explorer](https://explorer.eth.sh/): Quickly view any address/ens or transaction across a variety explorers, in just a click!
2. [Calldata](https://calldata.eth.sh/decoder): Decode or encode calldata. View parameters in a human-readable format, even without the contract ABI.
3. [Transact](https://transact.eth.sh/send-tx): Send custom bytes calldata to transact with any contract, or leave the address blank to deploy a new contract.
4. [Converter](https://converter.eth.sh/eth): All the essential unit converters on one-page. Convert between:
   1. Ether, wei & gwei
   2. Hexadecimal, decimal & binary
   3. String or hex to keccack256 hash & 4 bytes selector
   4. Hex to 32 bytes left-padded & right-padded values
   5. Address to checksum/lowercase format
5. [Constants](https://constants.eth.sh/): Have frequently used constants at your fingertips, like Zero Address, Max Uint256, etc.
6. [Epoch-Converter](https://epoch-converter.eth.sh/): Grab unix timestamp, get timestamp `x` minutes/hours/days in the future, or convert timestamp to human-readable format.
7. [Storage-Slots](https://storage-slots.eth.sh/): Query EIP-1967 slots or custom storage slot value of any contract.
8. [Uniswap](https://uniswap.eth.sh/tick-to-price): Calculator to convert UniswapV3 tick to price for any token pair addresses.
9. [Character Counter](https://character-counter.eth.sh/): Count the length of the input string. Also allows to select on the input text to only get the character count for the selection.
10. [Determine Address](https://determine-address.eth.sh/): Determine the contract address using CREATE or CREATE2 opcode.
11. [Contract Diff](https://contract-diff.eth.sh/): Compare verified contract source code across different chains.
12. [Foundry](https://foundry.eth.sh/forge-stack-tracer-ui): Visualize forge test stack traces in a collapsible, easy-to-navigate UI.
13. [Wallet](https://wallet.eth.sh/): Suite of wallet tools:
    1. [Bridge](https://wallet.eth.sh/bridge): WalletConnect bridge to use any dapp with your wallet.
    2. [DS Proxy](https://wallet.eth.sh/ds-proxy): Interact with MakerDAO DS Proxy contracts.
    3. [Signatures](https://wallet.eth.sh/signatures): Verify and sign messages or EIP-712 typed data.
14. [ENS](https://ens.eth.sh/): ENS tools:
    1. [History](https://ens.eth.sh/history): View ENS name ownership and record history.
    2. [CCIP](https://ens.eth.sh/ccip): Debug CCIP Read (EIP-3668) resolution for ENS names.
15. [7702Beat](https://7702beat.eth.sh/): Stats about EIP-7702 adoption across EVM chains, wallets and dapps.
16. [Safe](https://safe.eth.sh/): Tools for Gnosis Safe multisig:
    1. [EIP-712 Hash](https://safe.eth.sh/eip-712-hash): Calculate EIP-712 typed data hashes for Safe transactions.
    2. [Calldata Decoder](https://safe.eth.sh/calldata-decoder): Decode Safe transaction calldata.
17. [Web3 App Store](https://apps.eth.sh/): Browse and use dapps in an embedded browser with your connected wallet.
18. [Solidity Compiler](https://solidity.eth.sh/): Compile Solidity contracts directly in the browser.
19. [USDC Pay](https://usdc-pay.eth.sh/): Send USDC payments on Base. Supports ENS, Basename, and Farcaster username resolution.

## Setup

1. This repository is a Nextjs 14 project. To run it locally, clone the repo and run the following commands:
   ```bash
   pnpm i
   ```
2. Copy `.example.env.local` to `.env.local` and fill in the required values.
3. Run the dev server:
   ```bash
   pnpm dev
   ```
   Visit http://localhost:3000 to view the app.

## Contributing

### To add a new Explorer

1. For an address explorer, modify [./data/addressExplorers.ts](./data/addressExplorers.ts)
2. For a transaction explorer, modify [./data/txExplorers.ts](./data/txExplorers.ts)
