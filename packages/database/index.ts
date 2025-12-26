export * from '@prisma/client';
export { PrismaClient, Prisma } from '@prisma/client';

// Explicit runtime enums (mirror Prisma schema enums)
export const CourseStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type CourseStatus = typeof CourseStatus[keyof typeof CourseStatus];

export const CourseLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  EXPERT: 'EXPERT',
} as const;
export type CourseLevel = typeof CourseLevel[keyof typeof CourseLevel];

export const EventAccessType = {
  FREE: 'FREE',
  PAID: 'PAID',
  TIER: 'TIER',
} as const;
export type EventAccessType = typeof EventAccessType[keyof typeof EventAccessType];

export const EventMode = {
  ONLINE: 'ONLINE',
  IN_PERSON: 'IN_PERSON',
  HYBRID: 'HYBRID',
} as const;
export type EventMode = typeof EventMode[keyof typeof EventMode];

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
