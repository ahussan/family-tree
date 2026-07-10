import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess, canEdit } from "@/lib/access";

// DELETE — remove a marriage record by its id.
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; nodeId: string; marriageId: string } }
) {
  const { id: treeId, marriageId } = params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (!canEdit(role))
    return NextResponse.json({ error: "You don't have edit access to this tree." }, { status: 403 });

  await prisma.marriage.delete({ where: { id: marriageId } });
  return NextResponse.json({ ok: true });
}
