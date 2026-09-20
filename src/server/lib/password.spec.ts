import { hashPassword, verifyPassword } from './password';

// A low work factor keeps the suite fast; production uses DEFAULT_CONFIG.
const ITERATIONS = 1_000;

describe('password hashing', () => {
  it('verifies the right password', async () => {
    const stored = await hashPassword('correct horse', ITERATIONS);
    expect(await verifyPassword('correct horse', stored)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('correct horse', ITERATIONS);
    expect(await verifyPassword('battery staple', stored)).toBe(false);
  });

  it('records the scheme and work factor in the stored value', async () => {
    const stored = await hashPassword('x-password', ITERATIONS);
    expect(stored.startsWith(`pbkdf2$${ITERATIONS}$`)).toBe(true);
    expect(stored.split('$')).toHaveLength(4);
  });

  it('never stores the password itself', async () => {
    const stored = await hashPassword('super-secret-value', ITERATIONS);
    expect(stored).not.toContain('super-secret-value');
  });

  it('uses a fresh salt every time', async () => {
    const a = await hashPassword('same-password', ITERATIONS);
    const b = await hashPassword('same-password', ITERATIONS);
    expect(a).not.toBe(b);
    expect(await verifyPassword('same-password', a)).toBe(true);
    expect(await verifyPassword('same-password', b)).toBe(true);
  });

  it('keeps verifying hashes made with an older work factor', async () => {
    const old = await hashPassword('legacy-password', 500);
    expect(await verifyPassword('legacy-password', old)).toBe(true);
  });

  it.each(['', 'plaintext', 'md5$1$a$b', 'pbkdf2$abc$salt$hash', 'pbkdf2$0$salt$hash'])(
    'rejects a malformed stored value: %j',
    async (stored) => {
      expect(await verifyPassword('anything', stored)).toBe(false);
    },
  );
});
