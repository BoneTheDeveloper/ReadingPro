import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listUserPassages } from "@/features/passage-crud/server/services/passage";
import { StudyWorkspace } from "./_components/study-workspace";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const initialPassages = await listUserPassages(session.user.id);
  return <StudyWorkspace initialPassages={initialPassages} />;
}