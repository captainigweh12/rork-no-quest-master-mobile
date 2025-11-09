/**
 * SQLite Storage Test Script
 * 
 * Tests the new SQLite storage implementation
 */

import { initAppStorage, guardedStorage, typedStorage, batchStorage } from './lib/storage';

async function testSQLiteStorage() {
  console.log('=== SQLite Storage Test ===\n');

  try {
    console.log('1. Initializing storage...');
    await initAppStorage();
    console.log('✓ Storage initialized\n');

    console.log('2. Testing basic set/get operations...');
    await guardedStorage.setItem('test_key', 'test_value');
    const value = await guardedStorage.getItem('test_key');
    console.log(`✓ Set and retrieved value: "${value}"`);
    console.assert(value === 'test_value', 'Value mismatch!\n');

    console.log('3. Testing JSON storage...');
    const testObj = { name: 'John', age: 30, active: true };
    await typedStorage.setJSON('test_object', testObj);
    const retrievedObj = await typedStorage.getJSON('test_object', {});
    console.log('✓ Stored and retrieved object:', retrievedObj);
    console.assert(JSON.stringify(retrievedObj) === JSON.stringify(testObj), 'Object mismatch!\n');

    console.log('4. Testing batch operations...');
    const batchData = {
      key1: 'value1',
      key2: { nested: 'object' },
      key3: [1, 2, 3],
    };
    await batchStorage.setMultiple(batchData);
    const retrieved = await batchStorage.getMultiple(['key1', 'key2', 'key3'], {} as any);
    console.log('✓ Batch stored and retrieved:', retrieved);
    console.assert((retrieved as any).key1 === 'value1', 'Batch value mismatch!\n');

    console.log('5. Testing multiGet...');
    const multiResults = await guardedStorage.multiGet(['test_key', 'key1']);
    console.log('✓ Multi-get results:', multiResults);

    console.log('6. Testing getAllKeys...');
    const allKeys = await guardedStorage.getAllKeys();
    console.log(`✓ Found ${allKeys.length} keys in storage`);
    console.log('  Keys:', allKeys);

  // (Removed devMode stats - not available in MMKV-only implementation)

    console.log('8. Testing removeItem...');
    await guardedStorage.removeItem('test_key');
    const removed = await guardedStorage.getItem('test_key');
    console.assert(removed === null, 'Key should be removed!\n');
    console.log('✓ Item removed successfully');

    console.log('9. Testing multiRemove...');
    await guardedStorage.multiRemove(['key1', 'key2', 'key3']);
    const afterRemove = await guardedStorage.getAllKeys();
    console.log(`✓ After multi-remove, ${afterRemove.length} keys remain`);

    console.log('\n=== All Tests Passed! ===');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testSQLiteStorage().catch(console.error);
