# Global Address Book Implementation

## Overview

The global address book allows users to save and label Ethereum addresses, making them easily accessible across all subdomains (calldata.eth.sh, explorer.eth.sh, wallet.eth.sh, etc.). Labels are displayed inline with addresses throughout the app, with a distinctive purple styling to indicate they come from the user's address book.

## Architecture

### Cross-Subdomain Storage (iframe Hub Pattern)

Since different subdomains cannot share localStorage directly, we use an iframe hub pattern for cross-origin storage:

```
┌─────────────────────────────────────────────────────────┐
│  calldata.eth.sh / explorer.eth.sh / wallet.eth.sh     │
│  ┌─────────────────────────────────────────────────┐   │
│  │  AddressBookProvider                             │   │
│  │  - Sends postMessage to iframe                   │   │
│  │  - Receives responses via event listener         │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓ postMessage                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Hidden iframe (eth.sh/_storage)                 │   │
│  │  - Receives messages from parent                 │   │
│  │  - Reads/writes localStorage                     │   │
│  │  - Sends response back to parent                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Development Mode Fallback**: On localhost, all routes share the same origin, so the iframe is skipped and localStorage is used directly.

### Data Model

```typescript
// types/addressBook.ts
interface SavedAddressInfo {
  address: string;      // Checksummed address (normalized via viem's getAddress)
  label: string;        // User-defined label
  createdAt: number;    // Unix timestamp
  updatedAt: number;    // Unix timestamp
}
```

### Message Protocol

Communication between the parent window and iframe uses postMessage:

```typescript
// Request from parent to iframe
interface StorageRequest {
  id: string;           // Unique request ID for matching responses
  action: 'GET_ALL' | 'ADD' | 'REMOVE' | 'UPDATE';
  payload?: any;
}

// Response from iframe to parent
interface StorageResponse {
  id: string;
  success: boolean;
  data?: SavedAddressInfo[];
  error?: string;
}
```

## File Structure

### Core Files

| File | Purpose |
|------|---------|
| `/types/addressBook.ts` | TypeScript interfaces for data model and messages |
| `/app/_storage/page.tsx` | Hidden iframe hub page on main domain |
| `/lib/addressBook/storageHub.ts` | Client library for iframe communication |
| `/contexts/AddressBookContext.tsx` | React context for global state management |
| `/hooks/useAddressBook.ts` | Hook for consuming the address book context |

### UI Components

| File | Purpose |
|------|---------|
| `/components/AddressBook/AddressBookDrawer.tsx` | Right-side drawer for managing all addresses |
| `/components/AddressBook/AddressBookButton.tsx` | Small button for address inputs to select from book |
| `/components/AddressBook/AddressBookSelector.tsx` | Modal for selecting an address from the book |
| `/components/AddressBook/AddressLabelModal.tsx` | Modal for saving/editing/deleting a specific address label |
| `/components/AddressBook/index.ts` | Barrel exports |

### Integration Points

| File | Integration |
|------|-------------|
| `/app/providers.tsx` | Wraps app with `AddressBookProvider`, renders drawer and selector |
| `/components/Navbar.tsx` | Book icon button to open the drawer |
| `/components/fnParams/inputs/AddressInput.tsx` | `[book]` button to select addresses |
| `/components/decodedParams/AddressParam.tsx` | Displays labels inline, save/edit buttons |
| `/app/explorer/ExplorerLayout.tsx` | Shows labels for searched addresses |

## Features

### 1. Global Drawer (Navbar)

- Accessible from the book icon in the navbar on any page
- Add new addresses with labels
- Search/filter existing addresses
- Edit or delete entries inline

### 2. Address Input Integration

In `AddressInput.tsx`, a `[book]` button appears next to `[zeroAddr]` and connected wallet buttons. Clicking it opens the selector modal to quickly insert a saved address.

### 3. Address Display Integration

In `AddressParam.tsx` (used for decoded calldata, function results, etc.):

- **Display Mode Cycling**: Toggle button cycles through available views:
  - **Label** (purple): Shows the address book label with book icon
  - **Name**: Shows ENS name with avatar
  - **Address**: Shows the raw address

- **Inline Styling**: When showing label, the input has:
  - Purple background (`purple.900`)
  - Purple border (`purple.500`)
  - Book icon on the left
  - Purple text color (`purple.100`)

- **Save/Edit Buttons**:
  - If address is NOT saved: Book + Plus icon on the left opens save modal
  - If address IS saved: Edit icon on the right opens edit modal

### 4. Save/Edit Modal

The `AddressLabelModal` provides a focused interface for:
- Saving a new address with a custom label
- Editing an existing label
- Deleting an address from the book (edit mode only)

Features:
- Pre-fills with ENS name as default label when saving new addresses
- Shows truncated address for reference
- Purple-themed focus state
- Delete button (red) on left, Cancel/Save buttons on right

### 5. Explorer Integration

In the Explorer page (`ExplorerLayout.tsx`):
- Shows address book label with purple tag when viewing a saved address
- Book + Plus button to save new addresses
- Edit button to modify existing labels
- Select from book button to search saved addresses

## Storage Details

### Storage Keys

- **Current**: `global-address-book` - New format with timestamps
- **Legacy**: `address-book` - Old format (auto-migrated)

### Migration

On initialization, the storage hub client checks for legacy data and migrates it:

```typescript
// Old format
[{ address: string, label: string }]

