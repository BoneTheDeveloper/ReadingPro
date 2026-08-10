import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { requirePageSession } from "@/lib/auth/session";
import { listPassagesForUser } from "@/features/passage/server/service/passage-crud";
import { passageQueries } from "@/features/passage/api/queries";
import { getQueryClient } from "@/lib/query-client";
import { StudyWorkspace } from "./_component/study-workspace";

import type { PassageListItem } from "@/features/passage/schema";

export default async function StudyPage() {
  const session = await requirePageSession();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    ...passageQueries.list(),
    // Server path: call the service directly instead of our own route handler.
    // The explicit return annotation is what makes a service shape drift a
    // compile error here — do not let TS re-infer it from the override.
    queryFn: (): Promise<PassageListItem[]> => listPassagesForUser(session.user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StudyWorkspace />
    </HydrationBoundary>
  );
}
