# Calldata Encoder — Technical Implementation

The Calldata Encoder (`/calldata/encoder`) is the reverse of the Calldata Decoder. It takes user-provided types and values and produces ABI-encoded hex output. It lives at `app/calldata/encoder/` and is registered in `subdomains.js` under `CALLDATA.paths`.

## File Structure

```
app/calldata/encoder/
├── page.tsx                   # Next.js route — metadata + renders CalldataEncoderPage
├── CalldataEncoderPage.tsx     # Main UI component (~1900 lines)
└── implementation.md           # This file

lib/
├── encoder.ts                 # Pure encoding functions (no React)
└── convertBooleans.ts         # Bool string→boolean conversion for viem
```

## Encoding Library (`lib/encoder.ts`)

All encoding is done through pure functions that wrap [viem](https://viem.sh/) primitives. No React dependencies.

### Functions

| Function | Input | Output | Viem Wrapper |
|---|---|---|---|
| `encodeStandard` | `AbiParameter[]`, `values[]` | `Hex` | `encodeAbiParameters` |
| `encodePackedParams` | `string[]` (types), `values[]` | `Hex` | `encodePacked` |
| `encodeFunction` | `Abi`, `functionName`, `args[]` | `Hex` (selector + args) | `encodeFunctionData` |
| `encodeFunctionManual` | `functionName`, `ManualParamType[]`, `values[]` | `Hex` (selector + args) | Builds ABI on-the-fly, then `encodeFunctionData` |
| `encodeConstructorArgs` | `AbiParameter[]`, `args[]` | `Hex` (no selector) | `encodeAbiParameters` |
| `encodeSafeMultiSend` | `SafeMultiSendTx[]` | `Hex` (multiSend calldata) | Manual packing + `encodeFunctionData` |

### `encodeFunctionManual`

Used by Manual mode when a function name is provided. Constructs a minimal ABI fragment from the user's type definitions (including nested tuple components via `ManualParamType.components`) and delegates to `encodeFunctionData`.

### `encodeSafeMultiSend`

Packs each transaction as: `operation(1B) + to(20B) + value(32B) + dataLength(32B) + data(variable)`. Concatenates all packed transactions, then wraps in `multiSend(bytes)` calldata using a hardcoded ABI fragment matching [Safe's MultiSend contract](https://github.com/safe-global/safe-contracts/blob/main/contracts/libraries/MultiSend.sol).

## Boolean Conversion (`lib/convertBooleans.ts`)

Input components store all values as strings. Viem's encoding requires actual `boolean` values for `bool` types. `convertBooleans` recursively walks the input type tree and converts `"true"`/`"false"` strings to `true`/`false`. Handles: `bool`, `bool[]`, `bool[N]`, and `tuple` types containing bool components.

## Page Component (`CalldataEncoderPage.tsx`)

### Architecture

```
CalldataEncoderPage (Suspense wrapper)
└── CalldataEncoderPageContent (all state + logic)
    ├── Mode selector tabs: Manual | From ABI | From Address
    ├── Safe MultiSend checkbox
    ├── Mode-specific input UI (renderManualMode / renderAbiMode / renderFromAddressMode / renderMultiSendMode)
    ├── Encode button
    └── Result output section
```

The component is wrapped in `Suspense` because it uses client-side hooks (`useSearchParams` etc. from child components).

### Input Modes

#### 1. Manual Mode (`selectedTabIndex === 0`)

The user builds parameters from scratch.

**State:** `manualParams: ManualParam[]` where each param has `{ type, name, value, components? }`.

**UI per parameter:**
- Header row: index badge `[0]`, type selector (grouped `DarkSelect`, creatable), name input (optional), delete button
- Value row: delegated to `renderInputFields` from the shared `fnParams/Renderer.tsx` system (reuses `IntInput`, `AddressInput`, `BytesInput`, `BoolInput`, `StringInput`, `TupleInput`, `ArrayInput`)

**Tuple handling:**
- `tuple` type: merged inline cards — each field shows type selector + name input + value input together
- `tuple[]` type: separate "TUPLE STRUCTURE" definition block (type + name per field), then a single `ArrayInput` that renders the structure for each array entry

**Function Name (optional):**
- Always visible `Section` with an `InputField`
- When provided: output = 4-byte selector + ABI-encoded args (uses `encodeFunctionManual`)
- When empty: output = raw `abi.encode` result, with a second "Packed" tab showing `abi.encodePacked`

**Generated ABI section:**
- Collapsible section that builds and displays the ABI JSON from the manual params
- Rendered in a read-only Monaco Editor with `json` language for syntax highlighting
- Uses `p.name` if provided, falls back to `param_${idx}` / `field_${ci}`

#### 2. From ABI Mode (`selectedTabIndex === 1`)

The user pastes a JSON ABI.

**State:** `abi` (raw JSON string), `parsedFunctions`, `selectedFunction`, `functionInputs`, `inputsState`

**Flow:**
1. User pastes ABI into Monaco Editor
2. `useEffect` parses it, extracts all functions + constructor into `parsedFunctions`
3. Auto-selects first function (or re-matches current selection on re-parse)
4. Selected function's inputs are rendered via `renderInputFields`
5. Encoding uses `encodeFunction` (or `encodeConstructorArgs` if constructor is selected)

**Constructor:** Appears as `"constructor"` in the function dropdown (value: `"__constructor__"`). Output has no selector.

#### 3. From Address Mode (`selectedTabIndex === 2`)

Same as From ABI but fetches ABI from a block explorer.

**State:** `contractAddress`, `chainId`, `selectedNetworkOption`, `fetchedAbi`, `isFetchingAbi`

**Flow:**
1. User enters address via `AddressInput` (supports ENS, address book, ERC-3770 format like `eth:0x...`)
2. Selects chain via `DarkSelect` with `networkOptions`
3. Clicks "Fetch ABI" → calls `fetchContractAbi` from `@/utils`
4. If contract is not verified, `fetchContractAbiRaw` throws with the API's error message (e.g. "Contract source code not verified")
5. On success, stores ABI in `fetchedAbi` and renders same function picker + inputs as From ABI mode
6. Fetched ABI is shown in a collapsible section

#### 4. Safe MultiSend Mode (checkbox, any tab)

Toggled via a checkbox. Overrides whatever tab is selected.

**State:** `multiSendTxs: SafeMultiSendTx[]` — array of `{ operation, to, value, data }`

**UI per transaction:**
- `DarkSelect` for operation (CALL / DELEGATECALL)
- `AddressInput` for `to` (ENS resolution, address book)
- `IntInput` for `value` (with Ether/Gwei/Wei format selector, defaults to Wei)
- `BytesInput` for `data` (with zero-fill buttons)

Encoding uses `encodeSafeMultiSend`.

### Result Output

Results are cleared automatically whenever any input state changes (via a `useEffect` watching all input-related state). This prevents showing stale results.

**Result display logic varies by mode:**

| Mode | Result Tabs |
|---|---|
| Manual (no function name) | Standard \| Packed |
| Manual (with function name) | Single result (selector highlighted blue) |
| From ABI / From Address (function) | Full Calldata \| Params Only → Standard \| Packed |
| From ABI / From Address (constructor) | Single result (no selector) |
| Safe MultiSend | Single result (selector highlighted blue) |

**Selector highlighting:** When the result contains a 4-byte function selector (detected via `hasSelector`), the first 10 characters (`0x` + 8 hex chars) are rendered in `primary.400` (blue) with semibold weight.

**Params Only tab (ABI/Address modes):** For non-constructor functions, the encoder also computes:
- `encodedParamsOnly`: standard ABI encoding of just the params (no selector)
- `encodedParamsOnlyPacked`: packed encoding of just the params

These are shown under a "Params Only" tab with Standard/Packed sub-tabs.

### State Management Summary

```
Tab selection:       selectedTabIndex (0=Manual, 1=ABI, 2=Address)
Safe MultiSend:      isSafeMultiSend (boolean checkbox)

Manual mode:         manualParams[], manualFunctionName
ABI mode:            abi (string), parsedFunctions[], selectedFunction, functionInputs[], inputsState{}
Address mode:        contractAddress, chainId, selectedNetworkOption, fetchedAbi, isFetchingAbi
MultiSend:           multiSendTxs[]

Results:             encodedResult, encodedResultPacked, packedError,
                     encodedParamsOnly, encodedParamsOnlyPacked, paramsOnlyPackedError,
                     resultTabIndex, paramsSubTabIndex, isEncoding, isError

UI:                  isAbiOpen (collapsible ABI display), isGeneratedAbiOpen (generated ABI)
```

### Key Effects

1. **ABI parsing** (`[abi, fetchedAbi, selectedTabIndex]`): Parses JSON ABI, extracts functions + constructor, auto-selects function
2. **Function selection** (`[selectedFunction, parsedFunctions]`): Updates `functionInputs` and resets `inputsState` when function changes
3. **Network selection** (`[selectedNetworkOption]`): Syncs `chainId` from dropdown
4. **Clear on tab switch** (`[selectedTabIndex]`): Clears all results + resets multiSend
5. **Clear on input change** (`[manualParams, manualFunctionName, isSafeMultiSend, multiSendTxs, abi, fetchedAbi, selectedFunction, inputsState]`): Clears stale results immediately

### Reused Components

| Component | From | Used For |
|---|---|---|
| `renderInputFields` | `fnParams/Renderer.tsx` | Routes types to specialized inputs |
| `AddressInput` | `fnParams/inputs/AddressInput.tsx` | Address fields with ENS, address book |
| `IntInput` | `fnParams/inputs/IntInput.tsx` | Integer fields with unit conversion |
| `BytesInput` | `fnParams/inputs/BytesInput.tsx` | Bytes fields with zero-fill buttons |
| `DarkSelect` | `components/DarkSelect.tsx` | Dropdowns (type picker, function picker, chain, operation) |
| `InputField` | `components/InputField.tsx` | Generic text input with dark theme |
| `TabsSelector` | `components/Tabs/TabsSelector.tsx` | Tab switching UI |
| `CopyToClipboard` | `components/CopyToClipboard.tsx` | Copy button for encoded result |
| `DarkButton` | `components/DarkButton.tsx` | Primary action buttons |
| `Editor` | `@monaco-editor/react` | ABI input + generated ABI display |

### Type Options

Types are presented in grouped `DarkSelect` dropdowns (creatable, so users can type custom types):

- **Common**: address, bool, bytes, bytes32, int256, string, tuple, uint256
- **Arrays**: address[], bool[], bytes[], bytes32[], int256[], string[], tuple[], uint256[]
- **Unsigned Integers**: uint8, uint16, uint32, uint64, uint128
- **Signed Integers**: int8, int16, int32, int64, int128
- **Fixed Bytes**: bytes1, bytes2, bytes4, bytes8, bytes16, bytes20

Tuple component selectors use the same groups but without `tuple`/`tuple[]` (no nested tuple definitions in the UI).
