import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { requirePageSession } from "@/lib/auth/session";
import { listPassagesForUser } from "@/features/passage/server/service/passage-crud";
import { passageKeys } from "@/features/passage/queries";
import { getQueryClient } from "@/lib/query-client";
import { StudyWorkspace } from "./_component/study-workspace";

export default async function StudyPage() {
  const session = await requirePageSession();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: passageKeys.list(),
    queryFn: () => listPassagesForUser(session.user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StudyWorkspace />
    </HydrationBoundary>
  );
}
