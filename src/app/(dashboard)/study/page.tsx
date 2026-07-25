import { getUserId } from "@/lib/auth/auth-server";
import { listUserPassages } from "@/features/passage-crud/server/services/passage";
import { StudyWorkspace } from "./_components/study-workspace";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const userId = await getUserId();
  const initialPassages = await listUserPassages(userId);
  return <StudyWorkspace initialPassages={initialPassages} />;
}
