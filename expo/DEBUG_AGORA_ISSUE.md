# Debugging Agora Acquire Error

## Issue
Getting JSON parse error when calling Agora's `/acquire` endpoint: "Unexpected non-whitespace character after JSON at position 4"

## Changes Made
1. Added extensive logging to `backend/services/agora.ts`:
   - Logs request details before making the call
   - Logs response status and body
   - Logs error details including response headers

2. Added logging to `backend/trpc/routes/agora/route.ts`:
   - Logs when acquire is called
   - Logs success/error details

## Steps to Debug

### 1. Restart Backend Server
```bash
cd /home/user/rork-app
# Stop any running backend process (Ctrl+C or kill the process)
bun run backend/server.ts
```

### 2. Test the Acquire Endpoint
1. Open the app and navigate to the stream screen
2. Click the "Acquire" button in the debug panel
3. Check the backend console logs

### 3. Check Logs
Look for these log entries in the backend console:
- `[AGORA TRPC] Acquire called with input:` - Shows the input parameters
- `[AGORA] Acquire request:` - Shows the URL and request body
- `[AGORA] acquire response status:` - Shows HTTP status code
- `[AGORA] acquire response body:` - Shows the actual response from Agora

## Expected Response Format

### Success (200 OK):
```json
{
  "resourceId": "JyvK8nXHuV1BE64GDkAaBGEscvtHW7v8BrQoRPCHxmeVxwY22-x-kv4GdPcjZeMzoCBUCOr9q-k6wSknnNYYNAA"
}
```

### Common Errors:

#### 401 Unauthorized
- Invalid Customer ID or Customer Secret
- Check that `AGORA_CUSTOMER_ID` and `AGORA_CUSTOMER_SECRET` are correct in `backend/.env`

#### 404 Not Found  
- Invalid App ID
- Check that `AGORA_APP_ID` is correct in `backend/.env`

#### Non-JSON Response
- Usually HTML error page from Agora
- Indicates authentication or endpoint issue
- The logs will show the actual HTML response

## Verify Credentials

Your current credentials in `backend/.env`:
- `AGORA_APP_ID`: fba3758e02e6480888adb99887b6aa3c
- `AGORA_CUSTOMER_ID`: aac6b8c891104ba28e26d41645e59d2d
- `AGORA_CUSTOMER_SECRET`: 470261239bc044d992a16235426f6938
- `AGORA_APP_CERTIFICATE`: fd9577a9a43a47dc96ca97a1c0cd2515

### To verify these are correct:
1. Go to Agora Console: https://console.agora.io/
2. Navigate to your project
3. Check the App ID matches
4. Under "RESTful API", check Customer ID and Customer Secret
5. Under "Basic Info", check App Certificate

## Next Steps

After restarting the backend and testing:
1. Share the console logs from the backend
2. We'll see the actual response from Agora
3. We can then determine if it's a credential issue or API format issue
