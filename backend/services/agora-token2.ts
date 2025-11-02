import crypto from 'crypto';
import { deflateRawSync } from 'zlib';

export type RtcRole = 'publisher' | 'subscriber';

enum ServiceType {
  RTC = 1,
}

enum RtcPrivilege {
  JOIN_CHANNEL = 1,
  PUBLISH_AUDIO_STREAM = 2,
  PUBLISH_VIDEO_STREAM = 3,
  PUBLISH_DATA_STREAM = 4,
}

class ByteBuf {
  private parts: Buffer[] = [];

  uint16(v: number) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(v >>> 0, 0);
    this.parts.push(b);
  }
  uint32(v: number) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(v >>> 0, 0);
    this.parts.push(b);
  }
  str(s: string) {
    const buf = Buffer.from(s, 'utf8');
    this.uint16(buf.length);
    this.parts.push(buf);
  }
  mapU16U32(m: Map<number, number>) {
    this.uint16(m.size);
    for (const [k, v] of m.entries()) {
      this.uint16(k);
      this.uint32(v);
    }
  }
  mapU8Buf(m: Map<number, Buffer>) {
    this.uint16(m.size);
    for (const [k, v] of m.entries()) {
      this.uint16(k);
      this.uint16(v.length);
      this.parts.push(v);
    }
  }
  buf(): Buffer {
    return Buffer.concat(this.parts);
  }
}

class ServiceRTC {
  readonly type = ServiceType.RTC;
  constructor(
    public channelName: string,
    public uid: string,
    public privileges: Map<RtcPrivilege, number>,
  ) {}

  pack(): Buffer {
    const bb = new ByteBuf();
    bb.uint16(this.type);
    const payload = new ByteBuf();
    payload.str(this.channelName);
    payload.str(this.uid);
    const privConv = new Map<number, number>();
    for (const [k, v] of this.privileges.entries()) {
      privConv.set(k, v);
    }
    payload.mapU16U32(privConv);
    const p = payload.buf();
    bb.uint16(p.length);
    const out = Buffer.concat([bb.buf(), p]);
    return out;
  }
}

function hmacSha256(key: Buffer | string, message: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(message).digest();
}

function randomSalt(): number {
  return Math.floor(Math.random() * 0xFFFFFFFF);
}

export function buildRtc007Token(params: {
  appId: string;
  appCertificate: string;
  channelName: string;
  uid: string; // string account
  role: RtcRole;
  expireSeconds: number;
}): { token: string; expireAt: number } {
  const { appId, appCertificate, channelName, uid, role, expireSeconds } = params;
  if (!/^[0-9a-fA-F]{32}$/.test(appId)) throw new Error('Invalid AGORA_APP_ID');
  if (!/^[0-9a-fA-F]{32}$/.test(appCertificate)) throw new Error('Invalid AGORA_APP_CERTIFICATE');

  const now = Math.floor(Date.now() / 1000);
  const expireAt = now + Math.max(60, expireSeconds);
  const salt = randomSalt();

  const privileges = new Map<RtcPrivilege, number>();
  privileges.set(RtcPrivilege.JOIN_CHANNEL, expireAt);
  if (role === 'publisher') {
    privileges.set(RtcPrivilege.PUBLISH_AUDIO_STREAM, expireAt);
    privileges.set(RtcPrivilege.PUBLISH_VIDEO_STREAM, expireAt);
    privileges.set(RtcPrivilege.PUBLISH_DATA_STREAM, expireAt);
  }

  const service = new ServiceRTC(channelName, uid, privileges);

  const servicesBuf = (() => {
    const map = new Map<number, Buffer>();
    map.set(service.type, service.pack());
    const bb = new ByteBuf();
    bb.mapU8Buf(map);
    return bb.buf();
  })();

  const signingContent = (() => {
    const bb = new ByteBuf();
    bb.str(appId);
    bb.uint32(now);
    bb.uint32(salt);
    bb.uint32(expireAt);
    bb.uint16(servicesBuf.length);
    return Buffer.concat([bb.buf(), servicesBuf]);
  })();

  const signature = hmacSha256(Buffer.from(appCertificate, 'utf8'), signingContent);

  const contentWithSig = (() => {
    const bb = new ByteBuf();
    bb.uint16(signature.length);
    const header = bb.buf();
    return Buffer.concat([header, signature, signingContent]);
  })();

  const compressed = deflateRawSync(contentWithSig);
  const b64 = compressed.toString('base64');

  const token = `007${appId}${b64}`;
  return { token, expireAt };
}
