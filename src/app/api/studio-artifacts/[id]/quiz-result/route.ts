import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { 
  recordQuizResult, 
  resetQuizResult 
} from "@/server/modules/study/passage/studio-artifacts-service";
import { isAuthenticationRequiredError } from "@/server/http/route-errors";
import { createModuleLogger } from "@/server/core/logger";
import { z } from "zod";

const log = createModuleLogger("api:studio-artifacts:quiz-result");

const recordQuizResultSchema = z.object({
  correctCount: z.number().int().nonnegative(),
  totalQuestions: z.number().int().positive(),
}).refine(data => data.correctCount <= data.totalQuestions, {
  message: "correctCount cannot exceed totalQuestions",
  path: ["correctCount"],
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    
    const parsed = recordQuizResultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }

    await recordQuizResult(id, user.id, {
      correctCount: parsed.data.correctCount,
      totalQuestions: parsed.data.totalQuestions,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    Sentry.captureException(error);
    log.error({ error, artifactId: id }, "Failed to record quiz result");
    return NextResponse.json(
      { error: "Failed to record quiz result" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getAuthenticatedUser();
    
    await resetQuizResult(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    Sentry.captureException(error);
    log.error({ error, artifactId: id }, "Failed to reset quiz result");
    return NextResponse.json(
      { error: "Failed to reset quiz result" },
      { status: 500 }
    );
  }
}
