import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { listUserPassages } from "@/features/passage-crud/server/services/passage";
import { StudyWorkspace } from "./_components/study-workspace";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const initialPassages = await listUserPassages(session.user.id);
  return <StudyWorkspace initialPassages={initialPassages} />;
}