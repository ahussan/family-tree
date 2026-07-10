import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess, canEdit } from "@/lib/access";

// POST — link an existing person in the same tree as a spouse of nodeId.
// Body: { spouseId: string }
export async function POST(
  req: Request,
  { params }: { params: { id: string; nodeId: string } }
) {
  const { id: treeId, nodeId } = params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (!canEdit(role))
    return NextResponse.json({ error: "You don't have edit access to this tree." }, { status: 403 });

  const { spouseId } = await req.json();
  if (!spouseId) return NextResponse.json({ error: "spouseId is required." }, { status: 400 });
  if (spouseId === nodeId)
    return NextResponse.json({ error: "A person can't be their own spouse." }, { status: 400 });

  const [person, spouse] = await Promise.all([
    prisma.personNode.findFirst({ where: { id: nodeId, treeId } }),
    prisma.personNode.findFirst({ where: { id: spouseId, treeId } }),
  ]);
  if (!person) return NextResponse.json({ error: "Person not found in this tree." }, { status: 404 });
  if (!spouse) return NextResponse.json({ error: "Spouse not found in this tree." }, { status: 404 });
  if (person.sex === spouse.sex)
    return NextResponse.json({ error: "A spouse must be the opposite sex." }, { status: 400 });

  const husbandId = person.sex === "MALE" ? person.id : spouse.id;
  const wifeId = person.sex === "FEMALE" ? person.id : spouse.id;

  // Silently succeed if they're already married.
  const existing = await prisma.marriage.findUnique({ where: { husbandId_wifeId: { husbandId, wifeId } } });
  if (existing) return NextResponse.json(existing, { status: 200 });

  const marriage = await prisma.marriage.create({ data: { husbandId, wifeId } });
  return NextResponse.json(marriage, { status: 201 });
}
