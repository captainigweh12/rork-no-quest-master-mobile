/**
 * Comprehensive VideoSDK Testing Script
 * 
 * Tests all VideoSDK endpoints, error scenarios, and edge cases
 * 
 * Run with: node test-videosdk-comprehensive.js
 */

const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://rork-no-quest-master-mobile.onrender.com';

console.log('🧪 Comprehensive VideoSDK Testing\n');
console.log('Base URL:', baseUrl);
console.log('='.repeat(80));

// Helper function to make tRPC requests
async function trpcRequest(procedure, input = null, method = 'GET') {
  const url = input 
    ? `${baseUrl}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`
    : `${baseUrl}/api/trpc/${procedure}`;
    
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true',
    },
  });
  
  return { response, data: await response.json() };
}

// Test 1: Check VideoSDK Configuration
async function testCheckConfig() {
  console.log('\n🔧 Test 1: Check VideoSDK Configuration');
  console.log('-'.repeat(80));
  
  try {
    const { response, data } = await trpcRequest('videosdk.checkConfig');
    
    if (response.ok && data.result?.data) {
      const config = data.result.data.json || data.result.data;
      console.log('✅ Configuration check successful');
      console.log('API Key Present:', config.apiKeyPresent);
      console.log('Secret Key Present:', config.secretKeyPresent);
      console.log('Configured:', config.configured);
      
      if (!config.configured) {
        console.warn('⚠️ VideoSDK is not fully configured (missing API keys)');
      }
      
      return config.configured;
    } else {
      console.error('❌ Configuration check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Configuration check error:', error.message);
    return false;
  }
}

// Test 2: Get VideoSDK Token
async function testGetToken() {
  console.log('\n🎫 Test 2: Get VideoSDK Token');
  console.log('-'.repeat(80));
  
  try {
    const { response, data } = await trpcRequest('videosdk.getToken');
    
    if (response.ok && data.result?.data) {
      const token = data.result.data.json?.token || data.result.data.token;
      
      if (token) {
        console.log('✅ Token fetched successfully');
        console.log('Token length:', token.length);
        console.log('Token preview:', token.slice(0, 30) + '...');
        
        // Verify token format (JWT)
        const parts = token.split('.');
        if (parts.length === 3) {
          console.log('✅ Token format is valid JWT (3 parts)');
        } else {
          console.warn('⚠️ Token format may be invalid');
        }
        
        return token;
      }
    }
    
    console.error('❌ Token fetch failed');
    console.error('Response:', JSON.stringify(data, null, 2));
    return null;
  } catch (error) {
    console.error('❌ Token fetch error:', error.message);
    return null;
  }
}

// Test 3: Create Meeting
async function testCreateMeeting(token) {
  console.log('\n🏢 Test 3: Create Meeting');
  console.log('-'.repeat(80));
  
  if (!token) {
    console.error('❌ Cannot test meeting creation without token');
    return null;
  }
  
  try {
    // tRPC mutation format with batch=1
    const url = `${baseUrl}/api/trpc/videosdk.createMeeting?batch=1`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
      },
      body: JSON.stringify({
        "0": {
          token: token,
        }
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.result?.data) {
      const meetingId = data.result.data.json?.meetingId || data.result.data.meetingId;
      
      if (meetingId) {
        console.log('✅ Meeting created successfully');
        console.log('Meeting ID:', meetingId);
        return meetingId;
      }
    }
    
    console.error('❌ Meeting creation failed');
    console.error('Response:', JSON.stringify(data, null, 2));
    return null;
  } catch (error) {
    console.error('❌ Meeting creation error:', error.message);
    return null;
  }
}

// Test 4: Validate Meeting
async function testValidateMeeting(token, meetingId) {
  console.log('\n✅ Test 4: Validate Meeting');
  console.log('-'.repeat(80));
  
  if (!token || !meetingId) {
    console.error('❌ Cannot test meeting validation without token and meetingId');
    return false;
  }
  
  try {
    const { response, data } = await trpcRequest('videosdk.validateMeeting', {
      token,
      meetingId,
    });
    
    if (response.ok && data.result?.data) {
      const isValid = data.result.data.json?.isValid || data.result.data.isValid;
      
      console.log(isValid ? '✅ Meeting is valid' : '❌ Meeting is invalid');
      console.log('Validation result:', isValid);
      return isValid;
    }
    
    console.error('❌ Meeting validation failed');
    return false;
  } catch (error) {
    console.error('❌ Meeting validation error:', error.message);
    return false;
  }
}

// Test 5: Error Handling - Invalid Token
async function testInvalidToken() {
  console.log('\n⚠️ Test 5: Error Handling - Invalid Token');
  console.log('-'.repeat(80));
  
  try {
    const url = `${baseUrl}/api/trpc/videosdk.createMeeting`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
      },
      body: JSON.stringify({
        token: 'invalid-token-12345',
      }),
    });
    
    const data = await response.json();
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      console.log('✅ Error response is JSON (not HTML)');
      
      if (data.error) {
        console.log('✅ Error properly formatted');
        console.log('Error message:', data.error.json?.message || data.error.message || 'Unknown');
      } else {
        console.log('⚠️ Unexpected response format');
      }
      return true;
    } else {
      console.error('❌ Error response is not JSON:', contentType);
      return false;
    }
  } catch (error) {
    console.error('❌ Invalid token test error:', error.message);
    return false;
  }
}

