// backend/services/agora.ts
import { Buffer } from 'buffer';

export type AgoraRegion = 'ap' | 'eu' | 'na' | 'sa' | 'in' | 'jp' | 'kr' | 'sg' | 'us';

export type CreateResourceParams = {
  cname: string;
  uid: string; // string uid recommended for REST
  region?: AgoraRegion;
  appId?: string; // optional override
};

export type CreateResourceResponse = {
  resourceId: string;
};

export type StartRecordingParams = {
  resourceId: string;
  cname: string;
  uid: string;
  token: string; // RTC token required by Agora Cloud Recording join
  region?: AgoraRegion;
  recordingConfig?: Partial<RecordingConfig>;
  storageConfig?: Partial<StorageConfig>;
  transcodingConfig?: Partial<TranscodingConfig>;
};

export type StartRecordingResponse = {
  sid: string;
  resourceId: string;
};

export type StopRecordingParams = {
  resourceId: string;
  sid: string;
  cname: string;
  uid: string;
  region?: AgoraRegion;
};

export type StopRecordingResponse = {
  resourceId: string;
  sid: string;
};

export type QueryRecordingParams = {
  resourceId: string;
  sid: string;
  region?: AgoraRegion;
};

export type RecordingStatus = {
  status: number;
  fileList?: unknown;
};

export type RecordingConfig = {
  maxIdleTime: number;
  streamTypes: 0 | 1 | 2; // 0 audio, 1 video, 2 both
  channelType: 0 | 1; // 0 communication, 1 live-broadcasting
  videoStreamType: 0 | 1; // 0 high, 1 low
  subscribeUidGroup: 0 | 1 | 2;
};

export type StorageConfig = {
  vendor: 1 | 2 | 3 | 4 | 5; // 1 qiniu, 2 AWS S3, 3 Aliyun OSS, 4 Tencent COS, 5 Azure
  region: number; // depends on vendor
  bucket: string;
  accessKey: string;
  secretKey: string;
  fileNamePrefix: string[];
};

export type TranscodingConfig = {
  height: number;
  width: number;
  bitrate: number;
  fps: number;
  mixedVideoLayout: 0 | 1 | 2 | 3 | 4;
};

function getAgoraEnv() {
  const appId = process.env.AGORA_APP_ID ?? '';
  const customerId = process.env.AGORA_CUSTOMER_ID ?? '';
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET ?? '';
  const appCertificate = process.env.AGORA_APP_CERTIFICATE ?? '';
  const tempCertificate = process.env.AGORA_APP_TEMP_CERTIFICATE ?? '';
  return { appId, customerId, customerSecret, appCertificate, tempCertificate } as const;
}

function requireValue(value: string, name: string): string {
  if (!value || value.length === 0) throw new Error(`Missing env ${name}`);
  return value;
}

function getBase(_region?: AgoraRegion): string {
  // Agora Cloud Recording base endpoint (region is handled server-side by Agora;
  // some deployments pass a "region" query param, but Agora’s v1 API resolves it internally).
  const { appId } = getAgoraEnv();
  return `https://api.agora.io/v1/apps/${requireValue(appId, 'AGORA_APP_ID')}/cloud_recording`;
}

function getAuthHeader(): string {
  const { customerId, customerSecret } = getAgoraEnv();
  const id = requireValue(customerId, 'AGORA_CUSTOMER_ID');
  const secret = requireValue(customerSecret, 'AGORA_CUSTOMER_SECRET');
  const token = Buffer.from(`${id}:${secret}`).toString('base64');
  const header = `Basic ${token}`;
  console.log('[AGORA] Auth header created:', {
    customerId: id.substring(0, 8) + '...',
    secretLength: secret.length,
    base64Length: token.length,
  });
  return header;
}

