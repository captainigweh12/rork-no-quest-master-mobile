import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storageSmoke() {
  try {
    const mod = await import('react-native-mmkv');
    const kv = mod.createMMKV({ id: 'smoke-test' });
    
    kv.set('smoke', 'ok');
    const result = kv.getString('smoke');
    console.log('[Storage Smoke] ✅ MMKV active:', result);
    return { engine: 'MMKV' as const, ok: result === 'ok' };
  } catch {
    console.log('[Storage Smoke] ⚠️ MMKV not active; using AsyncStorage fallback');
    try {
      await AsyncStorage.setItem('smoke', 'ok');
      const result = await AsyncStorage.getItem('smoke');
      console.log('[Storage Smoke] ✅ AsyncStorage active:', result);
      return { engine: 'AsyncStorage' as const, ok: result === 'ok' };
    } catch (asyncErr) {
      console.error('[Storage Smoke] ❌ Both storage engines failed:', asyncErr);
      return { engine: 'none' as const, ok: false, error: String(asyncErr) };
    }
  }
}
