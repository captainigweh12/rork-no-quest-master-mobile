# Comprehensive Testing Guide - Stale URL Fix

## Prerequisites

Before testing, ensure:
- ✅ Backend is running at `https://rork-no-quest-master-mobile.onrender.com`
- ✅ Development environment is set up
- ✅ React Native app can be run on simulator/device
- ✅ React Native Debugger or similar tool is available

---

## Test Suite 1: Automatic Stale URL Clearing (App Startup)

### Test 1.1: Detect and Clear rorkset.dev URL

**Setup:**
```javascript
// In React Native Debugger Console or via code:
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE', 'https://rorkset.dev/api');
```

**Steps:**
1. Set the stale URL using the code above
2. Close the app completely (swipe away from recent apps)
3. Restart the app
4. Open React Native Debugger console

**Expected Results:**
```
Console logs should show:
✅ [baseUrl] Loading URL override from storage...
✅ ⚠️ [baseUrl] Detected stale URL pattern in: https://rorkset.dev/api
✅ 🧹 [baseUrl] Clearing stale URL: https://rorkset.dev/api
✅ ✅ [baseUrl] Stale URL cleared successfully
✅ [TrpcProvider] ✅ Stale URL (rorkset.dev) was detected and cleared
✅ 🌐 Using default Base URL: https://rork-no-quest-master-mobile.onrender.com
```

**Pass Criteria:**
- [ ] Stale URL is detected in logs
- [ ] Stale URL is cleared automatically
- [ ] App uses correct Render URL
- [ ] No errors in console
- [ ] App functions normally

---

### Test 1.2: Detect and Clear rorktest.dev URL

**Setup:**
```javascript
await AsyncStorage.setItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE', 'https://rorktest.dev/api');
```

**Steps:**
1. Set the stale URL
2. Restart the app
3. Check console logs

**Expected Results:**
- Same as Test 1.1 but with `rorktest.dev` in the logs

**Pass Criteria:**
- [ ] rorktest.dev is detected as stale
- [ ] URL is cleared automatically
- [ ] App uses correct Render URL

---

### Test 1.3: No Action with Valid URL

**Setup:**
```javascript
await AsyncStorage.setItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE', 'https://rork-no-quest-master-mobile.onrender.com');
```

**Steps:**
1. Set a valid URL
2. Restart the app
3. Check console logs

**Expected Results:**
```
Console logs should show:
✅ 📡 Using AsyncStorage override Base URL: https://rork-no-quest-master-mobile.onrender.com
✅ No stale URL warnings
```

**Pass Criteria:**
- [ ] No stale URL detection
- [ ] Valid URL is preserved
- [ ] App functions normally

---

## Test Suite 2: Manual Clearing via UI

### Test 2.1: Clear Storage Screen with Stale URL

**Setup:**
```javascript
await AsyncStorage.setItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE', 'https://rorkset.dev/api');
```

**Steps:**
1. Set stale URL
2. Restart app
3. Navigate to Settings → API Debug (or directly to `/clear-storage`)
4. Observe the UI

**Expected Results:**
- [ ] ⚠️ Yellow warning banner appears at top
- [ ] Warning title: "⚠️ Stale URL Detected!"
- [ ] Warning text explains the issue
- [ ] Stale URL shown in red text: `https://rorkset.dev/api`
- [ ] Text states: "This URL contains 'rorkset.dev' which is no longer valid"
- [ ] Current Base URL section shows URL in red
- [ ] "⚠️ This is a stale URL" indicator appears below current URL
- [ ] "🧹 Clear Stale rorkset.dev URL" button appears (yellow background)
- [ ] Instructions section shows stale URL fix steps

**Pass Criteria:**
- [ ] All visual indicators present
- [ ] Warning banner styled correctly (yellow background, warning colors)
- [ ] Stale URL text is red
- [ ] Button is visible and enabled

---

### Test 2.2: Clear Stale URL Button Functionality

**Setup:**
Same as Test 2.1

**Steps:**
1. Navigate to `/clear-storage` with stale URL present
2. Tap "🧹 Clear Stale rorkset.dev URL" button
3. Observe behavior

**Expected Results:**
- [ ] Button shows loading indicator while processing
- [ ] Success message appears: "✅ Stale URL cleared successfully!"
- [ ] Alert dialog appears with message about restarting app
- [ ] Console shows: "🧹 [baseUrl] Clearing stale URL: https://rorkset.dev/api"
- [ ] Console shows: "✅ [baseUrl] Stale URL cleared successfully"

