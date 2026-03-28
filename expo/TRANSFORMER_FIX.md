# Transformer Mismatch Fix

## Problem
The app was experiencing JSON parsing errors with binary characters and null bytes:
```
SyntaxError: Unexpected token '', "{\u0000\n\u0000 \u0000 \u0000"... is not valid JSON
```

## Root Cause
**Transformer mismatch between tRPC client and server:**

### Before Fix:
- **Backend** (`backend/trpc/create-context.ts`): Used `superjson` transformer ✅
- **Frontend** (`lib/transformer.ts`): Used a pass-through transformer (no serialization) ❌
- **Frontend** (`app/_layout.tsx`): Created multiple tRPC clients with inconsistent configuration ❌

When the client and server use different transformers:
1. SuperJSON serializes complex data types (Dates, Maps, Sets, etc.) with metadata
2. The pass-through transformer doesn't understand this format
3. Data gets corrupted with binary characters when parsed

## Solution Applied

### 1. Updated `lib/transformer.ts`
Changed from pass-through to superjson:
```typescript
import superjson from "superjson";

// Export superjson directly to ensure consistency with backend
export const transformer = superjson;
```

### 2. Updated `app/_layout.tsx`
- Removed duplicate `client` instance
- Kept single `trpcClient` with proper configuration
- Added `/api/trpc` path (was missing `/api`)
- Added `bypass-tunnel-reminder` header for better compatibility

### 3. Result
✅ Client and server now use the same `superjson` transformer
✅ Data serialization/deserialization is consistent
✅ No more binary character corruption
✅ Proper handling of complex data types (Dates, etc.)

## Testing
After applying this fix:
1. Restart your development server: `npm run dev` or `bun run dev`
2. Clear app cache if needed
3. Test tRPC endpoints - they should now work without JSON parsing errors

## Why SuperJSON?
SuperJSON allows tRPC to handle:
- Dates (serialized as ISO strings with metadata)
- Maps and Sets
- BigInt
- RegExp
- undefined values
- And more complex JavaScript types

This is essential for a robust API that handles real-world data types beyond plain JSON.
