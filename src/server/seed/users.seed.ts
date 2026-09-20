import type { UserRow } from '../db/schema.types';
import { hashPassword } from '../lib/password';

/**
 * Two demo accounts so a reviewer can try both roles immediately. The password is
 * public by design (it is in the README); it protects nothing but a browser-local
 * demo. It is still hashed with PBKDF2 like any real one.
 */
export const DEMO_PASSWORD = 'zettacafe123';

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@zettacafe.id', password: DEMO_PASSWORD },
  customer: { email: 'customer@zettacafe.id', password: DEMO_PASSWORD },
} as const;

export async function buildUsers(iterations: number, createdAt: string): Promise<UserRow[]> {
  return [
    {
      id: 'usr_admin',
      firstName: 'Rayhan',
      lastName: 'Admin',
      email: DEMO_ACCOUNTS.admin.email,
      role: 'ADMIN',
      creditIdr: 500_000,
      passwordHash: await hashPassword(DEMO_PASSWORD, iterations),
      createdAt,
    },
    {
      id: 'usr_customer',
      firstName: 'Sari',
      lastName: 'Wulandari',
      email: DEMO_ACCOUNTS.customer.email,
      role: 'CUSTOMER',
      creditIdr: 250_000,
      passwordHash: await hashPassword(DEMO_PASSWORD, iterations),
      createdAt,
    },
  ];
}
