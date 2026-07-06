import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const trees = await prisma.tree.findMany({
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { nodes: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(trees);
}
