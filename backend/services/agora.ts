import { Buffer } from 'buffer';

export type AgoraRegion = 'ap' | 'eu' | 'na' | 'sa' | 'in' | 'jp' | 'kr' | 'sg' | 'us';

export type CreateResourceParams = {
  cname: string;
  uid: string; // string uid recommended for REST
  region?: AgoraRegion;
  appId?: string; // overrides env
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
  channelType: 0 | 1; // 0: communication, 1: live-broadcasting
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
  return { appId, customerId, customerSecret, appCertificate } as const;
}

function requireValue(value: string, name: string): string {
  if (!value || value.length === 0) throw new Error(`Missing env ${name}`);
  return value;
}

function getBase(region?: AgoraRegion): string {
  const { appId } = getAgoraEnv();
  return `https://api.agora.io/v1/apps/${requireValue(appId, 'AGORA_APP_ID')}/cloud_recording`;
}

function getAuthHeader(): string {
  const { customerId, customerSecret } = getAgoraEnv();
  const id = requireValue(customerId, 'AGORA_CUSTOMER_ID');
  const secret = requireValue(customerSecret, 'AGORA_CUSTOMER_SECRET');
  const token = Buffer.from(`${id}:${secret}`).toString('base64');
  return `Basic ${token}`;
}

export async function createResource(params: CreateResourceParams): Promise<CreateResourceResponse> {
  const { cname, uid, region } = params;
  const url = `${getBase(region)}/acquire`;
  const res = await fetch(url, {
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
    throw new Error(`[AGORA] acquire failed ${res.status}: ${text.substring(0, 500)}`);
  }
  return res.json() as Promise<CreateResourceResponse>;
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
        maxIdleTime: 60,
        streamTypes: 2,
        channelType: 1,
        videoStreamType: 0,
        subscribeUidGroup: 0,
        ...recordingConfig,
      } as RecordingConfig,
      // storageConfig must be provided to actually persist files. We leave blank unless configured.
      storageConfig,
      // optional server-side transcoding layout
      recordingFileConfig: { avFileType: [ 'hls' ] },
      // optional: mixed stream layout
      extensionServiceConfig: transcodingConfig ? { 
        errorHandlePolicy: 'snapshot',
      } : undefined,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[AGORA] start failed ${res.status}: ${text.substring(0, 800)}`);
  }
  return res.json() as Promise<StartRecordingResponse>;
}

export async function stopRecording(params: StopRecordingParams): Promise<StopRecordingResponse> {
  const { resourceId, sid, cname, uid, region } = params;
  const url = `${getBase(region)}/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;
  const res = await fetch(url, {
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
    throw new Error(`[AGORA] stop failed ${res.status}: ${text.substring(0, 500)}`);
  }
  return res.json() as Promise<StopRecordingResponse>;
}

export async function queryRecording(params: QueryRecordingParams): Promise<RecordingStatus> {
  const { resourceId, sid, region } = params;
  const url = `${getBase(region)}/resourceid/${resourceId}/sid/${sid}/mode/mix/query`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[AGORA] query failed ${res.status}: ${text.substring(0, 500)}`);
  }
  return res.json() as Promise<RecordingStatus>;
}

export function envSummary() {
  return {
    appIdPresent: !!process.env.AGORA_APP_ID,
    customerIdPresent: !!process.env.AGORA_CUSTOMER_ID,
    customerSecretPresent: !!process.env.AGORA_CUSTOMER_SECRET,
    appCertPresent: !!process.env.AGORA_APP_CERTIFICATE,
  } as const;
}
