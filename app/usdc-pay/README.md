# USDC Pay

A gasless USDC payment interface powered by the x402 protocol and PayAI facilitator.

## Features

- ✅ **Gasless Transfers**: Users only sign - no gas fees required
- ✅ **Dynamic Payments**: Send any amount to any address
- ✅ **ENS/Basename Support**: Resolve ENS names and Basenames
- ✅ **Farcaster Username Support**: Send to Farcaster users (e.g., `@username`)
- ✅ **Multi-Network**: Supports Base and Base Sepolia
- ✅ **No API Keys**: Uses PayAI public facilitator

## How It Works

1. **User Experience**:
   - User enters recipient address (or ENS/Basename or Farcaster username)
   - User enters USDC amount
   - User clicks "Pay" and signs with wallet (single signature!)
   - Transaction is processed by PayAI facilitator (no gas paid by user)
   - Success toast with transaction hash

2. **Technical Flow**:

   ```
   Frontend (x402-axios) → POST /api/usdc-pay
                         ← 402 Payment Required (X-Facilitator-Url: /api/facilitator)

   x402-axios → GET /api/facilitator/supported?chainId=8453
              ← Returns USDC EIP-712 details (name, version, chainId, verifyingContract)

   User signs with wallet using correct EIP-712 domain

   Frontend → POST /api/usdc-pay (with X-PAYMENT header)
            → POST /api/facilitator/verify (proxies to PayAI)
            ← Signature valid ✅
            → POST /api/facilitator/settle (proxies to PayAI)
            ← Transaction submitted 🎉
            ← 200 Success with transaction hash
   ```

## Architecture

### Frontend (`page.tsx`)

- Chakra UI for beautiful mobile-first design
- ENS/Basename/Farcaster username resolution with avatar display
- Number pad interface for amount input
- Real-time USDC balance display
- Integration with `x402-axios` for payment handling

### API Endpoints

**`/api/usdc-pay/route.ts`** - Main payment endpoint

- Accepts dynamic `to` address and `amount`
- Returns 402 Payment Required with proper EIP-712 details
- Verifies and settles payments via PayAI facilitator
- Uses facilitator proxy for proper EIP-712 domain info

**`/api/facilitator/supported/route.ts`** - Facilitator proxy

- Returns USDC EIP-712 signing details (name, version, chainId, verifyingContract)
- Enables x402-axios to create correct signatures
- Required because PayAI's `/supported` doesn't include EIP-712 details

**`/api/facilitator/verify/route.ts`** - Verification proxy

- Forwards payment verification to PayAI

**`/api/facilitator/settle/route.ts`** - Settlement proxy

- Forwards payment settlement to PayAI

### Token Constants (`data/tokens.ts`)

- Centralized USDC addresses for Base and Base Sepolia
- USDC ABI for common operations
- Shared between frontend and backend

### Farcaster Integration (`utils/farcaster.ts`)

- Neynar API integration for username resolution
- Fetches user's verified ETH address or custody address
- Supports profile picture display

## Dependencies

```json
{
  "x402-axios": "^0.7.0",
  "axios": "^1.8.2",
  "lodash": "^4.17.21"
}
```

Note: Removed `thirdweb` and `facilitators` dependencies in favor of a simpler direct implementation.

## Environment Variables

For Farcaster username resolution, you'll need a Neynar API key:

```bash
NEYNAR_API_KEY=your_neynar_api_key_here
```

Get your API key from [Neynar](https://neynar.com/).

## Usage

### Access the interface:

- Base Mainnet: `/usdc-pay`
- Base Sepolia: `/usdc-pay?testnet=true`

### Code Example:

```typescript
// Frontend payment call
const axiosInstance = withPaymentInterceptor(axios.create(), walletClient);

const response = await axiosInstance.post("/api/usdc-pay", {
  to: "0x...",
  amount: "10.50",
  network: "base",
});
```

## Benefits of x402 Protocol

1. **Gasless for Users**: Facilitator pays the gas
2. **Better UX**: Single signature instead of two transactions
3. **Payment Infrastructure**: Built-in payment verification and settlement
4. **No Backend Wallet**: No need to manage server-side wallets or private keys

## Technical Deep Dive

### Why the Facilitator Proxy?

PayAI's facilitator doesn't return EIP-712 domain details in its `/supported` endpoint, which x402-axios needs to create proper signatures. Our proxy endpoints solve this by:

1. **`/api/facilitator/supported`**: Returns complete EIP-712 domain parameters (name, version, chainId, verifyingContract)
2. **`/api/facilitator/verify`** & **`/settle`**: Forward requests to PayAI

This ensures x402-axios creates signatures with the exact EIP-712 domain that PayAI expects for verification.

### The Critical Fix

The payment requirements **must** include:

```json
{
  "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "extra": {
    "name": "USD Coin", // ← Required for EIP-712 domain.name
    "version": "2" // ← Required for EIP-712 domain.version
  }
}
```

Without these, x402 creates a signature with `undefined` domain values, causing PayAI verification to fail.

## References

- [x402 Protocol](https://github.com/coinbase/x402)
- [PayAI Facilitator](https://payai.network)
- [Thirdweb x402 Docs](https://portal.thirdweb.com/payments/x402/server)
