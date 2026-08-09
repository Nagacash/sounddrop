// Server-side ingest verification. Three independent gates — all must pass:
//  1. signature verifies against the public key
//  2. public key matches the registered artist's key
//  3. cid matches the actual hash of the uploaded audio bytes
// If any fail, the upload is rejected. The server cannot forge an artist's signature
// because it never possesses the private key.

import { verifyMeta, computeCID, isValidCid, timingSafeEqualStr } from './crypto.js';

function validateMeta(meta, audioByteLength) {
  const problems = [];
  if (!meta || typeof meta !== 'object') {
    return ['meta_invalid'];
  }
  if (typeof meta.name !== 'string' || !meta.name || meta.name.length > 512) {
    problems.push('meta_name_invalid');
  }
  if (typeof meta.type !== 'string' || !meta.type) {
    problems.push('meta_type_invalid');
  }
  if (typeof meta.ts !== 'string' || !meta.ts) {
    problems.push('meta_ts_invalid');
  }
  if (typeof meta.cid !== 'string' || !isValidCid(meta.cid)) {
    problems.push('meta_cid_invalid');
  }
  // Bind signed size to the real upload length so a signer can't claim a different file size.
  if (typeof meta.size !== 'number' || !Number.isInteger(meta.size) || meta.size !== audioByteLength) {
    problems.push('meta_size_mismatch');
  }
  return problems;
}

export async function verifyIngest({ meta, signature, publicKey, audioBuffer, registeredPublicKey }) {
  const audioByteLength = audioBuffer instanceof ArrayBuffer
    ? audioBuffer.byteLength
    : (audioBuffer?.byteLength ?? -1);

  const problems = validateMeta(meta, audioByteLength);
  // Fail closed on malformed meta before crypto work when possible.
  if (problems.includes('meta_invalid')) {
    return { ok: false, problems, realCid: null };
  }

  // Gate 1: signature over canonical meta
  const sigOk = await verifyMeta(meta, signature, publicKey);
  if (!sigOk) problems.push('signature_invalid');

  // Gate 2: public key must equal the one registered to this artist
  if (!timingSafeEqualStr(publicKey, registeredPublicKey)) {
    problems.push('public_key_mismatch');
  }

  // Gate 3: cid must equal the real hash of the audio bytes
  const realCid = await computeCID(audioBuffer);
  if (!timingSafeEqualStr(realCid, meta.cid)) {
    problems.push('cid_mismatch');
  }

  return { ok: problems.length === 0, problems, realCid };
}
