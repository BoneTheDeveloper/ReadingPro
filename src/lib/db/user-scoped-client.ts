import { Prisma } from '@prisma/client';
import { db } from './client';

const READ_OPS = new Set(['findFirst', 'findMany', 'count', 'aggregate', 'groupBy']);
const FIND_UNIQUE_OPS = new Set(['findUnique', 'findUniqueOrThrow']);
const WRITE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

type PrismaQueryCtx = {
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
  operation: string;
};

function isOwnedRecord(result: unknown): result is { userId: string } {
  return typeof result === 'object' && result !== null && 'userId' in result;
}

async function verifyFindUniqueOwnership(ctx: PrismaQueryCtx, userId: string): Promise<unknown> {
  const result = await ctx.query(ctx.args);
  if (isOwnedRecord(result) && result.userId !== userId) {
    if (ctx.operation === 'findUniqueOrThrow') {
      throw new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: Prisma.prismaVersion.client }
      );
    }
    return null;
  }
  return result;
}

async function enforceUserScope(ctx: PrismaQueryCtx, userId: string): Promise<unknown> {
  if (ctx.operation === 'create') {
    ctx.args.data = { ...(ctx.args.data as Record<string, unknown>), userId };
    return ctx.query(ctx.args);
  }

  if (FIND_UNIQUE_OPS.has(ctx.operation)) {
    return verifyFindUniqueOwnership(ctx, userId);
  }

  if (READ_OPS.has(ctx.operation) || WRITE_OPS.has(ctx.operation)) {
    ctx.args.where = { ...(ctx.args.where as Record<string, unknown>), userId };
    return ctx.query(ctx.args);
  }

  return ctx.query(ctx.args);
}

export function withUserContext(userId: string) {
  return db.$extends({
    query: {
      passage: {
        $allOperations: (ctx: PrismaQueryCtx) => enforceUserScope(ctx, userId),
      },
      cardReview: {
        $allOperations: (ctx: PrismaQueryCtx) => enforceUserScope(ctx, userId),
      },
      studySession: {
        $allOperations: (ctx: PrismaQueryCtx) => enforceUserScope(ctx, userId),
      },
    },
  });
}
