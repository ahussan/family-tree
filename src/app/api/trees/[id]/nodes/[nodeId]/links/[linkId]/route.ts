import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess, canEdit } from "@/lib/access";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; nodeId: string; linkId: string } }
) {
  const { id: treeId, linkId } = params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (!canEdit(role)) return NextResponse.json({ error: "You don't have edit access to this tree." }, { status: 403 });

  await prisma.treeLink.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true });
}