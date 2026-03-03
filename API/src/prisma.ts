import { PrismaClient } from '@prisma/client';

// Reutilizar instância em ambiente serverless para evitar "Too many connections"
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
