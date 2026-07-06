import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trees = await prisma.tree.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { nodes: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const withRole = trees.map((t) => ({
    ...t,
    myRole: t.members.find((m) => m.userId === session.user.id)?.role,
  }));

  return NextResponse.json(withRole);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Tree name is required." }, { status: 400 });

  const tree = await prisma.tree.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json(tree, { status: 201 });
}
