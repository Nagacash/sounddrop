import { generateKeypair, signMeta, computeCID } from './lib/crypto.js';
import { verifyIngest } from './lib/ingest.js';

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

// --- setup: an artist with a registered key ---
const artist = await generateKeypair();
const buf = new Uint8Array(512 * 1024);
for (let i = 0; i < buf.length; i++) buf[i] = (i * 13) % 256;
const audioBuffer = buf.buffer;
const cid = await computeCID(audioBuffer);
const meta = { name: 'drop.mp3', size: buf.length, type: 'audio/mpeg', cid, ts: '2026-08-09T00:00:00Z' };
const signature = await signMeta(meta, artist.privateKey);

// Gate 1+3 + matching registered key -> ok
const r1 = await verifyIngest({ meta, signature, publicKey: artist.publicKey, audioBuffer, registeredPublicKey: artist.publicKey });
check('valid upload accepted', r1.ok === true && r1.problems.length === 0);

// Gate 2 violation: registered key differs from signed key
const other = await generateKeypair();
const r2 = await verifyIngest({ meta, signature, publicKey: artist.publicKey, audioBuffer, registeredPublicKey: other.publicKey });
check('public_key_mismatch detected', r2.ok === false && r2.problems.includes('public_key_mismatch'));

// Gate 1 violation: tampered meta (wrong name) but correct key registered
const tamperedMeta = { ...meta, name: 'hacked.mp3' };
const r3 = await verifyIngest({ meta: tamperedMeta, signature, publicKey: artist.publicKey, audioBuffer, registeredPublicKey: artist.publicKey });
check('signature_invalid on tampered meta', r3.ok === false && r3.problems.includes('signature_invalid'));

// Gate 3 violation: audio bytes swapped but meta.cid unchanged
const buf2 = new Uint8Array(512 * 1024); for (let i = 0; i < buf2.length; i++) buf2[i] = (i * 7) % 256;
const r4 = await verifyIngest({ meta, signature, publicKey: artist.publicKey, audioBuffer: buf2.buffer, registeredPublicKey: artist.publicKey });
check('cid_mismatch detected', r4.ok === false && r4.problems.includes('cid_mismatch'));

// Forge attempt: attacker signs with THEIR key, registers THEIR key -> server still stores under victim?
// No: server binds publicKey to the authenticated Clerk user. Attacker can only register their own key.
// The CID (content hash) still ties the audio to the signature, so a swapped file fails gate 3.
const attacker = await generateKeypair();
const attackerSig = await signMeta(meta, attacker.privateKey);
const r5 = await verifyIngest({ meta, signature: attackerSig, publicKey: attacker.publicKey, audioBuffer, registeredPublicKey: attacker.publicKey });
check('attacker self-signed accepted under own id (expected, isolated)', r5.ok === true);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
