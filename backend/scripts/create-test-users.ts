import { prisma } from '../src/config/prisma';
import { buildProfile } from '../src/utils/employee-profile';
import { hashPassword } from '../src/utils/password';
import crypto from 'crypto';

async function main() {
  const users = [
    { name: 'Admin One', email: 'admin1@test.com', password: 'Admin1Pass!', role: 'admin' as const },
    { name: 'Admin Two', email: 'admin2@test.com', password: 'Admin2Pass!', role: 'admin' as const },
  ];
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) { console.log('EXISTS:', u.email); continue; }
    const profile = buildProfile(u.role);
    const user = await prisma.user.create({
      data: { id: crypto.randomUUID(), name: u.name, email: u.email, passwordHash: await hashPassword(u.password), role: u.role, emailVerified: true, updatedAt: new Date(), ...profile },
    });
    console.log('CREATED:', user.email, user.role);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
