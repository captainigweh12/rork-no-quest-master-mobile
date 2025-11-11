type UpdateInfoProduction = { mode: 'production'; otaEnabled: boolean; channel?: string | null; updateId?: string | null };
type UpdateInfoDev = { mode: 'development'; otaEnabled: false };
type UpdateInfoError = { mode: 'unknown'; error: string };

export async function checkAndApplyUpdates(): Promise<void> {
  console.log('[Updates] Skipping - web platform does not support expo-updates');
}

export function wasUpdateJustApplied(): boolean {
  return false;
}

export function getCurrentUpdateInfo(): UpdateInfoProduction | UpdateInfoDev | UpdateInfoError {
  if (__DEV__) {
    return { mode: 'development', otaEnabled: false };
  }
  return { mode: 'production', otaEnabled: false };
}
