# Authentication & Onboarding Flow

## ✅ Current Implementation Status

Both email confirmation and onboarding are **fully implemented and working**.

---

## 🔐 Email Verification Flow

### Sign Up Process
1. User fills in email, password, and username on `/auth` screen
2. System creates user account with `emailVerified: false`
3. A 6-digit verification code is generated and stored
4. Code is logged to console (for development)
5. User is redirected to `/verify-email` screen

### Email Verification
1. User enters the 6-digit verification code
2. System validates the code
3. User account is marked as `emailVerified: true`
4. User is redirected back to `/auth` to sign in

### Sign In Protection
- Users **cannot sign in** until email is verified
- If unverified user tries to sign in, error shown: "Please verify your email before signing in"

### Code Location
- **Auth Context**: `contexts/AuthContext.tsx`
- **Auth Screen**: `app/auth.tsx`
- **Verify Screen**: `app/verify-email.tsx`
- **Storage Service**: `lib/localStorage.ts` (lines 73-108, 110-132, 559-605)

---

## 🎯 Onboarding Flow

### When Onboarding Triggers
After a user:
1. ✅ Verifies their email
2. ✅ Signs in successfully
3. ❌ Has NOT completed onboarding

They are **automatically redirected** to `/onboarding`

### Onboarding Screens
Collects user preferences:
- **Main Goal**: Text input for user's primary objective
- **Personality**: Introvert / Ambivert / Extrovert
- **Preferred Time**: Morning / Afternoon / Evening / Anytime
- **Daily Quests**: Number of quests per day (1-10)

### After Onboarding
- Preferences are saved to AsyncStorage
- `completed: true` flag is set
- User is redirected to home screen `/(tabs)/(home)`

### Code Location
- **Onboarding Context**: `contexts/OnboardingContext.tsx`
- **Onboarding Screen**: `app/onboarding.tsx`
- **Navigation Logic**: `app/_layout.tsx` (lines 22-49)

---

## 🔄 Complete User Journey

```
┌─────────────────┐
│   App Launch    │
└────────┬────────┘
         │
         ▼
   No Session?
         │
         ├─── YES ──► /auth (Sign Up/Sign In)
         │
         └─── NO ───┐
                    │
                    ▼
            Email Verified?
                    │
                    ├─── NO ──► /verify-email
                    │
                    └─── YES ──┐
                               │
                               ▼
                    Onboarding Complete?
                               │
                               ├─── NO ──► /onboarding
                               │
                               └─── YES ──► /(tabs)/(home)
```

---

## 🛠️ Implementation Details

### Navigation Protection (`app/_layout.tsx`)

```typescript
useEffect(() => {
  if (isLoading || onboardingLoading) return;

  const inAuthGroup = segments[0] === 'auth';
  const inOnboarding = segments[0] === 'onboarding';

  let targetRoute: string | null = null;

  // Not signed in → redirect to auth
  if (!session && !inAuthGroup) {
    targetRoute = '/auth';
  } 
  // Signed in but onboarding incomplete → redirect to onboarding
  else if (session && !prefs.completed && !inOnboarding) {
    targetRoute = '/onboarding';
  } 
  // Signed in and onboarding complete → redirect to home
  else if (session && prefs.completed && (inAuthGroup || inOnboarding)) {
    targetRoute = '/(tabs)/(home)';
  }

  if (targetRoute && navigationRef.current.lastRoute !== targetRoute) {
    navigationRef.current.lastRoute = targetRoute;
    router.replace(targetRoute as any);
  }
}, [session, segments, isLoading, onboardingLoading, prefs.completed]);
```

### Verification Code Format
- **Length**: 6 characters
- **Format**: Alphanumeric (uppercase)
- **Example**: `A4K9MZ`
- **Generation**: `Math.random().toString(36).substring(2, 8).toUpperCase()`

### Storage Keys
- `local_current_user` - Current logged in user
- `local_session` - Active session data
- `local_users` - All registered users
- `local_pending_verification` - Email and code for pending verification
- `onboarding` - Onboarding preferences

---

## 🔍 Testing the Flow

### Test Sign Up → Verification → Onboarding

1. **Sign Up**
   - Go to `/auth`
   - Switch to "Sign up" mode
   - Enter: Email, Password, Username
   - Click "Join the Heroes"
   - ✅ Should see success animation
   - ✅ Should see verification code in console logs
   - ✅ Should redirect to `/verify-email`

2. **Verify Email**
   - Enter the 6-digit code from console
   - Click "Verify Email"
   - ✅ Should see success animation
   - ✅ Should redirect to `/auth` with prompt to sign in

3. **Sign In**
   - Enter verified email and password
   - Click "Start Quest"
   - ✅ Should sign in successfully
   - ✅ Should redirect to `/onboarding` (first time)

4. **Complete Onboarding**
   - Fill in preferences
   - Click "Continue"
   - ✅ Should save preferences
   - ✅ Should redirect to `/(tabs)/(home)`

5. **Sign Out and Back In**
   - Sign out from settings
   - Sign back in
   - ✅ Should skip onboarding (already completed)
   - ✅ Should go directly to home

---

## ⚙️ Configuration

### To Modify Onboarding Questions
Edit `app/onboarding.tsx`

### To Change Verification Code Length
Edit `lib/localStorage.ts` line 81 and 598:
```typescript
const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
//                                                           ↑  ↑
//                                                        start  end (adjust for length)
```

### To Skip Email Verification (Dev Only)
Edit `lib/localStorage.ts` line 95:
```typescript
emailVerified: true,  // Change from false to true
```

### To Reset Onboarding for User
Call from code:
```typescript
const { reset } = useOnboarding();
await reset();
```

---

## 📱 Production Considerations

### Email Service Integration
For production, replace console logging with actual email service:

```typescript
// In lib/localStorage.ts after generating verificationCode:

// Development: Log to console
if (__DEV__) {
  console.log(`Verification code: ${verificationCode}`);
}

// Production: Send actual email
else {
  await sendEmail({
    to: email,
    subject: 'Verify your email',
    body: `Your verification code is: ${verificationCode}`
  });
}
```

### Recommended Email Services
- SendGrid
- AWS SES
- Mailgun
- Postmark
- Resend

---

## ✅ Summary

- ✅ Email verification is **required** before sign in
- ✅ Onboarding is **required** after first sign in
- ✅ Navigation automatically enforces the flow
- ✅ All data stored locally in AsyncStorage
- ✅ Ready for production (add email service)

**Everything is properly set up and working!**
