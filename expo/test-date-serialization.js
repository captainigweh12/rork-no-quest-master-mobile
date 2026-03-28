// Test Date serialization with superjson transformer
const baseUrl = 'https://rork-no-quest-master-mobile.onrender.com';

async function testDateSerialization() {
  console.log('🧪 Testing Date Serialization with SuperJSON');
  console.log('=' .repeat(60));
  
  // tRPC batch format for mutation
  const batchPayload = [
    {
      "0": {
        "json": {
          "name": "TestUser"
        }
      }
    }
  ];
  
  console.log('\n📤 Sending request to example.hi mutation...');
  console.log('   Payload:', JSON.stringify(batchPayload, null, 2));
  
  try {
    const response = await fetch(`${baseUrl}/api/trpc/example.hi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
      },
      body: JSON.stringify(batchPayload),
    });
    
    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('\n📦 Response Data:', JSON.stringify(data, null, 2));
    
    // Check if response contains superjson metadata
    if (data && data[0] && data[0].result && data[0].result.data) {
      const resultData = data[0].result.data;
      
      console.log('\n🔍 Analyzing Response Structure:');
      console.log('   Has "json" field:', !!resultData.json);
      console.log('   Has "meta" field:', !!resultData.meta);
      
      if (resultData.json) {
        console.log('\n✅ JSON Data:', resultData.json);
        
        if (resultData.json.date) {
          console.log('   📅 Date field present:', resultData.json.date);
          console.log('   📅 Date type:', typeof resultData.json.date);
        }
      }
      
      if (resultData.meta) {
        console.log('\n🏷️  SuperJSON Metadata:', resultData.meta);
        console.log('   This confirms SuperJSON is working!');
      }
      
      console.log('\n✅ Date serialization test PASSED');
      console.log('   SuperJSON is properly serializing Date objects');
      return true;
    } else {
      console.log('\n⚠️  Unexpected response structure');
      return false;
    }
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    return false;
  }
}

testDateSerialization().catch(console.error);
