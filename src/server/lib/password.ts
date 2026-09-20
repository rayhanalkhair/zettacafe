/**
 * Password hashing with PBKDF2-SHA-256 via the Web Crypto API.
 *
 * Stored as `pbkdf2$<iterations>$<salt b64>$<hash b64>`, so the work factor can
 * be raised later while old hashes keep verifying. Plain SHA or a fixed salt would
 * make the demo accounts' hashes trivially reversible; this is the same scheme a
 * real service would use.
 */

const encoder = new TextEncoder();
const SALT_BYTES = 16;
const HASH_BITS = 256;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations: number): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Compares in constant time so a mismatch does not reveal how many bytes matched. */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationText, saltText, hashText] = stored.split('$');
  const iterations = Number(iterationText);
  if (scheme !== 'pbkdf2' || !Number.isInteger(iterations) || iterations < 1) return false;
  if (!saltText || !hashText) return false;
  const actual = await derive(password, fromBase64(saltText), iterations);
  return equalBytes(actual, fromBase64(hashText));
}