// ---- Fetch helper with timeout & better errors ----
async function request(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15000, ...opts } = init;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...opts,
      signal: ac.signal,
    });
    return res;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`[AGORA] Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw new Error(`[AGORA] Network error calling ${url}: ${err?.message || String(err)}`);
  } finally {
    clearTimeout(t);
  }
}

async function parseJson<T>(res: Response, context: string): Promise<T> {
  const text = await res.text();
  console.log(`[AGORA] ${context} response status: ${res.status}`);
  console.log(`[AGORA] ${context} response body:`, text.substring(0, 500));
  try {
    return JSON.parse(text) as T;
  } catch {
    // Agora sometimes returns plain text on errors
    throw new Error(
      `[AGORA] ${context} ${res.status} ${res.statusText}. Non-JSON response: ${text.substring(0, 800)}`
    );
  }
}

// ---- API calls ----

export async function createResource(params: CreateResourceParams): Promise<CreateResourceResponse> {
  const { cname, uid, region } = params;
  const url = `${getBase(region)}/acquire`;
  
  const authHeader = getAuthHeader();
  const requestBody = {
    cname,
    uid,
    clientRequest: {},
  };
  
  console.log('[AGORA] Acquire request:', {
    url,
    authHeaderPresent: !!authHeader,
    body: requestBody,
  });
  
  const res = await request(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[AGORA] Acquire failed with status', res.status);
    console.error('[AGORA] Response headers:', Object.fromEntries(res.headers.entries()));
    console.error('[AGORA] Response body:', body.substring(0, 800));
    throw new Error(`[AGORA] acquire failed ${res.status}: ${body.substring(0, 800)}`);
  }
  return parseJson<CreateResourceResponse>(res, 'acquire');
}

export async function startRecording(params: StartRecordingParams): Promise<StartRecordingResponse> {
  const { resourceId, cname, uid, token, region, recordingConfig, storageConfig, transcodingConfig } = params;
  const url = `${getBase(region)}/resourceid/${resourceId}/mode/mix/start`;

  const body = {
    cname,
    uid,
    clientRequest: {
      token,
      recordingConfig: {
        maxIdleTime: 60,      // stop if no audio/video in 60s
        streamTypes: 2,       // audio + video
        channelType: 1,       // 1 = live-broadcasting
        videoStreamType: 0,   // 0 = high
        subscribeUidGroup: 0, // default
        ...recordingConfig,
      } as RecordingConfig,
      // IMPORTANT: storageConfig must be provided to persist files; otherwise recording runs but nothing is saved.
      // Provide S3/Azure/etc. creds via env and inject here if needed.
      storageConfig,
      recordingFileConfig: { avFileType: ['hls'] },
      // Optional: server-side layout/transcoding for mixed stream
      extensionServiceConfig: transcodingConfig
        ? { errorHandlePolicy: 'snapshot' }
        : undefined,
    },
  };

  const res = await request(url, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    timeoutMs: 20000,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[AGORA] start failed ${res.status}: ${text.substring(0, 800)}`
    );
  }
  return parseJson<StartRecordingResponse>(res, 'start failed');
}

export async function stopRecording(params: StopRecordingParams): Promise<StopRecordingResponse> {
  const { resourceId, sid, cname, uid, region } = params;
  const url = `${getBase(region)}/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;

  const res = await request(url, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cname,
      uid,
      clientRequest: {},
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[AGORA] stop failed ${res.status}: ${text.substring(0, 800)}`
    );
  }
  return parseJson<StopRecordingResponse>(res, 'stop failed');
}

export async function queryRecording(params: QueryRecordingParams): Promise<RecordingStatus> {
  const { resourceId, sid, region } = params;
  const url = `${getBase(region)}/resourceid/${resourceId}/sid/${sid}/mode/mix/query`;

  const res = await request(url, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[AGORA] query failed ${res.status}: ${text.substring(0, 800)}`
    );
  }
  return parseJson<RecordingStatus>(res, 'query failed');
}

export function envSummary() {
  return {
    appIdPresent: !!process.env.AGORA_APP_ID,
    customerIdPresent: !!process.env.AGORA_CUSTOMER_ID,
    customerSecretPresent: !!process.env.AGORA_CUSTOMER_SECRET,
    appCertPresent: !!process.env.AGORA_APP_CERTIFICATE,
    tempCertPresent: !!process.env.AGORA_APP_TEMP_CERTIFICATE,
  } as const;
}
