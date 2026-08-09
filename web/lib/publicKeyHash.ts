import { hashPublicKey as hashPublicKeyAsync } from './crypto.js';

/**
 * URL-safe artist identifier derived from the Ed25519 public key via SHA-256.
 * Async on purpose — must cryptographically hash; truncating SPKI base64 collides.
 */
export async function hashPublicKey(publicKey: string): Promise<string> {
  return hashPublicKeyAsync(publicKey);
}
