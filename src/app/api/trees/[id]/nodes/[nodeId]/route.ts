import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess, canEdit } from "@/lib/access";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const { id: treeId, nodeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (!canEdit(role)) return NextResponse.json({ error: "You don't have edit access to this tree." }, { status: 403 });

  const { name, sex, birthYear, deathYear, notes } = await req.json();

  const node = await prisma.personNode.update({
    where: { id: nodeId },
    data: {
      ...(name !== undefined && { name }),
      ...(sex !== undefined && { sex }),
      ...(birthYear !== undefined && { birthYear }),
      ...(deathYear !== undefined && { deathYear }),
      ...(notes !== undefined && { notes }),
    },
  });

  return NextResponse.json(node);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const { id: treeId, nodeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (!canEdit(role)) return NextResponse.json({ error: "You don't have edit access to this tree." }, { status: 403 });

  await prisma.personNode.delete({ where: { id: nodeId } });
  return NextResponse.json({ ok: true });
}
