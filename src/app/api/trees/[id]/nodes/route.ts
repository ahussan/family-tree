import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess, canEdit } from "@/lib/access";

type Relation = "ROOT" | "PARENT" | "CHILD" | "SIBLING" | "SPOUSE";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: treeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (!canEdit(role)) return NextResponse.json({ error: "You don't have edit access to this tree." }, { status: 403 });

  const body = await req.json();
  const { name, sex, birthYear, deathYear, notes, relation, relativeNodeId, coParentId } = body as {
    name: string;
    sex: "MALE" | "FEMALE";
    birthYear?: number | null;
    deathYear?: number | null;
    notes?: string | null;
    relation: Relation;
    relativeNodeId?: string;
    coParentId?: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (sex !== "MALE" && sex !== "FEMALE") return NextResponse.json({ error: "Sex must be MALE or FEMALE." }, { status: 400 });

  const baseData = {
    treeId,
    name: name.trim(),
    sex,
    birthYear: birthYear ?? null,
    deathYear: deathYear ?? null,
    notes: notes?.trim() || null,
    createdById: session.user.id,
  };

  let relative = null;
  if (relation !== "ROOT") {
    if (!relativeNodeId) return NextResponse.json({ error: "relativeNodeId is required for this relation." }, { status: 400 });
    relative = await prisma.personNode.findFirst({ where: { id: relativeNodeId, treeId } });
    if (!relative) return NextResponse.json({ error: "Reference person not found in this tree." }, { status: 404 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      switch (relation) {
        case "ROOT": {
          return tx.personNode.create({ data: baseData });
        }

        case "PARENT": {
          const existingParents = await tx.parentChild.count({ where: { childId: relativeNodeId } });
          if (existingParents >= 2) {
            throw new Error("This person already has two parents.");
          }
          const parent = await tx.personNode.create({ data: baseData });
          await tx.parentChild.create({ data: { parentId: parent.id, childId: relativeNodeId! } });
          return parent;
        }

        case "CHILD": {
          const child = await tx.personNode.create({ data: baseData });
          await tx.parentChild.create({ data: { parentId: relativeNodeId!, childId: child.id } });
          if (coParentId) {
            const existingParents = await tx.parentChild.count({ where: { childId: child.id } });
            if (existingParents < 2) {
              await tx.parentChild.create({ data: { parentId: coParentId, childId: child.id } });
            }
          }
          return child;
        }

        case "SIBLING": {
          const parentLinks = await tx.parentChild.findMany({ where: { childId: relativeNodeId } });
          const sibling = await tx.personNode.create({ data: baseData });
          for (const link of parentLinks) {
            await tx.parentChild.create({ data: { parentId: link.parentId, childId: sibling.id } });
          }
          return sibling;
        }

        case "SPOUSE": {
          if (!relative) throw new Error("Reference person not found.");
          if (relative.sex === sex) {
            throw new Error("A spouse must be the opposite sex of the reference person.");
          }
          const spouse = await tx.personNode.create({ data: baseData });
          if (relative.sex === "MALE") {
            await tx.marriage.create({ data: { husbandId: relative.id, wifeId: spouse.id } });
          } else {
            await tx.marriage.create({ data: { husbandId: spouse.id, wifeId: relative.id } });
          }
          return spouse;
        }

        default:
          throw new Error("Unknown relation type.");
      }
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to create person." }, { status: 400 });
  }
}
