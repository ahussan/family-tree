import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { tree: { select: { id: true, name: true } }, invitedBy: { select: { name: true } } },
  });
  if (!invite) return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  return NextResponse.json(invite);
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "You must be signed in to accept an invite." }, { status: 401 });

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.status !== "PENDING") {
    return NextResponse.json({ error: "This invite is no longer valid." }, { status: 404 });
  }
  if (invite.email.toLowerCase() !== session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "This invite was sent to a different email address." }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.treeMember.upsert({
      where: { treeId_userId: { treeId: invite.treeId, userId: session.user.id } },
      create: { treeId: invite.treeId, userId: session.user.id, role: invite.role },
      update: { role: invite.role },
    }),
    prisma.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } }),
  ]);

  return NextResponse.json({ ok: true, treeId: invite.treeId });
}
