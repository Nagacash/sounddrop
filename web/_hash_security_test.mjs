/**
 * Security harness for content CID + public-key identity hashes.
 * Run: node --experimental-strip-types web/_hash_security_test.mjs
 *  or:  node web/_hash_security_test.mjs  (from repo root with path below)
 */
import {
  generateKeypair,
  signMeta,
  verifyMeta,
  computeCID,
  hashPublicKey,
  isValidCid,
  base32Encode,
} from './lib/crypto.js';
import { verifyIngest } from './lib/ingest.js';

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) {
    pass++;
    console.log('PASS', name);
  } else {
    fail++;
    console.log('FAIL', name);
  }
};

// --- public key hash must NOT collide across distinct Ed25519 keys ---
const a = await generateKeypair();
const b = await generateKeypair();
const ha = await hashPublicKey(a.publicKey);
const hb = await hashPublicKey(b.publicKey);
check('hashPublicKey distinct for two keys', ha !== hb);
check('hashPublicKey hex slug shape', /^[0-9a-f]{32}$/.test(ha) && /^[0-9a-f]{32}$/.test(hb));
check('hashPublicKey deterministic', (await hashPublicKey(a.publicKey)) === ha);

// --- CID: correct layout, URL-safe, collision-free for different bytes ---
const buf1 = new Uint8Array(1024);
for (let i = 0; i < buf1.length; i++) buf1[i] = (i * 7) % 256;
const buf2 = new Uint8Array(1024);
for (let i = 0; i < buf2.length; i++) buf2[i] = (i * 11) % 256;

const cid1 = await computeCID(buf1.buffer);
const cid2 = await computeCID(buf2.buffer);
check('CID differs for different content', cid1 !== cid2);
check('CID valid multibase form', isValidCid(cid1) && isValidCid(cid2));
check('CID URL-safe (no +/=/)', !/[+/=]/.test(cid1) && !/[+/=]/.test(cid2));
check('CID deterministic', (await computeCID(buf1.buffer)) === cid1);

// Explicit layout check: sha256 digest embedded after 0x01 0x55 0x12 0x20
const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf1.buffer));
const expectedBytes = new Uint8Array(36);
expectedBytes.set([0x01, 0x55, 0x12, 0x20], 0);
expectedBytes.set(digest, 4);
check('CID matches CIDv1 raw+sha256 encoding', cid1 === 'b' + base32Encode(expectedBytes));

// --- sign/verify still works with new CID ---
const meta = {
  name: 'drop.mp3',
  size: buf1.length,
  type: 'audio/mpeg',
  cid: cid1,
  ts: '2026-08-09T00:00:00Z',
};
const sig = await signMeta(meta, a.privateKey);
check('verify untampered', (await verifyMeta(meta, sig, a.publicKey)) === true);
check('verify rejects tampered name', (await verifyMeta({ ...meta, name: 'x.mp3' }, sig, a.publicKey)) === false);

// --- ingest gates ---
const ok = await verifyIngest({
  meta,
  signature: sig,
  publicKey: a.publicKey,
  audioBuffer: buf1.buffer,
  registeredPublicKey: a.publicKey,
});
check('ingest accepts valid upload', ok.ok === true);

const sizeLie = await verifyIngest({
  meta: { ...meta, size: buf1.length - 1 },
  signature: sig,
  publicKey: a.publicKey,
  audioBuffer: buf1.buffer,
  registeredPublicKey: a.publicKey,
});
check('ingest rejects size mismatch', sizeLie.ok === false && sizeLie.problems.includes('meta_size_mismatch'));

const swapped = await verifyIngest({
  meta,
  signature: sig,
  publicKey: a.publicKey,
  audioBuffer: buf2.buffer,
  registeredPublicKey: a.publicKey,
});
check('ingest rejects cid mismatch on swapped bytes', swapped.ok === false && swapped.problems.includes('cid_mismatch'));

const badCidMeta = { ...meta, cid: 'not-a-cid' };
const badCidSig = await signMeta(badCidMeta, a.privateKey);
const badCid = await verifyIngest({
  meta: badCidMeta,
  signature: badCidSig,
  publicKey: a.publicKey,
  audioBuffer: buf1.buffer,
  registeredPublicKey: a.publicKey,
});
check('ingest rejects invalid cid format', badCid.ok === false && badCid.problems.includes('meta_cid_invalid'));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
