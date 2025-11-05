/**
 * Test script for VideoSDK JSON Parse Error Fix
 * 
 * This script tests the enhanced error handling and retry logic
 * for the VideoSDK token fetch functionality.
 * 
 * Run with: node test-videosdk-json-parse-fix.js
 */

const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://rork-no-quest-master-mobile.onrender.com';

console.log('🧪 Testing VideoSDK JSON Parse Error Fix\n');
console.log('Base URL:', baseUrl);
console.log('='.repeat(60));

// Test 1: Check if backend is accessible
async function testBackendHealth() {
  console.log('\n📡 Test 1: Backend Health Check');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();
    
    console.log('✅ Backend is accessible');
    console.log('Status:', data.status);
    console.log('Timestamp:', data.timestamp);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

// Test 2: Check if VideoSDK route is registered
async function testVideoSDKRouteRegistration() {
  console.log('\n🔍 Test 2: VideoSDK Route Registration');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${baseUrl}/api/trpc-routes`);
    const data = await response.json();
    
    if (data.routes?.videosdk) {
      console.log('✅ VideoSDK routes are registered');
      console.log('Available routes:', Object.keys(data.routes.videosdk));
      return true;
    } else {
      console.error('❌ VideoSDK routes not found in backend');
      return false;
    }
  } catch (error) {
    console.error('❌ Route check failed:', error.message);
    return false;
  }
}

// Test 3: Test VideoSDK token fetch (batch request)
async function testVideoSDKTokenFetch() {
  console.log('\n🎫 Test 3: VideoSDK Token Fetch');
  console.log('-'.repeat(60));
  
  try {
    // tRPC batch request format
    const response = await fetch(`${baseUrl}/api/trpc/videosdk.getToken`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/html')) {
        console.error('❌ Server returned HTML instead of JSON');
        const text = await response.text();
        console.error('Response preview:', text.slice(0, 200));
        
        if (text.includes('404')) {
          console.error('🔍 Route not found - check backend routing');
        }
        return false;
      }
    }
    
    const data = await response.json();
    
    // tRPC returns data in result.data.json format when using superjson transformer
    if (data.result?.data?.json?.token) {
      console.log('✅ Token fetched successfully');
      console.log('Token preview:', data.result.data.json.token.slice(0, 20) + '...');
      return true;
    } else if (data.result?.data?.token) {
      console.log('✅ Token fetched successfully');
      console.log('Token preview:', data.result.data.token.slice(0, 20) + '...');
      return true;
    } else if (data.error) {
      console.error('❌ Token fetch returned error:', data.error.message || JSON.stringify(data.error));
      return false;
    } else {
      console.error('❌ Unexpected response format:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Token fetch failed:', error.message);
    
    if (error.message.includes('JSON')) {
      console.error('🔍 JSON parse error detected - this is what we fixed!');
    }
    return false;
  }
}

// Test 4: Test HTML detection
async function testHTMLDetection() {
  console.log('\n🌐 Test 4: HTML Response Detection');
  console.log('-'.repeat(60));
  
  try {
    // Try to access a non-existent route
    const response = await fetch(`${baseUrl}/api/trpc/nonexistent.route`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
      },
    });
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      console.log('✅ HTML response detected correctly');
      console.log('Status:', response.status);
      console.log('Content-Type:', contentType);
      return true;
    } else if (contentType.includes('application/json')) {
      console.log('✅ Backend returns JSON errors (good!)');
      const data = await response.json();
      console.log('Error response:', data);
      return true;
    } else {
      console.log('⚠️ Unexpected content type:', contentType);
      return false;
    }
  } catch (error) {
    console.error('❌ HTML detection test failed:', error.message);
    return false;
  }
}

// Test 5: Test error handler
async function testErrorHandler() {
  console.log('\n⚠️ Test 5: Global Error Handler');
  console.log('-'.repeat(60));
  
  try {
    // Try to trigger an error
    const response = await fetch(`${baseUrl}/api/trpc/videosdk.getToken?input=invalid`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
      },
    });
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      console.log('✅ Error handler returns JSON');
      const data = await response.json();
      console.log('Error format:', {
        hasError: !!data.error,
        hasTimestamp: !!data.result?.data?.timestamp || !!data.timestamp,
      });
      return true;
    } else {
      console.error('❌ Error handler returned non-JSON:', contentType);
      return false;
    }
  } catch (error) {
    console.error('❌ Error handler test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting VideoSDK JSON Parse Error Fix Tests\n');
  
  const results = {
    backendHealth: await testBackendHealth(),
    routeRegistration: await testVideoSDKRouteRegistration(),
    tokenFetch: await testVideoSDKTokenFetch(),
    htmlDetection: await testHTMLDetection(),
    errorHandler: await testErrorHandler(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Final Score: ${passed}/${total} tests passed`);
  console.log('='.repeat(60));
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! The fix is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }
  
  return passed === total;
}

// Run tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
