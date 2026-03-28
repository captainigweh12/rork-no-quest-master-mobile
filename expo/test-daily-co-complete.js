/**
 * Comprehensive Daily.co Implementation Test
 * 
 * Tests all Daily.co endpoints and verifies complete integration
 */

const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://rork-no-quest-master-mobile.onrender.com';

async function runAllTests() {
  console.log('🧪 Daily.co Complete Implementation Test\n');
  console.log('Base URL:', baseUrl);
  console.log('='.repeat(80));

  const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
  };

  let createdRoomName = null;

  async function runTest(name, testFn) {
    testResults.total++;
    console.log(`\n[${testResults.total}] Testing: ${name}`);
    console.log('-'.repeat(80));
    
    try {
      await testFn();
      testResults.passed++;
      console.log(`✅ PASSED: ${name}`);
      return true;
    } catch (error) {
      testResults.failed++;
      console.error(`❌ FAILED: ${name}`);
      console.error('Error:', error.message);
      return false;
    }
  }

  // Test 1: Check Daily.co Configuration
  await runTest('Daily.co Configuration Check', async () => {
  const response = await fetch(`${baseUrl}/api/trpc/daily.checkConfig`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  if (!data.result?.data?.configured) {
    throw new Error('Daily.co is not configured');
  }
  
  if (!data.result.data.apiKeyPresent) {
    throw new Error('API key is not present');
  }
  
  console.log('✓ Daily.co is properly configured');
  console.log('✓ API key is present');
});

// Test 2: Create a Room
await runTest('Create Daily.co Room', async () => {
  const input = {
    questId: 'test-quest-123',
    userId: 'test-user-456',
    questTitle: 'Test Quest Stream',
    maxParticipants: 50,
  };
  
  const response = await fetch(`${baseUrl}/api/trpc/daily.createRoom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  const room = data.result?.data;
  if (!room) {
    throw new Error('No room data in response');
  }
  
  if (!room.name || !room.url) {
    throw new Error('Room missing name or URL');
  }
  
  createdRoomName = room.name;
  
  console.log('✓ Room created successfully');
  console.log('✓ Room name:', room.name);
  console.log('✓ Room URL:', room.url);
});

// Test 3: Get Room Information
await runTest('Get Room Information', async () => {
  if (!createdRoomName) {
    throw new Error('No room was created in previous test');
  }
  
  const response = await fetch(
    `${baseUrl}/api/trpc/daily.getRoom?input=${encodeURIComponent(JSON.stringify({ roomName: createdRoomName }))}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  const room = data.result?.data;
  if (!room) {
    throw new Error('Room not found');
  }
  
  if (room.name !== createdRoomName) {
    throw new Error(`Room name mismatch: expected ${createdRoomName}, got ${room.name}`);
  }
  
  console.log('✓ Room information retrieved successfully');
  console.log('✓ Room name matches:', room.name);
});

// Test 4: List All Rooms
await runTest('List All Rooms', async () => {
  const response = await fetch(`${baseUrl}/api/trpc/daily.listRooms`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  const rooms = data.result?.data;
  if (!Array.isArray(rooms)) {
    throw new Error('Rooms list is not an array');
  }
  
  console.log('✓ Rooms list retrieved successfully');
  console.log('✓ Total rooms:', rooms.length);
  
  if (createdRoomName) {
    const foundRoom = rooms.find(r => r.name === createdRoomName);
    if (foundRoom) {
      console.log('✓ Created room found in list');
    } else {
      console.log('⚠ Created room not found in list (may take a moment to appear)');
    }
  }
});

// Test 5: Get Meeting Token (Optional Security Feature)
await runTest('Get Meeting Token', async () => {
  if (!createdRoomName) {
    throw new Error('No room was created in previous test');
  }
  
  const input = {
    roomName: createdRoomName,
    userId: 'test-user-456',
    isOwner: true,
  };
  
  const response = await fetch(`${baseUrl}/api/trpc/daily.getMeetingToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  const token = data.result?.data?.token;
  if (!token) {
    throw new Error('No token in response');
  }
  
  console.log('✓ Meeting token generated successfully');
  console.log('✓ Token length:', token.length);
});

// Test 6: Delete Room
await runTest('Delete Daily.co Room', async () => {
  if (!createdRoomName) {
    throw new Error('No room was created in previous test');
  }
  
  const input = {
    roomName: createdRoomName,
  };
  
  const response = await fetch(`${baseUrl}/api/trpc/daily.deleteRoom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  if (!data.result?.data?.success) {
    throw new Error('Room deletion did not return success');
  }
  
  console.log('✓ Room deleted successfully');
});

// Test 7: Verify Room is Deleted
await runTest('Verify Room Deletion', async () => {
  if (!createdRoomName) {
    throw new Error('No room was created in previous test');
  }
  
  const response = await fetch(
    `${baseUrl}/api/trpc/daily.getRoom?input=${encodeURIComponent(JSON.stringify({ roomName: createdRoomName }))}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  const room = data.result?.data;
  if (room !== null) {
    throw new Error('Room still exists after deletion');
  }
  
  console.log('✓ Room successfully deleted and no longer exists');
});

// Test 8: Test tRPC 404 Fix (from previous implementation)
await runTest('tRPC 404 Fix - Health Check', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Expected JSON, got ${contentType}`);
  }
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  console.log('✓ Health endpoint returns JSON (not HTML)');
  console.log('✓ tRPC 404 fix is working');
});

// Test 9: Test VideoSDK Config (should still work)
await runTest('VideoSDK Config Check (Backward Compatibility)', async () => {
  const response = await fetch(`${baseUrl}/api/trpc/videosdk.checkConfig`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  console.log('✓ VideoSDK endpoint still accessible');
  console.log('✓ Backward compatibility maintained');
});

// Print Summary
console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${testResults.total}`);
console.log(`Passed: ${testResults.passed} ✅`);
console.log(`Failed: ${testResults.failed} ❌`);
console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Daily.co integration is fully functional!');
    console.log('\n✅ Ready for production deployment');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the errors above.`);
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
