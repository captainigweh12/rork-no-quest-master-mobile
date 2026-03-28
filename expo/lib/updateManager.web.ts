export function getCurrentUpdateInfo() {
  return {
    mode: 'web',
    otaEnabled: false,
    error: 'expo-updates not available on web'
  };
}

export async function checkAndApplyUpdates() {
  console.log('OTA updates not available on web');
  return false;
}
