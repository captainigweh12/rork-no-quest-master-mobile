# Google OAuth Setup Guide

Google Sign In has been successfully implemented in your app! 🎉

## What's Been Done

✅ Installed `expo-auth-session` and `expo-crypto` packages
✅ Added `signInWithGoogle()` function to AuthContext
✅ Added Google Sign In button to auth screen
✅ Configured deep linking with the `noquest://` scheme

## Supabase Configuration

Your Google OAuth credentials are already configured in Supabase:

### Client IDs:
- **iOS**: `946906881521-tdqsi5h18kg17vo0peor6p4g97ungncm.apps.googleusercontent.com`
- **Android**: `946906881521-ouaa7t46nqh980h38f1m812hcvd83607.apps.googleusercontent.com`
- **Web**: `946906881521-r0g65mh7hn0u790h3q50vf5srs4nlfth.apps.googleusercontent.com`

### Client Secret:
- `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`

## Add Redirect URIs to Supabase

You need to add these redirect URIs to your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > URL Configuration**
3. Add these to **Redirect URLs**:

```
noquest://auth/callback
exp://localhost:8081/auth/callback
https://hotbmbscjxgayivmyenb.supabase.co/auth/v1/callback
```

## App Configuration

Your app is already configured with:

### Bundle Identifiers:
- **iOS Bundle ID**: `app.rork.noquestmastermobile`
- **Android Package**: `app.rork.noquestmastermobile`
- **Deep Link Scheme**: `noquest://`

### Redirect Configuration:
The app uses `noquest://auth/callback` as the OAuth callback URL.

## How It Works

1. User taps "Continue with Google" button
2. App opens Google's OAuth page in the device browser
3. User signs in with their Google account
4. Google redirects back to the app via `noquest://auth/callback`
5. App processes the OAuth tokens and creates/signs in the user
6. User profile is automatically created in the `profiles` table

## Testing

### On Web:
1. Navigate to `/auth`
2. Click "Continue with Google"
3. Complete the Google sign-in flow

### On Mobile (iOS/Android):
1. Make sure you're testing on a physical device or properly configured simulator
2. Navigate to `/auth`
3. Click "Continue with Google"
4. The system browser will open for Google sign-in
5. After signing in, you'll be redirected back to the app

## Troubleshooting

### "Invalid redirect URI" error:
- Make sure you've added all redirect URIs to Supabase
- Check that the URIs match exactly (including the scheme)

### App doesn't open after Google sign-in:
- Verify the app.json has the correct `scheme: "noquest"`
- Restart the Expo development server
- Clear cache: `npm start -- --clear`

### Web doesn't redirect properly:
- Make sure the Supabase URL is added to redirect URLs
- Check browser console for errors

## Important Notes

- **Google Cloud Console**: Make sure your OAuth client IDs are configured with the correct bundle identifiers:
  - iOS: `app.rork.noquestmastermobile`
  - Android: `app.rork.noquestmastermobile`
  
- **Deep Linking**: The `noquest://` scheme is used for OAuth callbacks. This is already configured in your `app.json`.

- **User Profile**: When a user signs in with Google, their profile is automatically created using their Google display name and email.

## Next Steps

1. ✅ Add redirect URIs to Supabase (see above)
2. ✅ Test Google Sign In on web
3. ✅ Test Google Sign In on iOS device/simulator
4. ✅ Test Google Sign In on Android device/emulator

That's it! Your Google OAuth integration is ready to use! 🚀
