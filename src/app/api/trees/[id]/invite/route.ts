import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess } from "@/lib/access";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: treeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (role !== "ADMIN" && role !== "OWNER") {
    return NextResponse.json({ error: "Only the tree owner can invite collaborators." }, { status: 403 });
  }

  const { email, role: inviteRole } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();

  // If the invitee already has an account, add them directly instead of a pending invite.
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const member = await prisma.treeMember.upsert({
      where: { treeId_userId: { treeId, userId: existingUser.id } },
      create: { treeId, userId: existingUser.id, role: inviteRole ?? "EDITOR" },
      update: { role: inviteRole ?? "EDITOR" },
    });
    return NextResponse.json({ status: "added", member });
  }

  const invite = await prisma.invite.create({
    data: {
      treeId,
      email: normalizedEmail,
      role: inviteRole ?? "EDITOR",
      invitedById: session.user.id,
    },
  });

  // NOTE: wire up an email provider (e.g. Resend) here to actually send the invite link:
  //   `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`
  // For now the invite is created and will auto-resolve when that email registers or
  // can be shared manually as a link.

  return NextResponse.json({ status: "pending", invite });
}
