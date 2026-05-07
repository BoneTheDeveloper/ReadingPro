import { Prisma } from '@prisma/client';
import { db } from './client';

const READ_OPS = new Set(['findFirst', 'findMany', 'count', 'aggregate', 'groupBy']);
const FIND_UNIQUE_OPS = new Set(['findUnique', 'findUniqueOrThrow']);
const WRITE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

type OperationContext = { args: any; query: (args: any) => Promise<any>; operation: string };

async function verifyFindUniqueOwnership(ctx: OperationContext, userId: string): Promise<any> {
  const result = await ctx.query(ctx.args);
  if (result && result.userId !== userId) {
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

async function enforceUserScope(ctx: OperationContext, userId: string): Promise<any> {
  if (ctx.operation === 'create') {
    ctx.args.data = { ...ctx.args.data, userId };
    return ctx.query(ctx.args);
  }

  if (FIND_UNIQUE_OPS.has(ctx.operation)) {
    return verifyFindUniqueOwnership(ctx, userId);
  }

  if (READ_OPS.has(ctx.operation) || WRITE_OPS.has(ctx.operation)) {
    // Inject userId into where clause. Works at runtime for all these operations
    // (including update/delete which accept compound where at the SQL level).
    ctx.args.where = { ...ctx.args.where, userId };
    return ctx.query(ctx.args);
  }

  return ctx.query(ctx.args);
}

export function withUserContext(userId: string) {
  const scope = { $allOperations: (ctx: OperationContext) => enforceUserScope(ctx, userId) };

  return db.$extends({
    query: {
      passage: scope,
      cardReview: scope,
      studySession: scope,
    },
  });
}
