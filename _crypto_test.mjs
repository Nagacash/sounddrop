import { generateKeypair, signMeta, verifyMeta, computeCID, hashPublicKey, isValidCid } from './lib/crypto.js';

const kp = await generateKeypair();
console.log('pub length:', kp.publicKey.length, 'priv length:', kp.privateKey.length);

const buf = new Uint8Array(1024 * 1024);
for (let i = 0; i < buf.length; i++) buf[i] = (i * 7) % 256;
const cid = await computeCID(buf.buffer);
console.log('CID:', cid.slice(0, 24), '...');
console.log('CID valid:', isValidCid(cid));

const meta = { name: 'test.mp3', size: buf.length, type: 'audio/mpeg', cid, ts: '2026-08-09T00:00:00Z' };
const sig = await signMeta(meta, kp.privateKey);
console.log('sig:', sig.slice(0, 24), '...');

const ok = await verifyMeta(meta, sig, kp.publicKey);
console.log('verify (untampered):', ok);

const tampered = { ...meta, name: 'evil.mp3' };
const ok2 = await verifyMeta(tampered, sig, kp.publicKey);
console.log('verify (tampered name):', ok2);

const other = await generateKeypair();
const h1 = await hashPublicKey(kp.publicKey);
const h2 = await hashPublicKey(other.publicKey);
console.log('hashPublicKey distinct:', h1 !== h2, h1.slice(0, 8), h2.slice(0, 8));

console.log('ROUNDTRIP', ok === true && ok2 === false && h1 !== h2 && isValidCid(cid) ? 'PASS' : 'FAIL');
