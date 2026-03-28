#!/usr/bin/env node

/**
 * Backend Connection Test Script
 * Tests backend health, tRPC routes, and VideoSDK endpoints
 */

const http = require('http');
const https = require('https');

// Use 127.0.0.1 instead of localhost to force IPv4 (avoids IPv6 ::1 issues on Windows)
const BASE_URL = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'http://127.0.0.1:8081';
const TIMEOUT = 5000;

console.log('\n🧪 Backend Connection Test');
console.log('='.repeat(50));
console.log(`Base URL: ${BASE_URL}`);
console.log('Note: Using 127.0.0.1 (IPv4) to avoid IPv6 connection issues\n');

// Helper to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      timeout: TIMEOUT,
      headers: {
        'bypass-tunnel-reminder': 'true',
        ...options.headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers, isHtml: data.includes('<!DOCTYPE') });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Test functions
async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    console.log(`\n📍 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const result = await makeRequest(url);
    
    if (result.isHtml) {
      console.log(`   ❌ FAILED: Server returned HTML (likely 404)`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Content-Type: ${result.headers['content-type']}`);
      return false;
    }
    
    if (result.status === expectedStatus) {
      console.log(`   ✅ PASSED: Status ${result.status}`);
      if (result.data && typeof result.data === 'object') {
        console.log(`   Response:`, JSON.stringify(result.data, null, 2).split('\n').map(l => '   ' + l).join('\n').trim());
      }
      return true;
    } else {
      console.log(`   ❌ FAILED: Expected ${expectedStatus}, got ${result.status}`);
      if (result.data) {
        console.log(`   Response:`, JSON.stringify(result.data, null, 2).split('\n').map(l => '   ' + l).join('\n').trim());
      }
      return false;
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log(`   💡 Backend is not running. Start it with: npm run backend`);
    } else if (error.message === 'Request timeout') {
      console.log(`   💡 Request timed out. Backend may be slow or unreachable.`);
    }
    return false;
  }
}

async function runTests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  console.log('\n🔍 Running Tests...\n');

  // Test 1: Root endpoint
  results.total++;
  if (await testEndpoint('Root Endpoint', `${BASE_URL}/`)) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 2: API root
  results.total++;
  if (await testEndpoint('API Root', `${BASE_URL}/api`)) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 3: Health check
  results.total++;
  if (await testEndpoint('Health Check', `${BASE_URL}/api/health`)) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 4: tRPC routes listing
  results.total++;
  if (await testEndpoint('tRPC Routes', `${BASE_URL}/api/trpc-routes`)) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 5: VideoSDK checkConfig
  results.total++;
  if (await testEndpoint('VideoSDK Config Check', `${BASE_URL}/api/trpc/videosdk.checkConfig`)) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 6: Example hi route (skip - it's a mutation, not a query)
  console.log(`\n📍 Testing: Example Hi Route`);
  console.log(`   URL: ${BASE_URL}/api/trpc/example.hi`);
  console.log(`   ⏭️  SKIPPED: This is a mutation (requires POST), not a query`);
  console.log(`   Note: Mutations cannot be tested with GET requests`);

  // Test 7: Agora env route
  results.total++;
  if (await testEndpoint('Agora Env Route', `${BASE_URL}/api/trpc/agora.env`)) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Backend is working correctly.');
  } else if (results.failed === results.total) {
    console.log('\n❌ All tests failed. Backend is likely not running.');
    console.log('\n💡 To start the backend:');
    console.log('   1. Open a new terminal');
    console.log('   2. Run: npm run backend');
    console.log('   3. Wait for "listening on http://localhost:8081"');
    console.log('   4. Run this test again');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }

  console.log('\n');
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
