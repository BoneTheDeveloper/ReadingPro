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
    queryFn: (): Promise<PassageListItem[]> => listPassagesForUser(session.user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StudyWorkspace />
    </HydrationBoundary>
  );
}
