// backend/services/agora-token2.ts
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
    b.writeUInt16LE((v >>> 0) & 0xffff, 0);
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
    public uid: string, // string account per AccessToken2
    public privileges: Map<RtcPrivilege, number>,
  ) {}

  pack(): Buffer {
    const bb = new ByteBuf();
    bb.uint16(this.type);

    const payload = new ByteBuf();
    payload.str(this.channelName);
    payload.str(this.uid);

    const privConv = new Map<number, number>();
    for (const [k, v] of this.privileges.entries()) privConv.set(k, v);
    payload.mapU16U32(privConv);

    const p = payload.buf();
    bb.uint16(p.length);
    return Buffer.concat([bb.buf(), p]);
  }
}

function hmacSha256(key: Buffer | string, message: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(message).digest();
}

function randomSalt(): number {
  // full uint32 range
  return Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
}

export function buildRtc007Token(params: {
  appId: string;
  appCertificate: string; // 32-hex
  channelName: string;
  uid: string; // string account (can be numeric-as-string too)
  role: RtcRole;
  expireSeconds: number; // 60..86400 typically
}): { token: string; expireAt: number } {
  const { appId, appCertificate, channelName, uid, role, expireSeconds } = params;

  if (!/^[0-9a-fA-F]{32}$/.test(appId)) {
    throw new Error('Invalid AGORA_APP_ID (expect 32-hex)');
  }
  if (!/^[0-9a-fA-F]{32}$/.test(appCertificate)) {
    throw new Error('Invalid AGORA_APP_CERTIFICATE (expect 32-hex)');
  }
  if (!channelName) throw new Error('channelName required');
  if (!uid) throw new Error('uid required');

  const now = Math.floor(Date.now() / 1000);
  const expireAt = now + Math.max(60, Math.min(86400 * 7, expireSeconds)); // cap at 7 days for sanity
  const salt = randomSalt();

  const privileges = new Map<RtcPrivilege, number>();
  privileges.set(RtcPrivilege.JOIN_CHANNEL, expireAt);
  if (role === 'publisher') {
    privileges.set(RtcPrivilege.PUBLISH_AUDIO_STREAM, expireAt);
    privileges.set(RtcPrivilege.PUBLISH_VIDEO_STREAM, expireAt);
    privileges.set(RtcPrivilege.PUBLISH_DATA_STREAM, expireAt);
  }

  const service = new ServiceRTC(channelName, uid, privileges);

  // Services block
  const servicesBuf = (() => {
    const map = new Map<number, Buffer>();
    map.set(service.type, service.pack());
    const bb = new ByteBuf();
    bb.mapU8Buf(map);
    return bb.buf();
  })();

  // Signing content = appId + ts + salt + expireAt + len(services) + services
  const signingContent = (() => {
    const bb = new ByteBuf();
    bb.str(appId);
    bb.uint32(now);
    bb.uint32(salt);
    bb.uint32(expireAt);
    bb.uint16(servicesBuf.length);
    return Buffer.concat([bb.buf(), servicesBuf]);
  })();

  // IMPORTANT: use cert as HEX key (not utf8)
  const signature = hmacSha256(Buffer.from(appCertificate, 'hex'), signingContent);

  // Prepend signature length (u16), then signature, then content
  const contentWithSig = (() => {
    const bb = new ByteBuf();
    bb.uint16(signature.length);
    return Buffer.concat([bb.buf(), signature, signingContent]);
  })();

  // 007 = AccessToken2 prefix, then appId, then base64(deflateRaw(content))
  const compressed = deflateRawSync(contentWithSig);
  const b64 = compressed.toString('base64');
  const token = `007${appId}${b64}`;

  return { token, expireAt };
}
