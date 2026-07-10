import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess, canEdit } from "@/lib/access";

// Returns every descendant id of `nodeId` (children, grandchildren, ...),
// used to stop someone from picking a parent that would create a cycle.
async function getDescendantIds(nodeId: string): Promise<Set<string>> {
  const descendants = new Set<string>();
  let frontier = [nodeId];

  while (frontier.length > 0) {
    const links = await prisma.parentChild.findMany({
      where: { parentId: { in: frontier } },
      select: { childId: true },
    });
    const next = links.map((l) => l.childId).filter((id) => !descendants.has(id));
    next.forEach((id) => descendants.add(id));
    frontier = next;
  }

  return descendants;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; nodeId: string } }
) {
  const { id: treeId, nodeId } = params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (!canEdit(role)) return NextResponse.json({ error: "You don't have edit access to this tree." }, { status: 403 });

  const { name, sex, birthYear, deathYear, notes, parentIds } = await req.json();

  try {
    const node = await prisma.$transaction(async (tx) => {
      const updated = await tx.personNode.update({
        where: { id: nodeId },
        data: {
          ...(name !== undefined && { name }),
          ...(sex !== undefined && { sex }),
          ...(birthYear !== undefined && { birthYear }),
          ...(deathYear !== undefined && { deathYear }),
          ...(notes !== undefined && { notes }),
        },
      });

      // parentIds is an array of 0-2 person ids (or omitted to leave parents unchanged).
      if (parentIds !== undefined) {
        const cleaned = Array.from(
          new Set((parentIds as (string | null | undefined)[]).filter((id): id is string => !!id))
        ).slice(0, 2);

        if (cleaned.includes(nodeId)) {
          throw new Error("A person can't be their own parent.");
        }

        if (cleaned.length > 0) {
          const descendants = await getDescendantIds(nodeId);
          for (const pid of cleaned) {
            if (descendants.has(pid)) {
              throw new Error("Can't set a descendant as a parent — that would create a loop.");
            }
            const exists = await tx.personNode.findFirst({ where: { id: pid, treeId } });
            if (!exists) throw new Error("Selected parent wasn't found in this tree.");
          }
        }

        await tx.parentChild.deleteMany({ where: { childId: nodeId } });
        for (const pid of cleaned) {
          await tx.parentChild.create({ data: { parentId: pid, childId: nodeId } });
        }
      }

      return updated;
    });

    return NextResponse.json(node);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to update person." }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; nodeId: string } }
) {
  const { id: treeId, nodeId } = params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (!canEdit(role)) return NextResponse.json({ error: "You don't have edit access to this tree." }, { status: 403 });

  await prisma.personNode.delete({ where: { id: nodeId } });
  return NextResponse.json({ ok: true });
}