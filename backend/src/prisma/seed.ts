import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed script — optional dev helper.
 * In production, the first-time setup flow (/setup) replaces this.
 * Only seeds if no users exist in the database.
 */
async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already has users — skipping seed. Use the /setup page for first-time setup.');
    return;
  }

  console.log('No users found. Seeding database with default admin...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@hivetech.dev' },
    update: {},
    create: {
      email: 'admin@hivetech.dev',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log(`Created user: ${user.email}`);

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'hivetech' },
    update: {},
    create: {
      name: 'HiveTech',
      slug: 'hivetech',
      description: 'Default workspace',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  console.log(`Created workspace: ${workspace.name}`);

  const project = await prisma.project.upsert({
    where: {
      workspaceId_key: {
        workspaceId: workspace.id,
        key: 'HT',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'HiveTech Project',
      key: 'HT',
      description: 'Default project',
      members: {
        create: {
          userId: user.id,
          role: 'ADMIN',
        },
      },
      statuses: {
        createMany: {
          data: [
            { name: 'Backlog', color: '#6B7280', category: 'NOT_STARTED', position: 0, isDefault: true },
            { name: 'Todo', color: '#3B82F6', category: 'NOT_STARTED', position: 1 },
            { name: 'In Progress', color: '#F59E0B', category: 'ACTIVE', position: 2 },
            { name: 'In Review', color: '#8B5CF6', category: 'ACTIVE', position: 3 },
            { name: 'Done', color: '#10B981', category: 'DONE', position: 4 },
            { name: 'Cancelled', color: '#EF4444', category: 'CANCELLED', position: 5 },
          ],
        },
      },
    },
  });

  console.log(`Created project: ${project.name}`);
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
