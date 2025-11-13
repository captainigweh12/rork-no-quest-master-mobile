# Auth Context Undefined Error Fix

## Problem
The app was crashing with the error:
```
Cannot destructure property 'user' of '(0 , _AuthContext.useAuth)(...)' as it is undefined.
```

## Root Cause
Multiple context providers were using `const { user } = useAuth();` at the top level of their hook functions. When using the `@nkzw/create-context-hook` library, there's a race condition during initialization where `useAuth()` can return `undefined` before the AuthContext is fully mounted.

## Solution
Changed all destructuring assignments to safely handle undefined contexts:

### Files Fixed
1. **contexts/GameContext.tsx**
2. **contexts/NotificationsContext.tsx**
3. **contexts/StreamContext.tsx**
4. **contexts/SubscriptionContext.tsx**
5. **contexts/LocalizationContext.tsx**

### Pattern Applied
```typescript
// Before (WRONG):
const { user } = useAuth();

// After (CORRECT):
const authContext = useAuth();
const user = authContext?.user;
```

This pattern safely handles the case where `useAuth()` returns `undefined` during initial mount, preventing the destructuring error.

## Testing
To verify the fix:
1. Restart the development server
2. Refresh the app
3. Check that the app loads without the destructuring error

## Why This Happens
The `createContextHook` utility from `@nkzw/create-context-hook` doesn't provide built-in error handling for when hooks are called before their provider is ready. Since contexts are initialized in sequence in the provider tree (AuthProvider → GameProvider → NotificationsProvider, etc.), there can be a brief moment where child contexts try to access parent contexts that haven't fully initialized yet.

## Prevention
When creating new contexts that depend on AuthContext:
- Always use optional chaining when accessing the auth context
- Never destructure directly from `useAuth()` at the component/hook top level
- Consider adding runtime checks if auth data is required
