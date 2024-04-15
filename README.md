<img alt="Swiss Knife Logo" src=".github/logo.png" />

All your EVM tools in one place: https://swiss-knife.xyz/

## List of Tools

1. [Explorer](https://explorer.swiss-knife.xyz/): Quickly view any address/ens or transaction across a variety explorers, in just a click!
2. [Calldata](https://calldata.swiss-knife.xyz/decoder): Decode any calldata, and view the parameters in a human-readable format, even without having the contract ABI.
3. [Transact](https://transact.swiss-knife.xyz/send-tx): Send custom bytes calldata to transact with any contract, or leave the address blank to deploy a new contract.
4. [Converter](https://converter.swiss-knife.xyz/eth): All the essential unit converters on one-page. Convert between:
   1. Ether, wei & gwei
   2. Hexadecimal, decimal & binary
   3. String or hex to keccack256 hash & 4 bytes selector
   4. Hex to 32 bytes left-padded & right-padded values
5. [Constants](https://constants.swiss-knife.xyz/): Have frequently used constants at your fingertips, like Zero Address, Max Uint256, etc.
6. [Epoch-Converter](https://epoch-converter.swiss-knife.xyz/): Grab unix timestamp, get timestamp `x` minutes/hours/days in the future, or convert timestamp to human-readable format.
7. [Storage-Slots](https://storage-slots.swiss-knife.xyz/): Query EIP-1967 slots or custom storage slot value of any contract.
8. [Uniswap](https://uniswap.swiss-knife.xyz/tick-to-price): Calculator to convert UniswapV3 tick to price for any token pair addresses.
9. [Character Counter](https://character-counter.swiss-knife.xyz/): Count the length of the input string. Also allows to select on the input text to only get the character count for the selection.
10. [Contract Address](https://contract-address.swiss-knife.xyz/): Determine the contract address which will get deployed by an address at a particular nonce

## Setup

1. This repository is a Nextjs 14 project. To run it locally, clone the repo and run the following commands:
   ```bash
   pnpm i
   ```
2. Copy `.env.example` to `.env.local` and fill in the required values.
3. Run the dev server:
   ```bash
   pnpm dev
   ```
   Visit http://localhost:3000 to view the app.

## Contributing

### To add a new Explorer

1. For an address explorer, modify [./data/addressExplorers.ts](./data/addressExplorers.ts)
2. For a transaction explorer, modify [./data/txExplorers.ts](./data/txExplorers.ts)