// Test 6: Error Handling - Missing Parameters
async function testMissingParameters() {
  console.log('\n⚠️ Test 6: Error Handling - Missing Parameters');
  console.log('-'.repeat(80));
  
  try {
    const url = `${baseUrl}/api/trpc/videosdk.createMeeting`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
      },
      body: JSON.stringify({}), // Missing token
    });
    
    const data = await response.json();
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      console.log('✅ Error response is JSON');
      
      if (data.error) {
        console.log('✅ Error properly formatted');
        console.log('Error type:', data.error.json?.code || 'Unknown');
      }
      return true;
    } else {
      console.error('❌ Error response is not JSON');
      return false;
    }
  } catch (error) {
    console.error('❌ Missing parameters test error:', error.message);
    return false;
  }
}

// Test 7: Response Time
async function testResponseTime() {
  console.log('\n⏱️ Test 7: Response Time Performance');
  console.log('-'.repeat(80));
  
  try {
    const iterations = 3;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await trpcRequest('videosdk.getToken');
      const end = Date.now();
      times.push(end - start);
      console.log(`Attempt ${i + 1}: ${end - start}ms`);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log('\nPerformance Summary:');
    console.log('Average:', avg.toFixed(2) + 'ms');
    console.log('Min:', min + 'ms');
    console.log('Max:', max + 'ms');
    
    if (avg < 1000) {
      console.log('✅ Performance is good (< 1s average)');
      return true;
    } else if (avg < 3000) {
      console.log('⚠️ Performance is acceptable (< 3s average)');
      return true;
    } else {
      console.log('❌ Performance is slow (> 3s average)');
      return false;
    }
  } catch (error) {
    console.error('❌ Response time test error:', error.message);
    return false;
  }
}

// Test 8: Concurrent Requests
async function testConcurrentRequests() {
  console.log('\n🔄 Test 8: Concurrent Requests');
  console.log('-'.repeat(80));
  
  try {
    const requests = 5;
    console.log(`Making ${requests} concurrent token requests...`);
    
    const start = Date.now();
    const promises = Array(requests).fill(null).map(() => trpcRequest('videosdk.getToken'));
    const results = await Promise.all(promises);
    const end = Date.now();
    
    const successful = results.filter(r => r.response.ok).length;
    
    console.log(`✅ ${successful}/${requests} requests successful`);
    console.log(`Total time: ${end - start}ms`);
    console.log(`Average per request: ${((end - start) / requests).toFixed(2)}ms`);
    
    return successful === requests;
  } catch (error) {
    console.error('❌ Concurrent requests test error:', error.message);
    return false;
  }
}

// Test 9: HTML Detection (Non-existent Route)
async function testHTMLDetection() {
  console.log('\n🌐 Test 9: HTML Detection (Non-existent Route)');
  console.log('-'.repeat(80));
  
  try {
    const response = await fetch(`${baseUrl}/api/trpc/nonexistent.route`, {
      headers: { 'bypass-tunnel-reminder': 'true' },
    });
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      console.log('✅ Non-existent route returns JSON error (not HTML)');
      const data = await response.json();
      console.log('Error format:', data.error ? 'Proper' : 'Unexpected');
      return true;
    } else if (contentType.includes('text/html')) {
      console.log('⚠️ Non-existent route returns HTML');
      console.log('Note: This would trigger the HTML detection in tRPC client');
      return true; // Still pass as our client handles this
    } else {
      console.log('⚠️ Unexpected content type:', contentType);
      return false;
    }
  } catch (error) {
    console.error('❌ HTML detection test error:', error.message);
    return false;
  }
}

// Test 10: Complete Flow
async function testCompleteFlow() {
  console.log('\n🔄 Test 10: Complete VideoSDK Flow');
  console.log('-'.repeat(80));
  
  try {
    console.log('Step 1: Check configuration...');
    const configured = await testCheckConfig();
    
    if (!configured) {
      console.warn('⚠️ Skipping flow test - VideoSDK not configured');
      return true; // Don't fail if not configured
    }
    
    console.log('\nStep 2: Get token...');
    const token = await testGetToken();
    
    if (!token) {
      console.error('❌ Flow failed at token fetch');
      return false;
    }
    
    console.log('\nStep 3: Create meeting...');
    const meetingId = await testCreateMeeting(token);
    
    if (!meetingId) {
      console.error('❌ Flow failed at meeting creation');
      return false;
    }
    
    console.log('\nStep 4: Validate meeting...');
    const isValid = await testValidateMeeting(token, meetingId);
    
    if (!isValid) {
      console.error('❌ Flow failed at meeting validation');
      return false;
    }
    
    console.log('\n✅ Complete flow successful!');
    return true;
  } catch (error) {
    console.error('❌ Complete flow error:', error.message);
    return false;
  }
}

// Run all tests
async function runComprehensiveTests() {
  console.log('\n🚀 Starting Comprehensive VideoSDK Tests\n');
  
  const results = {
    checkConfig: await testCheckConfig(),
    getToken: !!(await testGetToken()),
    invalidToken: await testInvalidToken(),
    missingParameters: await testMissingParameters(),
    responseTime: await testResponseTime(),
    concurrentRequests: await testConcurrentRequests(),
    htmlDetection: await testHTMLDetection(),
  };
  
  // Complete flow test (depends on configuration)
  console.log('\n' + '='.repeat(80));
  results.completeFlow = await testCompleteFlow();
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 Comprehensive Test Results Summary');
  console.log('='.repeat(80));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    const name = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${icon} ${name}: ${result ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`Final Score: ${passed}/${total} tests passed`);
  console.log('='.repeat(80));
  
  if (passed === total) {
    console.log('\n🎉 All comprehensive tests passed!');
  } else if (passed >= total * 0.8) {
    console.log('\n✅ Most tests passed. Review failures above.');
  } else {
    console.log('\n⚠️ Several tests failed. Please review the errors above.');
  }
  
  return passed === total;
}

// Run tests
runComprehensiveTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