**Pass Criteria:**
- [ ] Button works correctly
- [ ] Success feedback provided
- [ ] Alert prompts user to restart
- [ ] No errors occur

---

### Test 2.3: Clear Storage Screen WITHOUT Stale URL

**Setup:**
```javascript
await AsyncStorage.removeItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
```

**Steps:**
1. Clear any URL override
2. Navigate to `/clear-storage`
3. Observe the UI

**Expected Results:**
- [ ] NO yellow warning banner
- [ ] NO "Clear Stale rorkset.dev URL" button
- [ ] Current Base URL shows default from .env (in normal color, not red)
- [ ] NO "⚠️ This is a stale URL" indicator
- [ ] Instructions show normal tRPC 404 fix steps (not stale URL steps)

**Pass Criteria:**
- [ ] UI correctly shows no stale URL state
- [ ] All other buttons still work
- [ ] No visual warnings present

---

### Test 2.4: Other Buttons Still Work

**Steps:**
1. Navigate to `/clear-storage`
2. Test each button:
   - "🎯 Force Set Render URL"
   - "🧹 Remove Override Key"
   - "Test Connection"
   - "📦 View AsyncStorage"

**Expected Results:**
- [ ] "Force Set Render URL" sets the Render URL and shows success
- [ ] "Remove Override Key" clears override and shows success
- [ ] "Test Connection" attempts connection and shows result
- [ ] "View AsyncStorage" displays storage contents

**Pass Criteria:**
- [ ] All buttons function correctly
- [ ] No interference from stale URL detection
- [ ] Appropriate feedback for each action

---

## Test Suite 3: Production Mode

### Test 3.1: Production Build Always Uses Render URL

**Setup:**
```bash
# Build production app
npm run build
# or
expo build:android
expo build:ios
```

**Steps:**
1. Build production version
2. Install on device
3. Run the app
4. Check console logs (if accessible)

**Expected Results:**
```
Console logs should show:
✅ [TrpcProvider] 🔧 Production: Forcing Render URL
✅ 🌐 Using default Base URL: https://rork-no-quest-master-mobile.onrender.com
```

**Pass Criteria:**
- [ ] Production build uses Render URL
- [ ] No stale URLs are used
- [ ] App connects to backend successfully

---

### Test 3.2: Production with Cached Stale URL

**Setup:**
1. Install production build
2. Manually set stale URL (if possible via debug tools)
3. Restart app

**Expected Results:**
- [ ] Stale URL is automatically cleared
- [ ] Render URL is enforced
- [ ] App functions normally

**Pass Criteria:**
- [ ] Production mode overrides any stale URLs
- [ ] App always uses correct URL

---

## Test Suite 4: Edge Cases

### Test 4.1: Multiple App Restarts

**Steps:**
1. Set stale URL
2. Restart app (should clear)
3. Restart app again
4. Restart app a third time

**Expected Results:**
- [ ] First restart: Stale URL cleared
- [ ] Second restart: No stale URL, uses Render URL
- [ ] Third restart: Still using Render URL, no issues

**Pass Criteria:**
- [ ] No repeated clearing attempts
- [ ] Stable behavior across restarts

---

### Test 4.2: Clear Button with No Stale URL

**Steps:**
1. Ensure no stale URL present
2. Navigate to `/clear-storage`
3. Manually call `handleClearStaleUrl()` if button not visible

**Expected Results:**
- [ ] Function returns gracefully
- [ ] Message: "ℹ️ No stale URL found to clear."
- [ ] No errors occur

**Pass Criteria:**
- [ ] Handles no-stale-URL case gracefully
- [ ] No crashes or errors

---

### Test 4.3: Network Failure During Clear

**Steps:**
1. Set stale URL
2. Disable network
3. Navigate to `/clear-storage`
4. Tap clear button

**Expected Results:**
- [ ] Clear operation still works (local AsyncStorage operation)
- [ ] Success message appears
- [ ] Network status doesn't affect clearing

**Pass Criteria:**
- [ ] Clear works offline
- [ ] No network-related errors

---

### Test 4.4: Rapid Button Taps

**Steps:**
1. Set stale URL
2. Navigate to `/clear-storage`
3. Rapidly tap "Clear Stale rorkset.dev URL" button multiple times

**Expected Results:**
- [ ] Button disables during operation
- [ ] Only one clear operation executes
- [ ] No duplicate alerts or errors

**Pass Criteria:**
- [ ] Button properly disabled during operation
- [ ] No race conditions

---

## Test Suite 5: Integration Tests

