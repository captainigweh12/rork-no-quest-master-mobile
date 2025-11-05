/**
 * tRPC 404 Fix Verification Script
 * 
 * This script tests if the tRPC endpoints are accessible and returning JSON
 * instead of HTML 404 pages.
 */

const RENDER_URL = 'https://rork-no-quest-master-mobile.onrender.com';
const LOCAL_URL = 'http://localhost:8081';

// Test configuration - change this to test different environments
const TEST_URL = process.argv[2] || RENDER_URL;

console.log('\n🧪 tRPC 404 Fix Verification');
console.log('=' .repeat(60));
console.log(`Testing URL: ${TEST_URL}\n`);

async function testEndpoint(url, description) {
  try {
    console.log(`\n📍 Testing: ${description}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${contentType}`);
    
    // Check if response is JSON
    const isJson = contentType.includes('application/json');
    const isHtml = contentType.includes('text/html');
    
    if (isJson) {
      console.log(`   ✅ Returns JSON (correct)`);
      
      // Try to parse and display the response
      try {
        const data = await response.json();
        console.log(`   Response:`, JSON.stringify(data, null, 2).split('\n').slice(0, 10).join('\n   '));
      } catch (e) {
        console.log(`   ⚠️  Could not parse JSON:`, e.message);
      }
    } else if (isHtml) {
      console.log(`   ❌ Returns HTML (incorrect - this is the bug!)`);
      
      // Show a preview of the HTML
      const text = await response.text();
      const preview = text.slice(0, 200);
      console.log(`   HTML Preview: ${preview}...`);
    } else {
      console.log(`   ⚠️  Unknown content type`);
    }
    
    return {
      url,
      description,
      status: response.status,
      contentType,
      isJson,
      isHtml,
      success: isJson,
    };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      url,
      description,
      error: error.message,
      success: false,
    };
  }
}

async function runTests() {
  const results = [];
  
  // Test 1: Root endpoint
  results.push(await testEndpoint(
    `${TEST_URL}/`,
    'Root endpoint'
  ));
  
  // Test 2: API health check
  results.push(await testEndpoint(
    `${TEST_URL}/api/health`,
    'Health check endpoint'
  ));
  
  // Test 3: tRPC routes diagnostic
  results.push(await testEndpoint(
    `${TEST_URL}/api/trpc-routes`,
    'tRPC routes diagnostic'
  ));
  
  // Test 4: tRPC test endpoint
  results.push(await testEndpoint(
    `${TEST_URL}/api/test-trpc`,
    'tRPC test endpoint'
  ));
  
  // Test 5: VideoSDK checkConfig (actual tRPC endpoint)
  results.push(await testEndpoint(
    `${TEST_URL}/api/trpc/videosdk.checkConfig`,
    'VideoSDK checkConfig (tRPC query)'
  ));
  
  // Test 6: VideoSDK getToken (actual tRPC endpoint)
  results.push(await testEndpoint(
    `${TEST_URL}/api/trpc/videosdk.getToken`,
    'VideoSDK getToken (tRPC query)'
  ));
  
  // Test 7: Non-existent route (should return JSON 404, not HTML)
  results.push(await testEndpoint(
    `${TEST_URL}/api/trpc/nonexistent.route`,
    'Non-existent tRPC route (should return JSON 404)'
  ));
  
  // Test 8: Non-existent non-tRPC route
  results.push(await testEndpoint(
    `${TEST_URL}/nonexistent`,
    'Non-existent route (should return JSON 404)'
  ));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.description}`);
      if (r.isHtml) {
        console.log(`     Problem: Returns HTML instead of JSON`);
      } else if (r.error) {
        console.log(`     Error: ${r.error}`);
      }
    });
  }
  
  // Specific check for the 404 bug
  const nonExistentTrpcTest = results.find(r => r.description.includes('Non-existent tRPC route'));
  if (nonExistentTrpcTest) {
    console.log('\n🔍 404 Handler Check:');
    if (nonExistentTrpcTest.isJson) {
      console.log('   ✅ Non-existent tRPC routes return JSON (bug is FIXED)');
    } else if (nonExistentTrpcTest.isHtml) {
      console.log('   ❌ Non-existent tRPC routes return HTML (bug still EXISTS)');
      console.log('   💡 The catch-all 404 handler needs to be added to backend/hono.ts');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('🎉 All tests passed! tRPC endpoints are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review the results above.');
  }
  
  console.log('\n💡 Tips:');
  console.log('   - If you see HTML responses, the backend needs the catch-all 404 handler');
  console.log('   - If you see connection errors, check if the backend is running');
  console.log('   - For Render deployments, ensure the service is deployed and running');
  console.log('   - Test locally with: node test-trpc-404-fix.js http://localhost:8081');
  console.log('   - Test Render with: node test-trpc-404-fix.js (default)');
  console.log('\n');
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
