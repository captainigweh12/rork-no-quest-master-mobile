import { storageSmoke } from './lib/storage/smokeTest';

(async () => {
  console.log('\n🧪 Running storage smoke test...\n');
  const result = await storageSmoke();
  
  console.log('\n📊 Results:');
  console.log(`  Engine: ${result.engine}`);
  console.log(`  Status: ${result.ok ? '✅ OK' : '❌ FAILED'}`);
  if ('error' in result) {
    console.log(`  Error: ${result.error}`);
  }
  
  console.log('\n✨ Smoke test complete\n');
})();
