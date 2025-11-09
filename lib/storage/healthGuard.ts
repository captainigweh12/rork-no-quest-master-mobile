import { Storage } from './adapter';

type Validator<T> = (value: unknown) => value is T;

const isObject: Validator<Record<string, unknown>> = (v): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const safeParse = <T = unknown>(raw: string | null): { ok: true; value: T } | { ok: false } => {
  if (raw == null || raw === '') return { ok: false };
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false };
  }
};

export const KEYS = {
  baseUrlOverride: 'EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE',
  session: 'auth:session',
  user: 'app:user',
  profile: 'app:profile',
} as const;

const TTL: Partial<Record<string, number>> = {
  [KEYS.session]: 1000 * 60 * 60 * 24 * 7,
};

const DEFAULTS: Partial<Record<string, unknown>> = {
  [KEYS.baseUrlOverride]: undefined,
};

const isValidBaseUrl = (v: unknown): v is string | undefined =>
  v === undefined || (typeof v === 'string' && /^https?:\/\/.+/.test(v));

const VALIDATORS: Partial<Record<string, Validator<unknown>>> = {
  [KEYS.baseUrlOverride]: isValidBaseUrl,
  [KEYS.session]: isObject,
  [KEYS.user]: isObject,
  [KEYS.profile]: isObject,
};

const SCHEMA_KEY = '__storage_schema__';
const CURRENT_SCHEMA = 1;

type SchemaState = { version: number };

async function migrateIfNeeded() {
  const raw = await Storage.getString(SCHEMA_KEY);
  const parsed = safeParse<SchemaState>(raw);
  const version = parsed.ok && typeof parsed.value?.version === 'number' ? parsed.value.version : 0;

  if (version >= CURRENT_SCHEMA) return;

  await Storage.set(SCHEMA_KEY, JSON.stringify({ version: CURRENT_SCHEMA }));
}

async function validateKey(key: string) {
  const raw = await Storage.getString(key);

  const parsed = safeParse<unknown>(raw);
  if (!parsed.ok) {
    if (key in DEFAULTS) {
      const val = DEFAULTS[key];
      if (val === undefined) await Storage.del(key);
      else await Storage.set(key, JSON.stringify(val));
    } else {
      await Storage.del(key);
    }
    return { key, action: 'deleted-invalid' as const };
  }

  const ttl = TTL[key];
  if (ttl) {
    const envelopeOk = isObject(parsed.value) && 'value' in parsed.value && 'ts' in parsed.value;
    if (envelopeOk) {
      const { ts } = parsed.value as { value: unknown; ts: number };
      if (typeof ts === 'number' && Date.now() - ts > ttl) {
        await Storage.del(key);
        return { key, action: 'expired' as const };
      }
    }
  }

  const validator = VALIDATORS[key];
  if (validator) {
    const envelope = parsed.value;
    const candidate = TTL[key] ? (envelope as { value: unknown }).value : envelope;
    if (!validator(candidate)) {
      await Storage.del(key);
      return { key, action: 'deleted-bad-shape' as const };
    }
  }

  return { key, action: 'ok' as const };
}

export async function setJSONWithTTL(key: string, value: unknown) {
  const ttl = TTL[key];
  if (ttl) {
    await Storage.set(key, JSON.stringify({ value, ts: Date.now() }));
  } else {
    await Storage.set(key, JSON.stringify(value));
  }
}

export async function getJSON<T = unknown>(key: string): Promise<T | null> {
  const raw = await Storage.getString(key);
  const parsed = safeParse<unknown>(raw);
  if (!parsed.ok) return null;

  const ttl = TTL[key];
  if (ttl) {
    const envelope = parsed.value as { value: T; ts: number };
    return envelope.value ?? null;
  }
  return (parsed.value as T) ?? null;
}

export async function runStorageHealthCheck() {
  await migrateIfNeeded();

  const keys = Object.values(KEYS);
  const results = await Promise.all(keys.map(validateKey));
  const summary = results.reduce<Record<string, string[]>>((acc, r) => {
    (acc[r.action] ??= []).push(r.key);
    return acc;
  }, {});
  if (__DEV__) console.log('[StorageHealth]', summary);
  return summary;
}

export async function nuclearClear() {
  await Storage.clear();
  await Storage.set(SCHEMA_KEY, JSON.stringify({ version: CURRENT_SCHEMA }));
}
