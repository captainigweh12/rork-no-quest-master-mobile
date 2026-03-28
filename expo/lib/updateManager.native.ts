export function getCurrentUpdateInfo() {
  try {
    return {
      mode: 'development',
      otaEnabled: false,
      error: 'expo-updates not available in Expo Go'
    };
  } catch (error: any) {
    return {
      mode: 'error',
      error: error?.message || String(error)
    };
  }
}

export async function checkAndApplyUpdates() {
  console.log('OTA updates not available in Expo Go');
  return false;
}
