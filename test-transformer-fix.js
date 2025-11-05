// Test script to verify transformer fix
const baseUrl = 'https://rork-no-quest-master-mobile.onrender.com';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
        ...options.headers,
      },
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    console.log(`   Content-Type: ${contentType}`);
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log(`   ✅ Response:`, JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      const text = await response.text();
      console.log(`   ⚠️  Non-JSON Response:`, text.substring(0, 200));
      return { success: false, error: 'Non-JSON response' };
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Transformer Fix Tests');
  console.log('=' .repeat(60));
  
  const results = [];
  
  // Test 1: Health check
  results.push(await testEndpoint(
    'Health Check',
    `${baseUrl}/api/health`
  ));
  
  // Test 2: tRPC routes info
  results.push(await testEndpoint(
    'tRPC Routes Info',
    `${baseUrl}/api/trpc-routes`
  ));
  
  // Test 3: VideoSDK checkConfig (query)
  results.push(await testEndpoint(
    'VideoSDK Config Check (tRPC Query)',
    `${baseUrl}/api/trpc/videosdk.checkConfig`
  ));
  
  // Test 4: Agora env check (query)
  results.push(await testEndpoint(
    'Agora Environment Check (tRPC Query)',
    `${baseUrl}/api/trpc/agora.env`
  ));
  
  // Test 5: Example.hi mutation with Date (tests superjson serialization)
  const examplePayload = {
    "0": {
      "json": {
        "name": "TestUser"
      }
    }
  };
  
  results.push(await testEndpoint(
    'Example.hi Mutation (Tests Date Serialization)',
    `${baseUrl}/api/trpc/example.hi`,
    {
      method: 'POST',
      body: JSON.stringify(examplePayload),
    }
  ));
  
  // Test 6: VideoSDK getToken (query) - tests complex response
  results.push(await testEndpoint(
    'VideoSDK Get Token (tRPC Query)',
    `${baseUrl}/api/trpc/videosdk.getToken`
  ));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Transformer fix is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
  }
}

runTests().catch(console.error);
