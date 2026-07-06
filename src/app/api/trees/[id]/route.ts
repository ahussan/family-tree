import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess } from "@/lib/access";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tree = await prisma.tree.findUnique({
    where: { id },
    include: {
      nodes: {
        include: {
          parentLinks: true, // this node as child
          childLinks: true, // this node as parent
          marriagesAsHusband: true,
          marriagesAsWife: true,
        },
      },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      invites: { where: { status: "PENDING" } },
    },
  });

  if (!tree) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...tree, myRole: role });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, id);
  if (role !== "ADMIN" && role !== "OWNER") {
    return NextResponse.json({ error: "Only the tree owner can rename it." }, { status: 403 });
  }

  const { name, description } = await req.json();
  const tree = await prisma.tree.update({
    where: { id },
    data: { name, description },
  });

  return NextResponse.json(tree);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, id);
  if (role !== "ADMIN" && role !== "OWNER") {
    return NextResponse.json({ error: "Only the tree owner can delete it." }, { status: 403 });
  }

  await prisma.tree.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