### Test 5.1: Full App Flow After Clearing

**Steps:**
1. Set stale URL
2. Restart app (auto-clear)
3. Navigate through app:
   - Home screen
   - Community
   - Create Quest
   - Profile
   - Settings

**Expected Results:**
- [ ] All screens load correctly
- [ ] No tRPC errors
- [ ] Backend connections work
- [ ] No stale URL issues

**Pass Criteria:**
- [ ] Entire app functions normally after clearing
- [ ] No residual issues

---

### Test 5.2: Backend Connection After Clear

**Steps:**
1. Clear stale URL
2. Test backend connection via "Test Connection" button
3. Try creating a quest or other backend operation

**Expected Results:**
- [ ] Test connection succeeds
- [ ] Backend operations work
- [ ] Correct URL is used for all requests

**Pass Criteria:**
- [ ] Backend connectivity restored
- [ ] All API calls use correct URL

---

## Test Suite 6: Visual/UI Tests

### Test 6.1: Warning Banner Styling

**Verify:**
- [ ] Background color: #FFF3CD (light yellow)
- [ ] Border color: #FFC107 (warning yellow)
- [ ] Border width: 2px
- [ ] Text color: #856404 (dark yellow/brown)
- [ ] Proper padding and margins
- [ ] Readable on all screen sizes

---

### Test 6.2: Stale URL Text Styling

**Verify:**
- [ ] Stale URL text color: #DC3545 (red)
- [ ] Font weight: 600 (semi-bold)
- [ ] Monospace font family
- [ ] Proper line breaks for long URLs

---

### Test 6.3: Button Styling

**Verify:**
- [ ] "Clear Stale URL" button: Yellow background (#FFC107)
- [ ] White text
- [ ] Proper padding (16px vertical)
- [ ] Rounded corners (8px)
- [ ] Loading indicator appears when processing

---

### Test 6.4: Responsive Design

**Test on:**
- [ ] Small phone (iPhone SE)
- [ ] Medium phone (iPhone 12)
- [ ] Large phone (iPhone 14 Pro Max)
- [ ] Tablet (iPad)

**Verify:**
- [ ] All text readable
- [ ] Buttons accessible
- [ ] No layout issues
- [ ] Proper scrolling

---

## Test Suite 7: Performance Tests

### Test 7.1: Stale URL Detection Performance

**Steps:**
1. Measure time to detect stale URL on app startup
2. Check for any delays or lag

**Expected Results:**
- [ ] Detection happens in < 100ms
- [ ] No noticeable delay in app startup
- [ ] No performance impact

---

### Test 7.2: Clear Operation Performance

**Steps:**
1. Measure time to clear stale URL
2. Check for UI responsiveness

**Expected Results:**
- [ ] Clear operation completes in < 500ms
- [ ] UI remains responsive
- [ ] No freezing or lag

---

## Test Results Summary

### Critical Tests (Must Pass)
- [ ] Test 1.1: Detect and clear rorkset.dev
- [ ] Test 2.1: UI shows stale URL warning
- [ ] Test 2.2: Clear button works
- [ ] Test 3.1: Production uses Render URL
- [ ] Test 5.2: Backend connection after clear

### Important Tests (Should Pass)
- [ ] Test 1.2: Detect rorktest.dev
- [ ] Test 2.3: UI without stale URL
- [ ] Test 4.1: Multiple restarts
- [ ] Test 5.1: Full app flow

### Nice-to-Have Tests (Good to Pass)
- [ ] All visual/UI tests
- [ ] All performance tests
- [ ] All edge case tests

---

## Bug Report Template

If any test fails, use this template:

```markdown
## Bug Report

**Test Failed:** [Test number and name]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots/Logs:**
[Attach relevant screenshots or console logs]

**Device/Environment:**
- Device: [e.g., iPhone 14, Android Pixel 7]
- OS Version: [e.g., iOS 17.1, Android 13]
- App Version: [version number]
- Environment: [Development/Production]

**Severity:**
- [ ] Critical (blocks functionality)
- [ ] High (major issue)
- [ ] Medium (minor issue)
- [ ] Low (cosmetic)
```

---

## Testing Checklist

Before marking the task complete:

- [ ] All critical tests passed
- [ ] At least 80% of important tests passed
- [ ] No critical bugs found
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Ready for deployment

---

## Notes

- Some tests require React Native Debugger or similar tools
- Production tests may require TestFlight (iOS) or internal testing (Android)
- Performance tests are best done on physical devices
- Visual tests should be done on multiple screen sizes
