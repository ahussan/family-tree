import { prisma } from "@/lib/prisma";

/**
 * Returns the effective role a user has on a tree: "ADMIN" (system admin, full
 * access to every tree), a TreeRole ("OWNER" | "EDITOR" | "VIEWER"), or null if
 * the user has no access at all.
 */
export async function getTreeAccess(userId: string, systemRole: string, treeId: string) {
  if (systemRole === "ADMIN") return "ADMIN" as const;

  const membership = await prisma.treeMember.findUnique({
    where: { treeId_userId: { treeId, userId } },
  });

  return membership?.role ?? null;
}

export function canEdit(role: string | null) {
  return role === "ADMIN" || role === "OWNER" || role === "EDITOR";
}
