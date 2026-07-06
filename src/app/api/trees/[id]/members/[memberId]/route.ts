import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess } from "@/lib/access";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: treeId, memberId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (role !== "ADMIN" && role !== "OWNER") {
    return NextResponse.json({ error: "Only the tree owner can remove collaborators." }, { status: 403 });
  }

  const member = await prisma.treeMember.findUnique({ where: { id: memberId } });
  if (member?.role === "OWNER") {
    return NextResponse.json({ error: "The tree owner cannot be removed." }, { status: 400 });
  }

  await prisma.treeMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
