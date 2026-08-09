// Shared Ed25519 signing helpers — identical in browser and Node (Web Crypto API).
// The server verifies what the browser signs. No native deps.

// Browser: crypto.subtle. Node 20+: globalThis.crypto.subtle (webcrypto).
function subtle() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto unavailable');
}

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';

/** RFC 4648 base32 (lowercase, no padding) — multibase 'b' alphabet. */
export function base32Encode(bytes) {
  const src = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < src.length; i++) {
    value = (value << 8) | src[i];
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  const CH = 0x8000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CH) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(out);
}

export function b64ToBuf(b64) {
  if (typeof b64 !== 'string' || !b64) throw new Error('invalid base64');
  // Reject non-base64 early so garbage keys/signatures fail closed.
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64)) throw new Error('invalid base64');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Constant-time string equality for crypto material (CID / public keys). */
export function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(aa.length, bb.length);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (aa[i] || 0) ^ (bb[i] || 0);
  }
  return diff === 0;
}

// Generate a brand-new Ed25519 keypair. Private key is exportable (extractable)
// so the artist can back it up. NEVER send the private key anywhere.
export async function generateKeypair() {
  const kp = await subtle().generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    privateKey: bufToB64(await subtle().exportKey('pkcs8', kp.privateKey)),
    publicKey: bufToB64(await subtle().exportKey('spki', kp.publicKey)),
  };
}

// Deterministic canonical string of the track meta. Both sides MUST build this
// identically, or signatures won't verify.
export function canonicalMeta(meta) {
  return JSON.stringify({
    name: meta.name,
    size: meta.size,
    type: meta.type,
    cid: meta.cid,
    ts: meta.ts,
  });
}

// Sign the canonical meta with the private key. Returns base64 signature.
export async function signMeta(meta, privateKeyB64) {
  const key = await subtle().importKey(
    'pkcs8',
    b64ToBuf(privateKeyB64),
    { name: 'Ed25519' },
    false,
    ['sign'],
  );
  const sig = await subtle().sign({ name: 'Ed25519' }, key, new TextEncoder().encode(canonicalMeta(meta)));
  return bufToB64(sig);
}

// Verify a signature against a public key. Returns boolean.
export async function verifyMeta(meta, signatureB64, publicKeyB64) {
  try {
    const key = await subtle().importKey(
      'spki',
      b64ToBuf(publicKeyB64),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    const sig = new Uint8Array(b64ToBuf(signatureB64));
    // Ed25519 signatures are exactly 64 bytes.
    if (sig.byteLength !== 64) return false;
    return subtle().verify(
      { name: 'Ed25519' },
      key,
      sig,
      new TextEncoder().encode(canonicalMeta(meta)),
    );
  } catch {
    return false;
  }
}

/**
 * Content address (CIDv1): multibase base32 of
 *   [0x01 version][0x55 raw-codec][0x12 sha2-256][0x20 len][32-byte digest]
 * URL-safe (a-z2-7 only after the leading 'b').
 */
export async function computeCID(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer) && !(ArrayBuffer.isView(arrayBuffer))) {
    throw new Error('computeCID requires ArrayBuffer or TypedArray');
  }
  const bytes = arrayBuffer instanceof ArrayBuffer
    ? arrayBuffer
    : arrayBuffer.buffer.slice(arrayBuffer.byteOffset, arrayBuffer.byteOffset + arrayBuffer.byteLength);

  const digest = new Uint8Array(await subtle().digest('SHA-256', bytes));
  // CIDv1 binary — length prefix 0x20 MUST NOT be overwritten by the digest.
  const cidBytes = new Uint8Array(4 + digest.length);
  cidBytes[0] = 0x01; // CIDv1
  cidBytes[1] = 0x55; // raw
  cidBytes[2] = 0x12; // sha2-256
  cidBytes[3] = 0x20; // 32-byte digest length
  cidBytes.set(digest, 4);
  return 'b' + base32Encode(cidBytes);
}

/** True if string looks like our CIDv1 multibase base32 form. */
export function isValidCid(cid) {
  return typeof cid === 'string' && /^b[a-z2-7]{50,}$/.test(cid);
}

/**
 * Stable artist identity from public key.
 * MUST hash the full key — Ed25519 SPKI shares a fixed ASN.1/base64 prefix, so
 * truncating the base64 string collides every key to the same id.
 */
export async function hashPublicKey(publicKey) {
  if (typeof publicKey !== 'string' || !publicKey) {
    throw new Error('publicKey required');
  }
  // Hash raw SPKI bytes (not the base64 text) so encoding variants can't alias.
  const keyBytes = new Uint8Array(b64ToBuf(publicKey));
  const digest = new Uint8Array(await subtle().digest('SHA-256', keyBytes));
  // 128 bits of hex — collision-resistant URL slug, no special chars.
  return Array.from(digest.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
