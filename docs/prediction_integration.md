# Prediction Widget - Blockchain Integration

## Overview

The prediction widget has been updated to integrate with the Sui blockchain smart contract. Predictions are now created and stored on-chain as shared objects.

## What Changed

### Smart Contract (`prediction.move`)
- ✅ Removed `store` ability from `Prediction` struct (predictions can only be shared, never owned)
- ✅ Made `create_prediction()` private (internal use only)
- ✅ `create_and_share()` is the only public way to create predictions
- ✅ Eliminated the `share_owned` linter warning

### Frontend (`PredictionWidget.tsx`)
- ✅ Integrated `create_and_share()` for creating predictions on blockchain
- ✅ Integrated `place_bet()` for placing bets via smart contract
- ✅ Added loading states and error handling
- ✅ Added `PACKAGE_ID` and `CLOCK_ID` configuration

## Deployment Steps

### 1. Deploy Smart Contract

```bash
cd Tai_contract
sui client publish --gas-budget 100000000
```

Save the Package ID from the output (e.g., `0xabcd1234...`)

### 2. Configure Frontend

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
```

### 3. Test the Flow

1. **Host creates a prediction:**
   - Calls `create_and_share(question, duration_ms, clock)`
   - Transaction creates a shared `Prediction` object
   - Object ID can be extracted from `PredictionCreated` event

2. **Users place bets:**
   - Calls `place_bet(prediction_id, side, payment, clock)`
   - Adds SUI to yes/no pool
   - Tracks bet amount per user

3. **Host resolves prediction:**
   - Calls `resolve(prediction_id, outcome, clock)`
   - Sets winning side
   - Starts 5-minute challenge window

4. **Winners claim payouts:**
   - Calls `claim_winnings(prediction_id, clock)`
   - Calculates pro-rata share of losing pool (minus 5% fee)
   - Returns winnings as SUI coin

## TODO: Indexing & Querying

Currently, the frontend doesn't query predictions from the blockchain. You need to add:

### Option A: Event Listening
Listen for `PredictionCreated` events in the room:

```typescript
const subscription = suiClient.subscribeEvent({
  filter: {
    MoveEventType: `${PACKAGE_ID}::prediction::PredictionCreated`
  },
  onMessage: (event) => {
    // Add prediction to UI
  }
});
```

### Option B: Object Querying
Query all shared `Prediction` objects:

```typescript
const predictions = await suiClient.getOwnedObjects({
  filter: {
    StructType: `${PACKAGE_ID}::prediction::Prediction`
  }
});
```

### Option C: Indexer (Recommended)
Use a Sui indexer service to efficiently query predictions by:
- Room ID (needs to be added to Prediction struct)
- Creator address
- Status (open/resolved)
- Time range

## Architecture Benefits

✅ **Type-safe:** Predictions can only be shared objects (enforced by compiler)
✅ **No owned-share bug:** Removed `store` ability eliminates runtime abort risk
✅ **Immediate visibility:** Predictions exist on-chain immediately when created
✅ **No race conditions:** Shared objects handle concurrent betting correctly
✅ **Provably fair:** All bets and outcomes are on-chain and auditable

## Constants

- **Platform Fee:** 5% of losing pool (500 basis points)
- **Challenge Window:** 5 minutes (300,000 ms)
- **Clock Object:** `0x6` (Sui system clock)

## Next Steps

1. Deploy contract to testnet
2. Update `NEXT_PUBLIC_PACKAGE_ID` in frontend
3. Implement event listening or indexing for real-time predictions
4. Add room_id field to Prediction struct for filtering by stream
5. Test full prediction lifecycle end-to-end