// New format
[{ address: string, label: string, createdAt: number, updatedAt: number }]
```

### Address Normalization

All addresses are normalized using viem's `getAddress()` before storing or looking up, ensuring consistent checksummed format.

## Context API

```typescript
interface AddressBookContextValue {
  // State
  addresses: SavedAddressInfo[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;

  // CRUD operations
  addAddress: (address: string, label: string) => Promise<void>;
  removeAddress: (address: string) => Promise<void>;
  updateAddress: (address: string, label: string) => Promise<void>;

  // Lookup utilities
  getLabel: (address: string) => string | null;
  getLabelOrSliced: (address: string) => string;

  // Drawer UI state
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;

  // Selector UI state
  isSelectorOpen: boolean;
  openSelector: (onSelect: (address: string) => void) => void;
  closeSelector: () => void;
  onAddressSelect: ((address: string) => void) | null;
}
```

## Usage Examples

### Reading a label

```typescript
import { useAddressBook } from "@/hooks/useAddressBook";

function MyComponent({ address }) {
  const { getLabel, isReady } = useAddressBook();

  const label = isReady ? getLabel(address) : null;

  return label ? <span>{label}</span> : <span>{address}</span>;
}
```

### Opening the save/edit modal

```typescript
import { useState } from "react";
import { AddressLabelModal } from "@/components/AddressBook";
import { useAddressBook } from "@/hooks/useAddressBook";

function MyComponent({ address }) {
  const { getLabel } = useAddressBook();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const existingLabel = getLabel(address);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        {existingLabel ? "Edit" : "Save"}
      </button>
      <AddressLabelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        address={address}
        existingLabel={existingLabel}
        defaultLabel=""
      />
    </>
  );
}
```

### Opening the drawer

```typescript
import { useAddressBook } from "@/hooks/useAddressBook";

function MyComponent() {
  const { openDrawer } = useAddressBook();

  return <button onClick={openDrawer}>Open Address Book</button>;
}
```

### Selecting an address

```typescript
import { useAddressBook } from "@/hooks/useAddressBook";

function MyComponent({ onAddressSelected }) {
  const { openSelector } = useAddressBook();

  return (
    <button onClick={() => openSelector(onAddressSelected)}>
      Select from Book
    </button>
  );
}
```

## UI/UX Details

### Color Scheme

- **Purple** (`purple.500`, `purple.900`, `purple.100`): Address book labels
- **Blue** (`blue.400`, `blue.500`): Contract/token tags from external sources

### Password Manager Prevention

Address inputs in the drawer use attributes to prevent password manager autofill:
```tsx
autoComplete="off"
autoCorrect="off"
autoCapitalize="off"
spellCheck="false"
data-1p-ignore
data-lpignore="true"
data-form-type="other"
```

### Modal Scroll Fix

Modals use these props to prevent page scroll jumping on close:
```tsx
blockScrollOnMount={false}
returnFocusOnClose={false}
```

## Legacy Component

The old `AddressBook.tsx` component has been renamed to `AddressBookLegacy.tsx` and marked as deprecated. It should not be used in new code.
