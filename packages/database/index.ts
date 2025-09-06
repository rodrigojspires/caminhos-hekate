export * from '@prisma/client';
export { PrismaClient, Prisma } from '@prisma/client';

// Explicit re-exports for model enums to support named imports
export type CourseStatus = Prisma.CourseStatus;
// @ts-expect-error Prisma exposes runtime enum under Prisma namespace
export const CourseStatus = Prisma.CourseStatus as unknown as Record<string, CourseStatus>;

export type CourseLevel = Prisma.CourseLevel;
// @ts-expect-error Prisma exposes runtime enum under Prisma namespace
export const CourseLevel = Prisma.CourseLevel as unknown as Record<string, CourseLevel>;

// Singleton pattern para evitar múltiplas instâncias em desenvolvimento
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
