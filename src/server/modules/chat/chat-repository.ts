import prisma from "@/server/lib/prisma";

export type ChatRole = "user" | "assistant";

export async function listChatHistory(userId: string, passageId: string) {
  return prisma.chatMessage.findMany({
    where: { userId, passageId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 40,
    select: { id: true, role: true, content: true },
  });
}

export async function createChatMessage(
  userId: string,
  passageId: string,
  role: ChatRole,
  content: string,
) {
  await prisma.chatMessage.create({
    data: { userId, passageId, role, content },
  });
}

export async function deleteChatHistory(userId: string, passageId: string) {
  await prisma.chatMessage.deleteMany({
    where: { userId, passageId },
  });
}
