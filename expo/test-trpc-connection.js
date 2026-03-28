#!/usr/bin/env node

/**
 * Automated tRPC Connection Test Script
 * 
 * This script tests the tRPC endpoints to verify the JSON parsing fix works correctly.
 * Run with: node test-trpc-connection.js
 */

const BASE_URL = process.env.BACKEND_URL || 'https://rork-no-quest-master-mobile.onrender.com';

console.log('🧪 tRPC Connection Test Suite');
console.log('================================\n');
console.log(`Testing backend: ${BASE_URL}\n`);

let passedTests = 0;
let failedTests = 0;
const results = [];

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}`);
  if (details) console.log(`   ${details}`);
  
  results.push({ name, passed, details });
  if (passed) passedTests++;
  else failedTests++;
}

async function testHealthEndpoint() {
  console.log('\n📡 Test 1: Health Endpoint');
  console.log('----------------------------');
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    const passed = response.ok && data.status === 'healthy';
    logTest('Health endpoint responds', passed, 
      passed ? `Status: ${data.status}` : `Got status ${response.status}`);
    
    return passed;
  } catch (error) {
    logTest('Health endpoint responds', false, error.message);
    return false;
  }
}

async function testTrpcRoutes() {
  console.log('\n📡 Test 2: tRPC Routes Diagnostic');
  console.log('----------------------------');
  
  try {
    const response = await fetch(`${BASE_URL}/api/trpc-routes`);
    const data = await response.json();
    
    const hasRoutes = data.routes && Object.keys(data.routes).length > 0;
    logTest('tRPC routes endpoint responds', response.ok && hasRoutes,
      hasRoutes ? `Found ${Object.keys(data.routes).length} route groups` : 'No routes found');
    
    return response.ok && hasRoutes;
  } catch (error) {
    logTest('tRPC routes endpoint responds', false, error.message);
    return false;
  }
}

async function testAgoraEnvQuery() {
  console.log('\n📡 Test 3: Agora Env Query');
  console.log('----------------------------');
  
  try {
    const response = await fetch(`${BASE_URL}/api/trpc/agora.env`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: null })
    });
    
    const text = await response.text();
    
    // Check for null bytes
    const hasNullBytes = text.includes('\u0000');
    logTest('Response has no null bytes', !hasNullBytes,
      hasNullBytes ? 'Found null bytes in response!' : 'Clean response');
    
    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(text);
      logTest('Response is valid JSON', true, 'Successfully parsed');
    } catch (e) {
      logTest('Response is valid JSON', false, `Parse error: ${e.message}`);
      return false;
    }
    
    // Check superjson format
    const hasResult = data && data.result;
    logTest('Response uses superjson format', hasResult,
      hasResult ? 'Has result wrapper' : 'Missing result wrapper');
    
    return !hasNullBytes && hasResult;
  } catch (error) {
    logTest('Agora env query', false, error.message);
    return false;
  }
}

async function testVideoSDKCheckConfig() {
  console.log('\n📡 Test 4: VideoSDK Check Config');
  console.log('----------------------------');
  
  try {
    const response = await fetch(`${BASE_URL}/api/trpc/videosdk.checkConfig`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: null })
    });
    
    const text = await response.text();
    
    // Check for null bytes
    const hasNullBytes = text.includes('\u0000');
    logTest('Response has no null bytes', !hasNullBytes,
      hasNullBytes ? 'Found null bytes in response!' : 'Clean response');
    
    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(text);
      logTest('Response is valid JSON', true, 'Successfully parsed');
    } catch (e) {
      logTest('Response is valid JSON', false, `Parse error: ${e.message}`);
      return false;
    }
    
    return !hasNullBytes;
  } catch (error) {
    logTest('VideoSDK check config', false, error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n📡 Test 5: Error Response Handling');
  console.log('----------------------------');
  
  try {
    // Try to call a non-existent endpoint
    const response = await fetch(`${BASE_URL}/api/trpc/nonexistent.query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: null })
    });
    
    const text = await response.text();
    
    // Check for null bytes even in error responses
    const hasNullBytes = text.includes('\u0000');
    logTest('Error response has no null bytes', !hasNullBytes,
      hasNullBytes ? 'Found null bytes in error response!' : 'Clean error response');
    
    // Try to parse error JSON
    try {
      const data = JSON.parse(text);
      logTest('Error response is valid JSON', true, 'Successfully parsed error');
      
      // Check if it's a proper tRPC error
      const isTrpcError = data && (data.error || data.result);
      logTest('Error follows tRPC format', isTrpcError,
        isTrpcError ? 'Proper tRPC error structure' : 'Unexpected error format');
    } catch (e) {
      logTest('Error response is valid JSON', false, `Parse error: ${e.message}`);
      return false;
    }
    
    return !hasNullBytes;
  } catch (error) {
    logTest('Error handling test', false, error.message);
    return false;
  }
}

async function testCORS() {
  console.log('\n📡 Test 6: CORS Configuration');
  console.log('----------------------------');
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'OPTIONS'
    });
    
    const hasCORS = response.headers.has('access-control-allow-origin');
    logTest('CORS headers present', hasCORS,
      hasCORS ? `Origin: ${response.headers.get('access-control-allow-origin')}` : 'No CORS headers');
    
    return hasCORS;
  } catch (error) {
    logTest('CORS test', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting test suite...\n');
  
  await testHealthEndpoint();
  await testTrpcRoutes();
  await testAgoraEnvQuery();
  await testVideoSDKCheckConfig();
  await testErrorHandling();
  await testCORS();
  
  console.log('\n================================');
  console.log('📊 Test Results Summary');
  console.log('================================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! The JSON parsing fix is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the results above.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
