import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  // First registered user becomes admin automatically so there's always at least one.
  const userCount = await prisma.user.count();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      systemRole: userCount === 0 ? "ADMIN" : "USER",
    },
  });

  // Auto-accept any pending invites sent to this email before they had an account.
  const pendingInvites = await prisma.invite.findMany({
    where: { email, status: "PENDING" },
  });
  if (pendingInvites.length > 0) {
    await prisma.$transaction([
      ...pendingInvites.map((invite) =>
        prisma.treeMember.upsert({
          where: { treeId_userId: { treeId: invite.treeId, userId: user.id } },
          create: { treeId: invite.treeId, userId: user.id, role: invite.role },
          update: {},
        })
      ),
      prisma.invite.updateMany({
        where: { id: { in: pendingInvites.map((i) => i.id) } },
        data: { status: "ACCEPTED" },
      }),
    ]);
  }

  return NextResponse.json({ id: user.id, email: user.email });
}
