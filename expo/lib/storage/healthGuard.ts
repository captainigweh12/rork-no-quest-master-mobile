import { Storage } from './adapter';

type Validator<T> = (v: unknown) => v is T;
const isObj: Validator<Record<string, unknown>> = (v): v is any =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const safeParse = <T = unknown>(raw: string | null) => {
  if (raw == null || raw === '') return { ok: false as const };
  try {
    return { ok: true as const, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false as const };
  }
};

export const KEYS = {
  baseUrlOverride: 'EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE',
  session: 'auth:session',
  user: 'app:user',
  profile: 'app:profile',
  onboarding: 'onboarding:completed',
  theme: 'app:theme',
  categories: 'app:categories',
  quests: 'app:quests',
  journals: 'app:journals',
} as const;

const TTL: Partial<Record<string, number>> = {
  [KEYS.session]: 1000 * 60 * 60 * 24 * 7,
};

const DEFAULTS: Partial<Record<string, unknown>> = {
  [KEYS.baseUrlOverride]: undefined,
};

const VALIDATORS: Partial<Record<string, Validator<any>>> = {
  [KEYS.baseUrlOverride]: (v): v is string | undefined =>
    v === undefined || (typeof v === 'string' && /^https?:\/\/.+/.test(v)),
  [KEYS.session]: isObj,
  [KEYS.user]: isObj,
  [KEYS.profile]: isObj,
  [KEYS.onboarding]: (v): v is boolean => typeof v === 'boolean',
  [KEYS.theme]: (v): v is string => typeof v === 'string',
  [KEYS.categories]: (v): v is any[] => Array.isArray(v),
  [KEYS.quests]: (v): v is any[] => Array.isArray(v),
  [KEYS.journals]: (v): v is any[] => Array.isArray(v),
};

function wrapForTTL(key: string, value: unknown) {
  return TTL[key] ? { value, ts: Date.now() } : value;
}

function unwrapForTTL(key: string, parsed: any) {
  return TTL[key] ? parsed?.value : parsed;
}

export async function setJSON(key: string, value: unknown) {
  await Storage.set(key, JSON.stringify(wrapForTTL(key, value)));
}

export async function getJSON<T = unknown>(key: string): Promise<T | null> {
  const raw = await Storage.getString(key);
  const parsed = safeParse<any>(raw);
  if (!parsed.ok) return null;
  const val = unwrapForTTL(key, parsed.value);
  return (val ?? null) as T | null;
}

export interface StorageHealthReport {
  ok: string[];
  fixed_defaulted: string[];
  deleted_invalid_json: string[];
  deleted_bad_shape: string[];
  expired: string[];
}

export async function runStorageHealthGuard(opts?: {
  autoErase?: boolean;
  scanAllUnknownKeys?: boolean;
}): Promise<StorageHealthReport> {
  const autoErase = opts?.autoErase ?? true;

  const knownKeys = Object.values(KEYS) as string[];

  let extraKeys: string[] = [];
  if (opts?.scanAllUnknownKeys && Storage.allKeys) {
    try {
      const all = await Storage.allKeys();
      extraKeys = [...all].filter((k) => !knownKeys.includes(k));
    } catch (e) {
      console.warn('[HealthGuard] Failed to scan all keys', e);
    }
  }

  const keys = [...knownKeys, ...extraKeys] as string[];

  const report: StorageHealthReport = {
    ok: [],
    fixed_defaulted: [],
    deleted_invalid_json: [],
    deleted_bad_shape: [],
    expired: [],
  };

  for (const key of keys) {
    const raw = await Storage.getString(key);

    const parsed = safeParse<any>(raw);
    if (!parsed.ok) {
      if (autoErase) {
        if (key in DEFAULTS) {
          const dv = DEFAULTS[key];
          if (dv === undefined) {
            await Storage.del(key);
          } else {
            await Storage.set(key, JSON.stringify(wrapForTTL(key, dv)));
          }
          report.fixed_defaulted.push(key);
        } else {
          await Storage.del(key);
          report.deleted_invalid_json.push(key);
        }
      }
      continue;
    }

    const ttl = TTL[key];
    if (ttl) {
      const env = parsed.value;
      const ts = isObj(env) ? (env.ts as number | undefined) : undefined;
      if (typeof ts === 'number' && Date.now() - ts > ttl) {
        if (autoErase) {
          await Storage.del(key);
          report.expired.push(key);
        }
        continue;
      }
    }

    const validator = VALIDATORS[key];
    const candidate = unwrapForTTL(key, parsed.value);
    if (validator && !validator(candidate)) {
      if (autoErase) {
        if (key in DEFAULTS) {
          const dv = DEFAULTS[key];
          if (dv === undefined) {
            await Storage.del(key);
          } else {
            await Storage.set(key, JSON.stringify(wrapForTTL(key, dv)));
          }
          report.fixed_defaulted.push(key);
        } else {
          await Storage.del(key);
          report.deleted_bad_shape.push(key);
        }
      }
      continue;
    }

    report.ok.push(key);
  }

  if (__DEV__) {
    console.log('[StorageHealthGuard] Report:', report);
    const totalIssues = 
      report.deleted_invalid_json.length +
      report.deleted_bad_shape.length +
      report.expired.length;
    if (totalIssues > 0) {
      console.log(`[StorageHealthGuard] ✅ Auto-cleared ${totalIssues} corrupt/stale items`);
    }
  }
  
  return report;
}

export async function nuclearClear() {
  console.log('[StorageHealthGuard] 💣 Nuclear clear initiated');
  await Storage.clear();
  console.log('[StorageHealthGuard] ✅ All storage cleared');
}

export interface RuntimeHealthReport {
  storage: StorageHealthReport;
  environment: {
    hasMMKV: boolean;
    storageType: 'MMKV' | 'AsyncStorage';
    platform: string;
    isDev: boolean;
  };
  timestamp: string;
}

export async function runFullHealthCheck(): Promise<RuntimeHealthReport> {
  const storageReport = await runStorageHealthGuard({ 
    autoErase: true, 
    scanAllUnknownKeys: true 
  });
  
  const { Platform } = await import('react-native');
  let hasMMKV = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-native-mmkv');
    hasMMKV = true;
  } catch {}
  
  return {
    storage: storageReport,
    environment: {
      hasMMKV,
      storageType: Storage.allKeys ? 'AsyncStorage' : 'MMKV',
      platform: Platform.OS,
      isDev: __DEV__,
    },
    timestamp: new Date().toISOString(),
  };
}
